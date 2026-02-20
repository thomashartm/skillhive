package enrich

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/llm"
	"github.com/thomas/skillhive-api/internal/youtube"
	"google.golang.org/api/iterator"
)

// Pipeline orchestrates async YouTube asset enrichment.
type Pipeline struct {
	fs       *firestore.Client
	llm      llm.Client
	ytAPIKey string
	sem      chan struct{}
	wg       sync.WaitGroup
}

// NewPipeline creates a new enrichment pipeline.
func NewPipeline(fs *firestore.Client, llmClient llm.Client, ytAPIKey string) *Pipeline {
	return &Pipeline{
		fs:       fs,
		llm:      llmClient,
		ytAPIKey: ytAPIKey,
		sem:      make(chan struct{}, 3), // max 3 concurrent enrichments
	}
}

// Wait blocks until all in-flight enrichments finish.
func (p *Pipeline) Wait() {
	p.wg.Wait()
}

// EnrichAsset enriches a YouTube asset asynchronously.
// This should be called as a goroutine: go p.EnrichAsset(ctx, ...)
func (p *Pipeline) EnrichAsset(ctx context.Context, assetID, videoURL, disciplineID, ownerUID string) {
	p.wg.Add(1)
	defer p.wg.Done()

	// Acquire semaphore slot
	select {
	case p.sem <- struct{}{}:
		defer func() { <-p.sem }()
	case <-ctx.Done():
		p.setError(assetID, "enrichment cancelled: context done")
		return
	}

	slog.Info("starting enrichment", "assetId", assetID, "url", videoURL)

	// Update status to enriching
	p.setStatus(assetID, "enriching")

	// Step 1: Fetch YouTube metadata
	meta, err := youtube.FetchVideoMetadata(ctx, p.ytAPIKey, videoURL)
	if err != nil {
		p.setError(assetID, fmt.Sprintf("YouTube metadata fetch failed: %v", err))
		return
	}

	// Step 2: Update asset with YouTube metadata immediately
	now := time.Now()
	titleVal := meta.Title
	originator := meta.ChannelTitle
	thumbnailURL := meta.ThumbnailURL
	duration := meta.Duration
	updates := []firestore.Update{
		{Path: "title", Value: titleVal},
		{Path: "originator", Value: &originator},
		{Path: "thumbnailUrl", Value: &thumbnailURL},
		{Path: "updatedAt", Value: now},
	}
	if duration != "" {
		updates = append(updates, firestore.Update{Path: "duration", Value: &duration})
	}
	if _, err := p.fs.Collection("assets").Doc(assetID).Update(ctx, updates); err != nil {
		slog.Warn("failed to update asset with metadata", "assetId", assetID, "error", err)
		// Continue enrichment — this is not fatal
	}

	// Step 3: Fetch transcript (graceful degradation)
	transcript := ""
	transcriptAvailable := false
	if t, avail, err := youtube.GetTranscript(meta.VideoID); err == nil && avail {
		transcript = t
		transcriptAvailable = avail
		slog.Info("transcript available", "assetId", assetID, "length", len(transcript))
	} else {
		slog.Info("transcript not available, continuing with metadata only", "assetId", assetID)
	}
	_ = transcriptAvailable // used for logging above

	// Step 4: Fetch existing entities for context
	entities, err := p.fetchEntityContext(ctx, disciplineID)
	if err != nil {
		slog.Warn("failed to fetch entity context", "assetId", assetID, "error", err)
		entities = &EntityContext{} // continue with empty context
	}

	// Step 5: Build enrichment prompt
	prompt := BuildEnrichmentPrompt(
		meta.Title,
		meta.Description,
		meta.ChannelTitle,
		transcript,
		entities,
	)

	// Step 6: Call LLM
	response, err := p.llm.Generate(prompt)
	if err != nil {
		p.setError(assetID, fmt.Sprintf("LLM generation failed: %v", err))
		return
	}

	// Step 7: Parse response
	result, err := ParseLLMResponse(response)
	if err != nil {
		p.setError(assetID, fmt.Sprintf("Failed to parse LLM response: %v", err))
		return
	}

	// Step 8: Find-or-create tags
	tagIDs := []string{}
	for _, tagSlug := range result.SuggestedTags {
		tagID, err := p.findOrCreateTag(ctx, disciplineID, ownerUID, tagSlug)
		if err != nil {
			slog.Warn("failed to find/create tag", "tag", tagSlug, "error", err)
			continue
		}
		tagIDs = append(tagIDs, tagID)
	}

	// Step 9: Find-or-create techniques (matched + new)
	techniqueIDs := []string{}
	for _, techSlug := range result.MatchedTechniques {
		techID, err := p.findTechniqueBySlug(ctx, disciplineID, techSlug)
		if err != nil {
			slog.Warn("matched technique not found", "slug", techSlug, "error", err)
			continue
		}
		techniqueIDs = append(techniqueIDs, techID)
	}
	for _, techName := range result.NewTechniques {
		techID, err := p.findOrCreateTechnique(ctx, disciplineID, ownerUID, techName)
		if err != nil {
			slog.Warn("failed to find/create technique", "name", techName, "error", err)
			continue
		}
		techniqueIDs = append(techniqueIDs, techID)
	}

	// Step 10: Find categories (no auto-creation)
	categoryIDs := []string{}
	for _, catSlug := range result.MatchedCategories {
		catID, err := p.findCategoryBySlug(ctx, disciplineID, catSlug)
		if err != nil {
			slog.Warn("matched category not found", "slug", catSlug, "error", err)
			continue
		}
		categoryIDs = append(categoryIDs, catID)
	}

	// Step 11: Final asset update with enriched data
	enrichedTitle := result.Title
	if enrichedTitle == "" {
		enrichedTitle = meta.Title
	}
	enrichedDesc := result.Description
	if enrichedDesc == "" {
		enrichedDesc = meta.Description
		if len(enrichedDesc) > 500 {
			enrichedDesc = enrichedDesc[:500]
		}
	}

	var videoType *string
	if result.VideoType != "" {
		videoType = &result.VideoType
	}

	var enrichedOriginator *string
	if len(result.Authors) > 0 {
		joined := strings.Join(result.Authors, ", ")
		enrichedOriginator = &joined
	} else if originator != "" {
		enrichedOriginator = &originator
	}

	finalUpdates := []firestore.Update{
		{Path: "title", Value: enrichedTitle},
		{Path: "description", Value: enrichedDesc},
		{Path: "videoType", Value: videoType},
		{Path: "originator", Value: enrichedOriginator},
		{Path: "techniqueIds", Value: techniqueIDs},
		{Path: "categoryIds", Value: categoryIDs},
		{Path: "tagIds", Value: tagIDs},
		{Path: "processingStatus", Value: "completed"},
		{Path: "processingError", Value: nil},
		{Path: "updatedAt", Value: time.Now()},
	}

	if _, err := p.fs.Collection("assets").Doc(assetID).Update(ctx, finalUpdates); err != nil {
		slog.Error("failed to update asset with enriched data", "assetId", assetID, "error", err)
		p.setError(assetID, fmt.Sprintf("Failed to save enriched data: %v", err))
		return
	}

	slog.Info("enrichment completed",
		"assetId", assetID,
		"title", enrichedTitle,
		"techniques", len(techniqueIDs),
		"categories", len(categoryIDs),
		"tags", len(tagIDs),
	)
}

