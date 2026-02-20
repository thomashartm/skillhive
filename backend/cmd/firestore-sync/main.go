package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"firebase.google.com/go/v4/auth"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"google.golang.org/api/iterator"
)

// Top-level collections to export/import.
var topCollections = []string{
	"disciplines",
	"categories",
	"techniques",
	"tags",
	"assets",
	"curricula",
}

// Subcollections keyed by parent collection name.
var subcollections = map[string][]string{
	"curricula": {"elements"},
}

const outputPath = "seed/production-data.json"

// Document represents a Firestore document with optional subcollections.
type Document struct {
	ID   string                 `json:"id"`
	Data map[string]interface{} `json:"data"`
	Subs map[string][]Document  `json:"subs,omitempty"`
}

// Export is the top-level JSON structure.
type Export struct {
	ExportedAt  string                `json:"exportedAt"`
	Collections map[string][]Document `json:"collections"`
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run ./cmd/firestore-sync <export|import>")
		fmt.Println()
		fmt.Println("  export  Read from Firestore and write to seed/production-data.json")
		fmt.Println("  import  Read from seed/production-data.json and write to Firestore (emulator only)")
		os.Exit(1)
	}

	cfg := config.Load()
	ctx := context.Background()

	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()

	switch os.Args[1] {
	case "export":
		doExport(ctx, clients.Firestore)
	case "import":
		if os.Getenv("FIRESTORE_EMULATOR_HOST") == "" {
			slog.Error("FIRESTORE_EMULATOR_HOST must be set for import (safety: prevents writing to production)")
			os.Exit(1)
		}
		doImport(ctx, clients)
	default:
		fmt.Printf("Unknown command: %s\n", os.Args[1])
		os.Exit(1)
	}
}

// --- Export ---

func doExport(ctx context.Context, fs *firestore.Client) {
	export := Export{
		ExportedAt:  time.Now().UTC().Format(time.RFC3339),
		Collections: make(map[string][]Document),
	}

	totalDocs := 0
	for _, name := range topCollections {
		docs := readCollection(ctx, fs.Collection(name))

		if subs, ok := subcollections[name]; ok {
			for i, doc := range docs {
				docs[i].Subs = make(map[string][]Document)
				for _, sub := range subs {
					subDocs := readCollection(ctx, fs.Collection(name).Doc(doc.ID).Collection(sub))
					if len(subDocs) > 0 {
						docs[i].Subs[sub] = subDocs
						totalDocs += len(subDocs)
					}
				}
			}
		}

		export.Collections[name] = docs
		totalDocs += len(docs)
		slog.Info("exported", "collection", name, "count", len(docs))
	}

	bytes, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		slog.Error("failed to marshal JSON", "error", err)
		os.Exit(1)
	}

	if err := os.MkdirAll("seed", 0755); err != nil {
		slog.Error("failed to create seed directory", "error", err)
		os.Exit(1)
	}

	if err := os.WriteFile(outputPath, bytes, 0644); err != nil {
		slog.Error("failed to write file", "error", err)
		os.Exit(1)
	}

	slog.Info("export complete", "path", outputPath, "totalDocuments", totalDocs)
}

func readCollection(ctx context.Context, ref *firestore.CollectionRef) []Document {
	var docs []Document
	iter := ref.Documents(ctx)
	defer iter.Stop()

	for {
		snap, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to read document", "collection", ref.Path, "error", err)
			break
		}
		docs = append(docs, Document{
			ID:   snap.Ref.ID,
			Data: snap.Data(),
		})
	}
	return docs
}

// --- Import ---

func doImport(ctx context.Context, clients *store.FirebaseClients) {
	fs := clients.Firestore

	bytes, err := os.ReadFile(outputPath)
	if err != nil {
		slog.Error("failed to read file", "path", outputPath, "error", err)
		os.Exit(1)
	}

	var export Export
	if err := json.Unmarshal(bytes, &export); err != nil {
		slog.Error("failed to parse JSON", "error", err)
		os.Exit(1)
	}

	slog.Info("importing data", "exportedAt", export.ExportedAt)

	// Ensure admin user exists in Auth emulator and get their UID for ownerUid remapping
	localUID := ensureAdminUser(ctx, clients.Auth)

	totalDocs := 0
	for _, name := range topCollections {
		docs := export.Collections[name]
		if len(docs) == 0 {
			continue
		}

		// Clear existing documents (and their subcollections) first
		subs := subcollections[name]
		clearCollection(ctx, fs, name, subs)

		slog.Info("importing", "collection", name, "count", len(docs))
		for _, doc := range docs {
			data := restoreTypes(doc.Data)
			remapOwnerUID(data, localUID)
			if _, err := fs.Collection(name).Doc(doc.ID).Set(ctx, data); err != nil {
				slog.Error("failed to write document", "collection", name, "id", doc.ID, "error", err)
				continue
			}
			totalDocs++

			for subName, subDocs := range doc.Subs {
				for _, subDoc := range subDocs {
					subData := restoreTypes(subDoc.Data)
					remapOwnerUID(subData, localUID)
					if _, err := fs.Collection(name).Doc(doc.ID).Collection(subName).Doc(subDoc.ID).Set(ctx, subData); err != nil {
						slog.Error("failed to write subcollection doc", "parent", doc.ID, "sub", subName, "id", subDoc.ID, "error", err)
						continue
					}
					totalDocs++
				}
			}
		}
	}

	slog.Info("import complete", "totalDocuments", totalDocs, "ownerUid", localUID)
}

