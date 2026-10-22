// Command backfill-entities decodes HTML entities that validate.StripAllHTML
// stored in plain-text fields before it unescaped its output (opponent&#39;s).
//
// Run it once, right after the fixed API is deployed. It is not idempotent:
// a second run would decode text a user typed literally, such as "&amp;".
// Take a backup first (go run ./cmd/backup --out <dir>).
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"google.golang.org/api/iterator"
)

// entityDecoder is the exact inverse of the escaping bluemonday applied
// (html.EscapeString). Unlike html.UnescapeString it leaves other "&..." text alone.
var entityDecoder = strings.NewReplacer("&#39;", "'", "&#34;", `"`, "&lt;", "<", "&gt;", ">", "&amp;", "&")

// plainTextFields lists, per collection, the fields the API sanitized with
// StripAllHTML. Dotted paths address nested maps.
var plainTextFields = map[string][]string{
	"assets":     {"title", "description"},
	"categories": {"name", "description"},
	"techniques": {"name", "description"},
	"tags":       {"name", "description"},
	"curricula":  {"title", "description", "duration", "searchText"},
	// Subcollection of curricula. "details" is handled separately: text and
	// list elements store Markdown, which is rendered and must stay as is.
	"elements": {"title", "duration", "items", "snapshot.name", "snapshot.description"},
}

type stats struct {
	scanned int
	updated int
	errors  int
}

func main() {
	dryRun := flag.Bool("dry-run", false, "Preview changes without writing to Firestore")
	flag.Parse()

	cfg := config.Load()
	ctx := context.Background()
	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()
	fs := clients.Firestore

	slog.Info("backfill starting", "project", cfg.GCPProject, "dryRun", *dryRun)

	st := &stats{}
	for _, name := range []string{"assets", "categories", "techniques", "tags", "curricula"} {
		if err := backfillQuery(ctx, fs.Collection(name).Query, name, *dryRun, st); err != nil {
			slog.Error("backfill failed", "collection", name, "error", err)
			os.Exit(1)
		}
	}
	if err := backfillQuery(ctx, fs.CollectionGroup("elements").Query, "elements", *dryRun, st); err != nil {
		slog.Error("backfill failed", "collection", "elements", "error", err)
		os.Exit(1)
	}
	if err := backfillConceptTrees(ctx, fs, *dryRun, st); err != nil {
		slog.Error("backfill failed", "collection", "conceptTrees", "error", err)
		os.Exit(1)
	}

	slog.Info("backfill complete", "dryRun", *dryRun, "scanned", st.scanned, "updated", st.updated, "errors", st.errors)
	if st.errors > 0 {
		os.Exit(1)
	}
}

func backfillQuery(ctx context.Context, q firestore.Query, collection string, dryRun bool, st *stats) error {
	iter := q.Documents(ctx)
	defer iter.Stop()
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			return nil
		}
		if err != nil {
			return fmt.Errorf("iterating %s: %w", collection, err)
		}
		st.scanned++

		data := doc.Data()
		paths := plainTextFields[collection]
		if collection == "elements" && data["type"] != "text" && data["type"] != "list" {
			paths = append(paths, "details")
		}
		updates := decodeFields(data, paths)
		if len(updates) == 0 {
			continue
		}
		logChanges(collection, doc.Ref.Path, data, updates, dryRun)
		if dryRun {
			st.updated++
			continue
		}
		// The precondition fails if someone edited the document since we read it.
		if _, err := doc.Ref.Update(ctx, updates, firestore.LastUpdateTime(doc.UpdateTime)); err != nil {
			slog.Error("update failed", "doc", doc.Ref.Path, "error", err)
			st.errors++
			continue
		}
		st.updated++
	}
}

// backfillConceptTrees rewrites node names and descriptions. Each discipline's
// forest is one document, so the nodes array is replaced in a transaction and
// the revision bumped, which makes editors with an open tree reload.
func backfillConceptTrees(ctx context.Context, fs *firestore.Client, dryRun bool, st *stats) error {
	refs, err := fs.Collection("conceptTrees").DocumentRefs(ctx).GetAll()
	if err != nil {
		return fmt.Errorf("listing conceptTrees: %w", err)
	}
	for _, ref := range refs {
		st.scanned++
		changed := false
		err := fs.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
			doc, err := tx.Get(ref)
			if err != nil {
				return err
			}
			nodes, _ := doc.Data()["nodes"].([]interface{})
			changed = false
			for _, n := range nodes {
				node, ok := n.(map[string]interface{})
				if !ok {
					continue
				}
				updates := decodeFields(node, []string{"name", "description"})
				for _, u := range updates {
					slog.Info("decode", "collection", "conceptTrees", "doc", ref.Path, "node", node["id"], "field", u.Path, "before", node[u.Path], "after", u.Value, "dryRun", dryRun)
					node[u.Path] = u.Value
					changed = true
				}
			}
			if !changed || dryRun {
				return nil
			}
			revision, _ := doc.Data()["revision"].(int64)
			return tx.Update(ref, []firestore.Update{
				{Path: "nodes", Value: nodes},
				{Path: "revision", Value: revision + 1},
				{Path: "updatedAt", Value: firestore.ServerTimestamp},
			})
		})
		if err != nil {
			slog.Error("update failed", "doc", ref.Path, "error", err)
			st.errors++
			continue
		}
		if changed {
			st.updated++
		}
	}
	return nil
}

// decodeFields returns an update for every listed field whose string value
// (or string array value) changes when decoded. Missing fields are skipped.
func decodeFields(data map[string]interface{}, paths []string) []firestore.Update {
	var updates []firestore.Update
	for _, path := range paths {
		v, ok := lookup(data, path)
		if !ok {
			continue
		}
		switch val := v.(type) {
		case string:
			if decoded := entityDecoder.Replace(val); decoded != val {
				updates = append(updates, firestore.Update{Path: path, Value: decoded})
			}
		case []interface{}:
			out := make([]interface{}, len(val))
			changed := false
			for i, item := range val {
				out[i] = item
				if s, ok := item.(string); ok {
					if decoded := entityDecoder.Replace(s); decoded != s {
						out[i] = decoded
						changed = true
					}
				}
			}
			if changed {
				updates = append(updates, firestore.Update{Path: path, Value: out})
			}
		}
	}
	return updates
}

func lookup(data map[string]interface{}, path string) (interface{}, bool) {
	parts := strings.Split(path, ".")
	cur := data
	for i, part := range parts {
		v, ok := cur[part]
		if !ok {
			return nil, false
		}
		if i == len(parts)-1 {
			return v, true
		}
		if cur, ok = v.(map[string]interface{}); !ok {
			return nil, false
		}
	}
	return nil, false
}

func logChanges(collection, docPath string, data map[string]interface{}, updates []firestore.Update, dryRun bool) {
	for _, u := range updates {
		before, _ := lookup(data, u.Path)
		slog.Info("decode", "collection", collection, "doc", docPath, "field", u.Path, "before", before, "after", u.Value, "dryRun", dryRun)
	}
}
