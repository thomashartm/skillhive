package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"sort"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"google.golang.org/api/iterator"
)

type techDoc struct {
	DocID       string
	Name        string
	Slug        string
	Description string
	OwnerUID    string
	CategoryIDs []string
	TagIDs      []string
	Normalized  string // slug with hyphens removed
}

func main() {
	discipline := flag.String("discipline", "bjj", "Discipline ID")
	dryRun := flag.Bool("dry-run", false, "Show duplicates without merging")
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

	// Load all techniques for this discipline
	techniques := loadAllTechniques(ctx, fs, *discipline)
	slog.Info("loaded techniques", "count", len(techniques))

	// Group by normalized slug (hyphens removed)
	groups := groupByNormalized(techniques)

	// Find duplicates
	var dupGroups [][]techDoc
	for _, group := range groups {
		if len(group) > 1 {
			dupGroups = append(dupGroups, group)
		}
	}

	if len(dupGroups) == 0 {
		slog.Info("no duplicate techniques found")
		return
	}

	slog.Info("found duplicate groups", "count", len(dupGroups))

	for _, group := range dupGroups {
		canonical, dupes := pickCanonical(group)

		fmt.Printf("\n--- Duplicate group (normalized: %s) ---\n", canonical.Normalized)
		fmt.Printf("  KEEP: [%s] %q (slug=%s, owner=%s, desc=%s)\n",
			canonical.DocID, canonical.Name, canonical.Slug, canonical.OwnerUID, truncate(canonical.Description, 60))
		for _, d := range dupes {
			fmt.Printf("  DROP: [%s] %q (slug=%s, owner=%s, desc=%s)\n",
				d.DocID, d.Name, d.Slug, d.OwnerUID, truncate(d.Description, 60))
		}

		if *dryRun {
			continue
		}

		// Merge: for each duplicate, update asset references and delete
		for _, dupe := range dupes {
			// Merge categoryIDs and tagIDs from dupe into canonical
			mergedCatIDs := mergeStringSlice(canonical.CategoryIDs, dupe.CategoryIDs)
			mergedTagIDs := mergeStringSlice(canonical.TagIDs, dupe.TagIDs)

			// Update canonical with merged IDs if they changed
			var updates []firestore.Update
			if len(mergedCatIDs) > len(canonical.CategoryIDs) {
				updates = append(updates, firestore.Update{Path: "categoryIds", Value: mergedCatIDs})
				canonical.CategoryIDs = mergedCatIDs
			}
			if len(mergedTagIDs) > len(canonical.TagIDs) {
				updates = append(updates, firestore.Update{Path: "tagIds", Value: mergedTagIDs})
				canonical.TagIDs = mergedTagIDs
			}
			// Merge description if canonical has none but dupe does
			if canonical.Description == "" && dupe.Description != "" {
				updates = append(updates, firestore.Update{Path: "description", Value: dupe.Description})
				canonical.Description = dupe.Description
			}
			if len(updates) > 0 {
				updates = append(updates, firestore.Update{Path: "updatedAt", Value: time.Now()})
				if _, err := fs.Collection("techniques").Doc(canonical.DocID).Update(ctx, updates); err != nil {
					slog.Error("failed to update canonical technique", "slug", canonical.Slug, "error", err)
				} else {
					slog.Info("merged metadata into canonical", "slug", canonical.Slug)
				}
			}

			// Update all assets referencing the dupe to reference the canonical
			refsUpdated := replaceAssetRefs(ctx, fs, *discipline, dupe.DocID, canonical.DocID)
			slog.Info("updated asset references", "from", dupe.DocID, "to", canonical.DocID, "assets", refsUpdated)

			// Delete the duplicate
			if _, err := fs.Collection("techniques").Doc(dupe.DocID).Delete(ctx); err != nil {
				slog.Error("failed to delete duplicate technique", "slug", dupe.Slug, "error", err)
			} else {
				slog.Info("deleted duplicate technique", "slug", dupe.Slug, "name", dupe.Name)
			}
		}
	}

	if *dryRun {
		fmt.Printf("\n--- DRY RUN: no changes made ---\n")
	} else {
		slog.Info("merge complete")
	}
}