// ensureAdminUser creates the admin user in the Auth emulator if it doesn't exist,
// and returns their UID for ownerUid remapping.
func ensureAdminUser(ctx context.Context, authClient *auth.Client) string {
	email := os.Getenv("ADMIN_EMAIL")
	if email == "" {
		email = "admin@skillhive.local"
	}
	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		password = "admin123"
	}

	u, err := authClient.GetUserByEmail(ctx, email)
	if err != nil {
		// User doesn't exist — create it
		slog.Info("admin user not found in Auth emulator, creating", "email", email)
		params := (&auth.UserToCreate{}).Email(email).Password(password).DisplayName("Admin")
		u, err = authClient.CreateUser(ctx, params)
		if err != nil {
			slog.Error("failed to create admin user", "error", err)
			os.Exit(1)
		}
		slog.Info("created admin user", "email", email, "uid", u.UID)
	} else {
		slog.Info("admin user exists", "email", email, "uid", u.UID)
	}

	// Ensure admin roles are set
	claims := u.CustomClaims
	if claims == nil {
		claims = map[string]interface{}{}
	}
	roles, _ := claims["roles"].(map[string]interface{})
	if roles == nil {
		roles = map[string]interface{}{}
	}
	roles["bjj"] = "admin"
	roles["jkd"] = "admin"
	claims["roles"] = roles

	if err := authClient.SetCustomUserClaims(ctx, u.UID, claims); err != nil {
		slog.Error("failed to set admin claims", "error", err)
		os.Exit(1)
	}

	return u.UID
}

// remapOwnerUID replaces any non-"system" ownerUid with the local user's UID.
func remapOwnerUID(data map[string]interface{}, localUID string) {
	if uid, ok := data["ownerUid"]; ok {
		if uidStr, ok := uid.(string); ok && uidStr != "system" {
			data["ownerUid"] = localUID
		}
	}
}

// clearCollection deletes all documents in a collection and their subcollections.
func clearCollection(ctx context.Context, fs *firestore.Client, collName string, subs []string) {
	iter := fs.Collection(collName).Documents(ctx)
	defer iter.Stop()

	deleted := 0
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to read for clearing", "collection", collName, "error", err)
			break
		}

		// Delete subcollection documents first
		for _, sub := range subs {
			subIter := doc.Ref.Collection(sub).Documents(ctx)
			for {
				subDoc, err := subIter.Next()
				if err == iterator.Done {
					break
				}
				if err != nil {
					break
				}
				if _, err := subDoc.Ref.Delete(ctx); err != nil {
					slog.Error("failed to delete subcollection doc", "id", subDoc.Ref.ID, "error", err)
				}
			}
			subIter.Stop()
		}

		if _, err := doc.Ref.Delete(ctx); err != nil {
			slog.Error("failed to delete document", "id", doc.Ref.ID, "error", err)
		}
		deleted++
	}

	if deleted > 0 {
		slog.Info("cleared collection", "collection", collName, "deleted", deleted)
	}
}

// restoreTypes converts JSON-decoded values back to Firestore-compatible types.
// JSON decoding loses type information: timestamps become strings, integers become float64.
func restoreTypes(data map[string]interface{}) map[string]interface{} {
	for k, v := range data {
		switch val := v.(type) {
		case string:
			// Detect RFC3339 timestamps (createdAt, updatedAt, etc.)
			if t, err := time.Parse(time.RFC3339Nano, val); err == nil {
				data[k] = t
			} else if t, err := time.Parse(time.RFC3339, val); err == nil {
				data[k] = t
			}
		case float64:
			// Restore whole numbers as int64 (ord, counts, etc.)
			if val == float64(int64(val)) {
				data[k] = int64(val)
			}
		case map[string]interface{}:
			data[k] = restoreTypes(val)
		case []interface{}:
			data[k] = restoreSliceTypes(val)
		}
	}
	return data
}

// restoreSliceTypes handles type restoration inside arrays.
func restoreSliceTypes(arr []interface{}) []interface{} {
	for i, v := range arr {
		switch val := v.(type) {
		case map[string]interface{}:
			arr[i] = restoreTypes(val)
		case float64:
			if val == float64(int64(val)) {
				arr[i] = int64(val)
			}
		case string:
			if t, err := time.Parse(time.RFC3339Nano, val); err == nil {
				arr[i] = t
			} else if t, err := time.Parse(time.RFC3339, val); err == nil {
				arr[i] = t
			}
		}
	}
	return arr
}