// setStatus updates the processing status of an asset.
func (p *Pipeline) setStatus(assetID, status string) {
	ctx := context.Background()
	_, err := p.fs.Collection("assets").Doc(assetID).Update(ctx, []firestore.Update{
		{Path: "processingStatus", Value: status},
		{Path: "updatedAt", Value: time.Now()},
	})
	if err != nil {
		slog.Error("failed to update processing status", "assetId", assetID, "status", status, "error", err)
	}
}

// setError updates the asset with a failed status and error message.
func (p *Pipeline) setError(assetID, errMsg string) {
	ctx := context.Background()
	_, err := p.fs.Collection("assets").Doc(assetID).Update(ctx, []firestore.Update{
		{Path: "processingStatus", Value: "failed"},
		{Path: "processingError", Value: &errMsg},
		{Path: "updatedAt", Value: time.Now()},
	})
	if err != nil {
		slog.Error("failed to update processing error", "assetId", assetID, "error", err)
	}
}

// fetchEntityContext loads existing entities for the enrichment prompt.
func (p *Pipeline) fetchEntityContext(ctx context.Context, disciplineID string) (*EntityContext, error) {
	ec := &EntityContext{}

	// Fetch disciplines
	discIter := p.fs.Collection("disciplines").Documents(ctx)
	defer discIter.Stop()
	for {
		doc, err := discIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		if slug, ok := doc.Data()["slug"].(string); ok {
			ec.Disciplines = append(ec.Disciplines, slug)
		}
	}

	// Fetch tags for discipline
	tagIter := p.fs.Collection("tags").Where("disciplineId", "==", disciplineID).Documents(ctx)
	defer tagIter.Stop()
	for {
		doc, err := tagIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		data := doc.Data()
		name, _ := data["name"].(string)
		slug, _ := data["slug"].(string)
		if name != "" && slug != "" {
			ec.Tags = append(ec.Tags, NameSlugPair{Name: name, Slug: slug})
		}
	}

	// Fetch techniques for discipline
	techIter := p.fs.Collection("techniques").Where("disciplineId", "==", disciplineID).Documents(ctx)
	defer techIter.Stop()
	for {
		doc, err := techIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		data := doc.Data()
		name, _ := data["name"].(string)
		slug, _ := data["slug"].(string)
		if name != "" && slug != "" {
			ec.Techniques = append(ec.Techniques, NameSlugPair{Name: name, Slug: slug})
		}
	}

	// Fetch categories for discipline
	catIter := p.fs.Collection("categories").Where("disciplineId", "==", disciplineID).Documents(ctx)
	defer catIter.Stop()
	for {
		doc, err := catIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			break
		}
		data := doc.Data()
		name, _ := data["name"].(string)
		slug, _ := data["slug"].(string)
		parentID, _ := data["parentId"].(string)
		if name != "" && slug != "" {
			ec.Categories = append(ec.Categories, CategoryHierarchy{
				Name:     name,
				Slug:     slug,
				ParentID: parentID,
			})
		}
	}

	return ec, nil
}

