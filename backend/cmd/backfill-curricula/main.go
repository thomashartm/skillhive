package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/validate"
	"google.golang.org/api/iterator"
	"google.golang.org/api/option"
)

const firestoreMaxBatchSize = 500

func main() {
	project := flag.String("project", "", "GCP project ID (overrides GCP_PROJECT env var)")
	dryRun := flag.Bool("dry-run", false, "Preview changes without writing to Firestore")
	flag.Parse()

	projectID := *project
	if projectID == "" {
		projectID = os.Getenv("GCP_PROJECT")
	}
	if projectID == "" {
		fmt.Fprintln(os.Stderr, "error: --project flag or GCP_PROJECT env var is required")
		os.Exit(1)
	}

	ctx := context.Background()

	var opts []option.ClientOption
	if keyPath := os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"); keyPath != "" {
		opts = append(opts, option.WithCredentialsFile(keyPath))
	}

	fs, err := firestore.NewClient(ctx, projectID, opts...)
	if err != nil {
		slog.Error("failed to create Firestore client", "project", projectID, "error", err)
		os.Exit(1)
	}
	defer fs.Close()

	slog.Info("backfill starting", "project", projectID, "dryRun", *dryRun)

	stats := &backfillStats{}
	if err := backfillAllCurricula(ctx, fs, *dryRun, stats); err != nil {
		slog.Error("backfill failed", "error", err)
		os.Exit(1)
	}

	slog.Info("backfill complete",
		"curriculaProcessed", stats.curriculaProcessed,
		"curriculaUpdated", stats.curriculaUpdated,
		"elementsEnriched", stats.elementsEnriched,
		"errors", stats.errors,
	)
}

type backfillStats struct {
	curriculaProcessed int
	curriculaUpdated   int
	elementsEnriched   int
	errors             int
}

func backfillAllCurricula(ctx context.Context, fs *firestore.Client, dryRun bool, stats *backfillStats) error {
	currIter := fs.Collection("curricula").Documents(ctx)
	defer currIter.Stop()

	for {
		currDoc, err := currIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("iterating curricula: %w", err)
		}

		currID := currDoc.Ref.ID
		stats.curriculaProcessed++

		if err := backfillOneCurriculum(ctx, fs, currDoc, currID, dryRun, stats); err != nil {
			slog.Error("failed to backfill curriculum", "curriculumID", currID, "error", err)
			stats.errors++
			// Continue with next curriculum rather than aborting
			continue
		}

		if stats.curriculaProcessed%10 == 0 {
			slog.Info("progress",
				"curriculaProcessed", stats.curriculaProcessed,
				"elementsEnriched", stats.elementsEnriched,
			)
		}
	}

	return nil
}