func loadAllTechniques(ctx context.Context, fs *firestore.Client, disciplineID string) []techDoc {
	iter := fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID).
		Documents(ctx)

	var result []techDoc
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate techniques", "error", err)
			break
		}

		data := doc.Data()
		slug, _ := data["slug"].(string)
		name, _ := data["name"].(string)
		desc, _ := data["description"].(string)
		owner, _ := data["ownerUid"].(string)

		var catIDs, tagIDs []string
		if raw, ok := data["categoryIds"].([]interface{}); ok {
			for _, v := range raw {
				if s, ok := v.(string); ok {
					catIDs = append(catIDs, s)
				}
			}
		}
		if raw, ok := data["tagIds"].([]interface{}); ok {
			for _, v := range raw {
				if s, ok := v.(string); ok {
					tagIDs = append(tagIDs, s)
				}
			}
		}

		result = append(result, techDoc{
			DocID:       doc.Ref.ID,
			Name:        name,
			Slug:        slug,
			Description: desc,
			OwnerUID:    owner,
			CategoryIDs: catIDs,
			TagIDs:      tagIDs,
			Normalized:  strings.ReplaceAll(slug, "-", ""),
		})
	}
	return result
}

func groupByNormalized(techniques []techDoc) map[string][]techDoc {
	groups := make(map[string][]techDoc)
	for _, t := range techniques {
		groups[t.Normalized] = append(groups[t.Normalized], t)
	}
	return groups
}

// pickCanonical selects the "best" technique to keep from a duplicate group.
// Priority: system-owned > shorter slug > alphabetically first slug.
func pickCanonical(group []techDoc) (techDoc, []techDoc) {
	sort.Slice(group, func(i, j int) bool {
		// Prefer system-owned
		if group[i].OwnerUID == "system" && group[j].OwnerUID != "system" {
			return true
		}
		if group[i].OwnerUID != "system" && group[j].OwnerUID == "system" {
			return false
		}
		// Prefer non-empty description
		if group[i].Description != "" && group[j].Description == "" {
			return true
		}
		if group[i].Description == "" && group[j].Description != "" {
			return false
		}
		// Prefer shorter slug
		if len(group[i].Slug) != len(group[j].Slug) {
			return len(group[i].Slug) < len(group[j].Slug)
		}
		// Alphabetical
		return group[i].Slug < group[j].Slug
	})

	return group[0], group[1:]
}

// replaceAssetRefs updates assets that have oldTechID in their techniqueIds to use newTechID instead.
func replaceAssetRefs(ctx context.Context, fs *firestore.Client, disciplineID, oldTechID, newTechID string) int {
	iter := fs.Collection("assets").
		Where("disciplineId", "==", disciplineID).
		Where("techniqueIds", "array-contains", oldTechID).
		Documents(ctx)

	var count int
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate assets", "error", err)
			break
		}

		data := doc.Data()
		rawIDs, _ := data["techniqueIds"].([]interface{})

		var newIDs []string
		hasNew := false
		for _, raw := range rawIDs {
			id, ok := raw.(string)
			if !ok {
				continue
			}
			if id == oldTechID {
				// Replace with new, but only if new isn't already in the list
				if !hasNew {
					newIDs = append(newIDs, newTechID)
					hasNew = true
				}
				// else skip (avoid duplicate in array)
			} else {
				if id == newTechID {
					hasNew = true
				}
				newIDs = append(newIDs, id)
			}
		}

		if newIDs == nil {
			newIDs = []string{}
		}

		_, err = doc.Ref.Update(ctx, []firestore.Update{
			{Path: "techniqueIds", Value: newIDs},
			{Path: "updatedAt", Value: time.Now()},
		})
		if err != nil {
			slog.Error("failed to update asset refs", "docId", doc.Ref.ID, "error", err)
		} else {
			count++
		}
	}
	return count
}

func mergeStringSlice(a, b []string) []string {
	seen := make(map[string]bool)
	for _, s := range a {
		seen[s] = true
	}
	result := append([]string{}, a...)
	for _, s := range b {
		if !seen[s] {
			result = append(result, s)
			seen[s] = true
		}
	}
	return result
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
