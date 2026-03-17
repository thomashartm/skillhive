package handler

import (
	"context"
	"log/slog"
	"strings"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/validate"
	"google.golang.org/api/iterator"
)

// recomputeCurriculumDenorm recomputes the denormalized allTagIds and searchText
// fields on a curriculum document. This must be called whenever the curriculum's
// own tags/title/description change, or when elements are added/updated/deleted.
func recomputeCurriculumDenorm(ctx context.Context, fs *firestore.Client, curriculumID string) error {
	// 1. Read the curriculum document
	currDoc, err := fs.Collection("curricula").Doc(curriculumID).Get(ctx)
	if err != nil {
		slog.Error("denorm: failed to read curriculum", "curriculumID", curriculumID, "error", err)
		return err
	}

	var curr model.Curriculum
	if err := currDoc.DataTo(&curr); err != nil {
		slog.Error("denorm: failed to parse curriculum", "curriculumID", curriculumID, "error", err)
		return err
	}

	// 2. Read all elements from the subcollection
	elemIter := fs.Collection("curricula").Doc(curriculumID).Collection("elements").Documents(ctx)
	defer elemIter.Stop()

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
			slog.Error("denorm: failed to iterate elements", "curriculumID", curriculumID, "error", err)
			return err
		}

		var elem model.CurriculumElement
		if err := elemDoc.DataTo(&elem); err != nil {
			slog.Error("denorm: failed to parse element", "docID", elemDoc.Ref.ID, "error", err)
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

		// Collect snapshot data
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

	// 3. Compute final values
	dedupedTags := uniqueStrings(allTagIDs)
	var nonEmpty []string
	for _, s := range searchParts {
		if s != "" {
			nonEmpty = append(nonEmpty, s)
		}
	}
	searchText := strings.ToLower(strings.Join(nonEmpty, " "))

	// 4. Update only the denormalized fields
	_, err = fs.Collection("curricula").Doc(curriculumID).Update(ctx, []firestore.Update{
		{Path: "allTagIds", Value: dedupedTags},
		{Path: "searchText", Value: searchText},
	})
	if err != nil {
		slog.Error("denorm: failed to update curriculum", "curriculumID", curriculumID, "error", err)
		return err
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