func backfillOneCurriculum(
	ctx context.Context,
	fs *firestore.Client,
	currDoc *firestore.DocumentSnapshot,
	currID string,
	dryRun bool,
	stats *backfillStats,
) error {
	var curr model.Curriculum
	if err := currDoc.DataTo(&curr); err != nil {
		return fmt.Errorf("parsing curriculum %s: %w", currID, err)
	}

	// Step (a): Ensure tagIds is an empty slice if nil
	if curr.TagIDs == nil {
		curr.TagIDs = []string{}
	}

	// Step (b): Read all elements from the subcollection
	elemIter := fs.Collection("curricula").Doc(currID).Collection("elements").Documents(ctx)
	defer elemIter.Stop()

	type elementUpdate struct {
		ref      *firestore.DocumentRef
		snapshot *model.Snapshot
	}

	var elemUpdates []elementUpdate
	var allTagIDs []string
	var searchParts []string

	// Start with curriculum's own data
	allTagIDs = append(allTagIDs, curr.TagIDs...)
	searchParts = append(searchParts, curr.Title, curr.Description)

	for {
		elemDoc, err := elemIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return fmt.Errorf("iterating elements for %s: %w", currID, err)
		}

		var elem model.CurriculumElement
		if err := elemDoc.DataTo(&elem); err != nil {
			slog.Error("failed to parse element", "curriculumID", currID, "elementID", elemDoc.Ref.ID, "error", err)
			continue
		}

		// Collect element text for searchText
		if elem.Title != nil {
			searchParts = append(searchParts, *elem.Title)
		}
		if elem.Details != nil {
			searchParts = append(searchParts, validate.StripAllHTML(*elem.Details))
		}
		for _, item := range elem.Items {
			searchParts = append(searchParts, item)
		}

		// Step (c): Enrich snapshots for technique/asset elements missing description/tagIds
		enriched := false
		if elem.Type == model.ElementTypeTechnique && elem.TechniqueID != nil {
			if snapshotNeedsEnrichment(elem.Snapshot) {
				enrichedSnap, err := enrichTechniqueSnapshot(ctx, fs, *elem.TechniqueID, elem.Snapshot)
				if err != nil {
					slog.Error("failed to enrich technique snapshot",
						"curriculumID", currID, "elementID", elemDoc.Ref.ID,
						"techniqueID", *elem.TechniqueID, "error", err,
					)
				} else {
					elem.Snapshot = enrichedSnap
					enriched = true
					elemUpdates = append(elemUpdates, elementUpdate{
						ref:      elemDoc.Ref,
						snapshot: enrichedSnap,
					})
				}
			}
		} else if elem.Type == model.ElementTypeAsset && elem.AssetID != nil {
			if snapshotNeedsEnrichment(elem.Snapshot) {
				enrichedSnap, err := enrichAssetSnapshot(ctx, fs, *elem.AssetID, elem.Snapshot)
				if err != nil {
					slog.Error("failed to enrich asset snapshot",
						"curriculumID", currID, "elementID", elemDoc.Ref.ID,
						"assetID", *elem.AssetID, "error", err,
					)
				} else {
					elem.Snapshot = enrichedSnap
					enriched = true
					elemUpdates = append(elemUpdates, elementUpdate{
						ref:      elemDoc.Ref,
						snapshot: enrichedSnap,
					})
				}
			}
		}

		_ = enriched

		// Collect snapshot data for denormalization (using potentially enriched snapshot)
		if elem.Snapshot != nil {
			if elem.Snapshot.Name != "" {
				searchParts = append(searchParts, elem.Snapshot.Name)
			}
			if elem.Snapshot.Description != "" {
				searchParts = append(searchParts, elem.Snapshot.Description)
			}
			allTagIDs = append(allTagIDs, elem.Snapshot.TagIDs...)
		}
	}

	// Step (d): Recompute allTagIds
	dedupedTags := uniqueStrings(allTagIDs)

	// Step (e): Recompute searchText
	var nonEmpty []string
	for _, s := range searchParts {
		if s != "" {
			nonEmpty = append(nonEmpty, s)
		}
	}
	searchText := strings.ToLower(strings.Join(nonEmpty, " "))

	if dryRun {
		slog.Info("dry-run: would update curriculum",
			"curriculumID", currID,
			"tagIds", curr.TagIDs,
			"allTagIds", dedupedTags,
			"searchTextLen", len(searchText),
			"elementsToEnrich", len(elemUpdates),
		)
		stats.elementsEnriched += len(elemUpdates)
		stats.curriculaUpdated++
		return nil
	}

	// Step (f): Write all updates using batched writes
	// We need to update: element snapshots + the curriculum doc itself.
	// Group into batches of max 500 writes each.
	var allWrites []batchWrite

	// Element snapshot updates
	for _, eu := range elemUpdates {
		allWrites = append(allWrites, batchWrite{
			ref: eu.ref,
			updates: []firestore.Update{
				{Path: "snapshot", Value: eu.snapshot},
			},
		})
	}

	// Curriculum document update
	allWrites = append(allWrites, batchWrite{
		ref: fs.Collection("curricula").Doc(currID),
		updates: []firestore.Update{
			{Path: "tagIds", Value: curr.TagIDs},
			{Path: "allTagIds", Value: dedupedTags},
			{Path: "searchText", Value: searchText},
		},
	})

	if err := executeBatchedWrites(ctx, fs, allWrites); err != nil {
		return fmt.Errorf("batch write for %s: %w", currID, err)
	}

	stats.elementsEnriched += len(elemUpdates)
	stats.curriculaUpdated++

	slog.Info("updated curriculum",
		"curriculumID", currID,
		"elementsEnriched", len(elemUpdates),
		"allTagIds", len(dedupedTags),
		"searchTextLen", len(searchText),
	)

	return nil
}

