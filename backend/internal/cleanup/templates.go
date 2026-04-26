package cleanup

import (
	"context"
	"fmt"
	"time"

	"cloud.google.com/go/firestore"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const templatesCollection = "cleanupPromptTemplates"

type TemplateStore struct {
	fs *firestore.Client
}

func NewTemplateStore(fs *firestore.Client) *TemplateStore {
	return &TemplateStore{fs: fs}
}

func (s *TemplateStore) Create(ctx context.Context, t Template) (*Template, error) {
	if t.DisciplineID == "" || !t.EntityType.IsValid() || t.Name == "" || t.PromptBody == "" {
		return nil, fmt.Errorf("template missing required fields")
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now
	ref, _, err := s.fs.Collection(templatesCollection).Add(ctx, t)
	if err != nil {
		return nil, fmt.Errorf("create template: %w", err)
	}
	t.ID = ref.ID
	return &t, nil
}

func (s *TemplateStore) Get(ctx context.Context, id string) (*Template, error) {
	doc, err := s.fs.Collection(templatesCollection).Doc(id).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("get template: %w", err)
	}
	var t Template
	if err := doc.DataTo(&t); err != nil {
		return nil, fmt.Errorf("parse template: %w", err)
	}
	t.ID = doc.Ref.ID
	return &t, nil
}

func (s *TemplateStore) List(ctx context.Context, disciplineID string, entityType EntityType) ([]Template, error) {
	iter := s.fs.Collection(templatesCollection).
		Where("disciplineId", "==", disciplineID).
		Where("entityType", "==", string(entityType)).
		Documents(ctx)
	defer iter.Stop()

	var out []Template
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("list templates: %w", err)
		}
		var t Template
		if err := doc.DataTo(&t); err != nil {
			return nil, fmt.Errorf("parse template: %w", err)
		}
		t.ID = doc.Ref.ID
		out = append(out, t)
	}
	return out, nil
}

// Update sets name/description/promptBody on the template; other fields are
// immutable after creation.
func (s *TemplateStore) Update(ctx context.Context, id string, name, description, body string) (*Template, error) {
	updates := []firestore.Update{
		{Path: "name", Value: name},
		{Path: "description", Value: description},
		{Path: "promptBody", Value: body},
		{Path: "updatedAt", Value: time.Now().UTC()},
	}
	if _, err := s.fs.Collection(templatesCollection).Doc(id).Update(ctx, updates); err != nil {
		return nil, fmt.Errorf("update template: %w", err)
	}
	return s.Get(ctx, id)
}

func (s *TemplateStore) Delete(ctx context.Context, id string) error {
	if _, err := s.fs.Collection(templatesCollection).Doc(id).Delete(ctx); err != nil {
		return fmt.Errorf("delete template: %w", err)
	}
	return nil
}