// findOrCreateTag finds an existing tag by slug or creates a new one.
func (p *Pipeline) findOrCreateTag(ctx context.Context, disciplineID, ownerUID, tagSlug string) (string, error) {
	slug := slugify(tagSlug)

	iter := p.fs.Collection("tags").
		Where("disciplineId", "==", disciplineID).
		Where("slug", "==", slug).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == nil {
		return doc.Ref.ID, nil
	}

	// Create new tag
	now := time.Now()
	// Convert slug back to a readable name
	name := strings.ReplaceAll(tagSlug, "-", " ")
	name = strings.Title(name) //nolint:staticcheck

	ref, _, err := p.fs.Collection("tags").Add(ctx, map[string]interface{}{
		"name":         name,
		"slug":         slug,
		"description":  "",
		"disciplineId": disciplineID,
		"ownerUid":     ownerUID,
		"createdAt":    now,
		"updatedAt":    now,
	})
	if err != nil {
		return "", err
	}

	slog.Info("created tag", "id", ref.ID, "slug", slug)
	return ref.ID, nil
}

// findTechniqueBySlug finds an existing technique by slug.
func (p *Pipeline) findTechniqueBySlug(ctx context.Context, disciplineID, slug string) (string, error) {
	iter := p.fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID).
		Where("slug", "==", slug).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		return "", fmt.Errorf("technique not found: %s", slug)
	}
	return doc.Ref.ID, nil
}

// findOrCreateTechnique finds an existing technique by name/slug or creates a new one.
func (p *Pipeline) findOrCreateTechnique(ctx context.Context, disciplineID, ownerUID, techName string) (string, error) {
	slug := slugify(techName)

	iter := p.fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID).
		Where("slug", "==", slug).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err == nil {
		return doc.Ref.ID, nil
	}

	// Create new technique
	now := time.Now()
	ref, _, err := p.fs.Collection("techniques").Add(ctx, map[string]interface{}{
		"name":         techName,
		"slug":         slug,
		"description":  "",
		"disciplineId": disciplineID,
		"categoryIds":  []string{},
		"tagIds":       []string{},
		"ownerUid":     ownerUID,
		"createdAt":    now,
		"updatedAt":    now,
	})
	if err != nil {
		return "", err
	}

	slog.Info("created technique", "id", ref.ID, "name", techName)
	return ref.ID, nil
}

// findCategoryBySlug finds an existing category by slug (no auto-creation).
func (p *Pipeline) findCategoryBySlug(ctx context.Context, disciplineID, slug string) (string, error) {
	iter := p.fs.Collection("categories").
		Where("disciplineId", "==", disciplineID).
		Where("slug", "==", slug).
		Limit(1).
		Documents(ctx)
	defer iter.Stop()

	doc, err := iter.Next()
	if err != nil {
		return "", fmt.Errorf("category not found: %s", slug)
	}
	return doc.Ref.ID, nil
}
