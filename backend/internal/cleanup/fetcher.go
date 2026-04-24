package cleanup

import (
	"context"
	"fmt"
	"strings"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
)

// LoadRecords fetches all records of `entityType` for `disciplineID`, applying
// an optional filter. Returns a snapshot slice suitable for the prompt and
// proposal `before` payloads.
func LoadRecords(ctx context.Context, fs *firestore.Client, disciplineID string, entityType EntityType, filter Filter) ([]RecordSnapshot, error) {
	collection := ""
	switch entityType {
	case EntityCategory:
		collection = "categories"
	case EntityTechnique:
		collection = "techniques"
	default:
		return nil, fmt.Errorf("unsupported entity type %q", entityType)
	}

	query := fs.Collection(collection).Where("disciplineId", "==", disciplineID)

	// Apply filters that the store supports natively.
	switch entityType {
	case EntityCategory:
		if filter.ParentID != nil && *filter.ParentID != "" {
			query = query.Where("parentId", "==", *filter.ParentID)
		}
	case EntityTechnique:
		if filter.CategoryID != nil && *filter.CategoryID != "" {
			query = query.Where("categoryIds", "array-contains", *filter.CategoryID)
		}
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	var out []RecordSnapshot
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list %s: %w", collection, err)
		}

		var snap RecordSnapshot
		if err := doc.DataTo(&snap); err != nil {
			return nil, fmt.Errorf("parse %s doc: %w", collection, err)
		}
		snap.ID = doc.Ref.ID

		// Client-side filter for search substring (case-insensitive name match).
		if filter.Search != nil && *filter.Search != "" {
			if !strings.Contains(strings.ToLower(snap.Name), strings.ToLower(*filter.Search)) {
				continue
			}
		}
		out = append(out, snap)
	}
	return out, nil
}
