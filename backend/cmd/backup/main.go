package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"google.golang.org/api/iterator"
)

// Top-level collections to back up
var collections = []string{
	"disciplines",
	"categories",
	"techniques",
	"assets",
	"tags",
	"curricula",
}

// Collections that have known subcollections
var subcollections = map[string][]string{
	"curricula": {"elements"},
}

func main() {
	outDir := flag.String("out", "", "Output directory (required)")
	flag.Parse()

	if *outDir == "" {
		fmt.Fprintln(os.Stderr, "usage: backup --out /path/to/backup/dir")
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
	fs := clients.Firestore

	// Create timestamped subdirectory
	ts := time.Now().Format("2006-01-02_150405")
	backupDir := filepath.Join(*outDir, ts)
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		slog.Error("failed to create backup directory", "path", backupDir, "error", err)
		os.Exit(1)
	}

	slog.Info("starting backup", "dir", backupDir, "project", cfg.GCPProject)

	totalDocs := 0

	for _, collName := range collections {
		docs, err := backupCollection(ctx, fs, collName)
		if err != nil {
			slog.Error("failed to backup collection", "collection", collName, "error", err)
			continue
		}

		// Write collection JSON
		collFile := filepath.Join(backupDir, collName+".json")
		if err := writeJSON(collFile, docs); err != nil {
			slog.Error("failed to write collection file", "file", collFile, "error", err)
			continue
		}

		slog.Info("backed up collection", "collection", collName, "documents", len(docs))
		totalDocs += len(docs)

		// Handle subcollections
		if subColls, ok := subcollections[collName]; ok {
			for _, subCollName := range subColls {
				subDocs, err := backupSubcollections(ctx, fs, collName, subCollName, docs)
				if err != nil {
					slog.Error("failed to backup subcollection", "parent", collName, "sub", subCollName, "error", err)
					continue
				}

				if len(subDocs) > 0 {
					subFile := filepath.Join(backupDir, collName+"_"+subCollName+".json")
					if err := writeJSON(subFile, subDocs); err != nil {
						slog.Error("failed to write subcollection file", "file", subFile, "error", err)
						continue
					}
					slog.Info("backed up subcollection", "parent", collName, "sub", subCollName, "documents", len(subDocs))
					totalDocs += len(subDocs)
				}
			}
		}
	}

	// Write metadata
	meta := map[string]interface{}{
		"project":   cfg.GCPProject,
		"timestamp": time.Now().Format(time.RFC3339),
		"totalDocs": totalDocs,
	}
	metaFile := filepath.Join(backupDir, "_metadata.json")
	if err := writeJSON(metaFile, meta); err != nil {
		slog.Error("failed to write metadata", "error", err)
	}

	// Create/update "latest" symlink
	latestLink := filepath.Join(*outDir, "latest")
	os.Remove(latestLink)
	os.Symlink(ts, latestLink)

	slog.Info("backup complete", "totalDocuments", totalDocs, "dir", backupDir)
}

func backupCollection(ctx context.Context, fs *firestore.Client, collName string) ([]map[string]interface{}, error) {
	iter := fs.Collection(collName).Documents(ctx)
	defer iter.Stop()

	var docs []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("iterating %s: %w", collName, err)
		}

		data := doc.Data()
		data["_id"] = doc.Ref.ID
		data["_path"] = doc.Ref.Path

		// Convert time.Time to RFC3339 strings for clean JSON
		for k, v := range data {
			if t, ok := v.(time.Time); ok {
				data[k] = t.Format(time.RFC3339)
			}
		}

		docs = append(docs, data)
	}

	if docs == nil {
		docs = []map[string]interface{}{}
	}
	return docs, nil
}

func backupSubcollections(ctx context.Context, fs *firestore.Client, parentColl, subColl string, parentDocs []map[string]interface{}) ([]map[string]interface{}, error) {
	var allSubDocs []map[string]interface{}

	for _, parentDoc := range parentDocs {
		parentID, ok := parentDoc["_id"].(string)
		if !ok {
			continue
		}

		iter := fs.Collection(parentColl).Doc(parentID).Collection(subColl).Documents(ctx)
		for {
			doc, err := iter.Next()
			if err == iterator.Done {
				break
			}
			if err != nil {
				iter.Stop()
				return nil, fmt.Errorf("iterating %s/%s/%s: %w", parentColl, parentID, subColl, err)
			}

			data := doc.Data()
			data["_id"] = doc.Ref.ID
			data["_path"] = doc.Ref.Path
			data["_parentId"] = parentID

			for k, v := range data {
				if t, ok := v.(time.Time); ok {
					data[k] = t.Format(time.RFC3339)
				}
			}

			allSubDocs = append(allSubDocs, data)
		}
		iter.Stop()
	}

	if allSubDocs == nil {
		allSubDocs = []map[string]interface{}{}
	}
	return allSubDocs, nil
}

func writeJSON(path string, data interface{}) error {
	f, err := os.Create(path)
	if err != nil {
		return err
	}
	defer f.Close()

	enc := json.NewEncoder(f)
	enc.SetIndent("", "  ")
	return enc.Encode(data)
}