// snapshotNeedsEnrichment returns true if the snapshot is missing or lacks
// description and tagIds (i.e., was created before Phase 1 added these fields).
func snapshotNeedsEnrichment(snap *model.Snapshot) bool {
	if snap == nil {
		return true
	}
	// Needs enrichment if description is empty AND tagIds are empty/nil
	return snap.Description == "" && len(snap.TagIDs) == 0
}

// enrichTechniqueSnapshot reads the source technique document and returns
// a snapshot enriched with description and tagIds.
func enrichTechniqueSnapshot(ctx context.Context, fs *firestore.Client, techniqueID string, existing *model.Snapshot) (*model.Snapshot, error) {
	techDoc, err := fs.Collection("techniques").Doc(techniqueID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("reading technique %s: %w", techniqueID, err)
	}

	snap := &model.Snapshot{}
	if existing != nil {
		// Preserve existing fields
		*snap = *existing
	}

	if name, _ := techDoc.DataAt("name"); name != nil {
		if nameStr, ok := name.(string); ok {
			snap.Name = nameStr
		}
	}
	if desc, _ := techDoc.DataAt("description"); desc != nil {
		if descStr, ok := desc.(string); ok {
			snap.Description = descStr
		}
	}
	if tags, _ := techDoc.DataAt("tagIds"); tags != nil {
		if tagSlice, ok := tags.([]interface{}); ok {
			snap.TagIDs = nil
			for _, t := range tagSlice {
				if tStr, ok := t.(string); ok {
					snap.TagIDs = append(snap.TagIDs, tStr)
				}
			}
		}
	}
	if snap.TagIDs == nil {
		snap.TagIDs = []string{}
	}

	return snap, nil
}

// enrichAssetSnapshot reads the source asset document and returns
// a snapshot enriched with description and tagIds.
func enrichAssetSnapshot(ctx context.Context, fs *firestore.Client, assetID string, existing *model.Snapshot) (*model.Snapshot, error) {
	assetDoc, err := fs.Collection("assets").Doc(assetID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("reading asset %s: %w", assetID, err)
	}

	snap := &model.Snapshot{}
	if existing != nil {
		// Preserve existing fields
		*snap = *existing
	}

	if name, _ := assetDoc.DataAt("title"); name != nil {
		if nameStr, ok := name.(string); ok {
			snap.Name = nameStr
		}
	}
	if thumb, _ := assetDoc.DataAt("thumbnailUrl"); thumb != nil {
		if thumbStr, ok := thumb.(string); ok {
			snap.ThumbnailURL = thumbStr
		}
	}
	if u, _ := assetDoc.DataAt("url"); u != nil {
		if uStr, ok := u.(string); ok {
			snap.URL = uStr
		}
	}
	if desc, _ := assetDoc.DataAt("description"); desc != nil {
		if descStr, ok := desc.(string); ok {
			snap.Description = descStr
		}
	}
	if tags, _ := assetDoc.DataAt("tagIds"); tags != nil {
		if tagSlice, ok := tags.([]interface{}); ok {
			snap.TagIDs = nil
			for _, t := range tagSlice {
				if tStr, ok := t.(string); ok {
					snap.TagIDs = append(snap.TagIDs, tStr)
				}
			}
		}
	}
	if snap.TagIDs == nil {
		snap.TagIDs = []string{}
	}

	return snap, nil
}

// batchWrite represents a single document update within a batch.
type batchWrite struct {
	ref     *firestore.DocumentRef
	updates []firestore.Update
}

// executeBatchedWrites commits writes in batches of up to firestoreMaxBatchSize.
func executeBatchedWrites(ctx context.Context, fs *firestore.Client, writes []batchWrite) error {
	for i := 0; i < len(writes); i += firestoreMaxBatchSize {
		end := i + firestoreMaxBatchSize
		if end > len(writes) {
			end = len(writes)
		}

		batch := fs.Batch()
		for _, w := range writes[i:end] {
			batch.Update(w.ref, w.updates)
		}

		if _, err := batch.Commit(ctx); err != nil {
			return fmt.Errorf("committing batch (items %d-%d): %w", i, end-1, err)
		}
	}

	return nil
}

// uniqueStrings returns a deduplicated copy of the input slice, preserving order.
func uniqueStrings(input []string) []string {
	seen := make(map[string]struct{}, len(input))
	result := make([]string, 0, len(input))
	for _, s := range input {
		if _, ok := seen[s]; !ok {
			seen[s] = struct{}{}
			result = append(result, s)
		}
	}
	return result
}
