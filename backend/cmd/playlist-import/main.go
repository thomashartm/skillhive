package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"github.com/thomas/skillhive-api/internal/validate"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// --- JSON structures matching playlist-enriched.json ---

type PlaylistFile struct {
	Videos []PlaylistVideo `json:"videos"`
}

type PlaylistVideo struct {
	VideoID  string        `json:"videoId"`
	URL      string        `json:"url"`
	Original *VideoInput   `json:"original"`
	Enriched *EnrichedData `json:"enriched"`
	Error    *string       `json:"error,omitempty"`
}

type VideoInput struct {
	VideoID      string `json:"videoId"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	ChannelTitle string `json:"channelTitle"`
	Duration     string `json:"duration"`
	ThumbnailURL string `json:"thumbnailUrl"`
	URL          string `json:"url"`
}

type EnrichedData struct {
	Title               string   `json:"title"`
	Description         string   `json:"description"`
	SuggestedDiscipline string   `json:"suggestedDiscipline"`
	SuggestedTags       []string `json:"suggestedTags"`
	Authors             []string `json:"authors"`
	PurposeSummary      string   `json:"purposeSummary"`
	VideoType           string   `json:"videoType"`
	Positions           []string `json:"positions"`
	TechniqueType       []string `json:"techniqueType"`
	Classification      []string `json:"classification"`
	TranscriptAvailable bool     `json:"transcriptAvailable"`
}

// --- per-video extraction result ---

type videoTechniques struct {
	Video         PlaylistVideo
	TechSlugs     []string // technique slugs extracted from suggestedTags
	CategorySlugs []string // category slugs from positions
	TagSlugs      []string // tag slugs from techniqueType + classification
}

// --- technique accumulator ---

type techniqueInfo struct {
	Slug        string
	Name        string
	Description string
	CategoryIDs map[string]bool // union from all videos
}

// Generic tags that do NOT represent a specific technique
var genericTags = map[string]bool{
	// Discipline / meta
	"bjj": true, "grappling": true, "submission": true, "jiu-jitsu": true,
	"bjj-fundamentals": true, "bjj-techniques": true, "bjj-basics": true, "bjj-drills": true,
	"beginner": true, "intermediate": true, "advanced": true,
	"no-gi": true, "gi": true, "ground-game": true, "fundamentals": true,
	"competition": true, "conditioning": true, "mobility": true,
	"self-defense": true, "attack": true, "defense": true,
	"concept": true, "drill": true, "training": true, "technique": true,
	"instructional": true, "workout": true, "warm-up": true,
	"submission-defense": true, "guard-pull": true,
	// Instructor names (not techniques)
	"xande-ribeiro": true, "rafael-lovato-jr": true, "saulo-ribeiro": true,
	"gordon-ryan": true, "pedro-sauer": true, "john-danaher": true,
	"cobrinha": true, "robert-drysdale": true, "chris-haueter": true,
	"chris-paines": true, "helio-gracie": true, "marcelo-garcia": true,
	"jean-jacques-machado": true, "stephan-kesting": true,
	"migliarese-brothers": true, "lachlan-giles": true,
	// Other non-technique generic tags
	"judo-for-bjj": true, "seminar": true, "nogi": true,
	"older-grapplers": true, "gi-jiu-jitsu": true, "gracie-jiu-jitsu": true,
	"flexibility": true, "stand-up": true,
}

// Map enriched positions to category slugs
var positionToCategorySlug = map[string]string{
	"guard":           "guard",
	"closed-guard":    "closed-guard",
	"half-guard":      "half-guard",
	"butterfly-guard": "butterfly-guard",
	"de-la-riva":      "de-la-riva",
	"spider-guard":    "spider-guard",
	"lasso-guard":     "lasso-guard",
	"x-guard":         "x-guard",
	"50/50":           "5050-guard",
	"side-control":    "side-control",
	"mount":           "mount",
	"back":            "back",
	"knee-on-belly":   "knee-on-belly",
	"north-south":     "north-south",
	"turtle":          "turtle",
	"crucifix":        "crucifix",
	"standing":        "closing-the-distance",
	"open-guard":      "guard",
	"knee-shield":     "z-guard",
	"lockdown":        "lockdown",
	"lock-down":       "lockdown",
	"clinch":          "closing-the-distance",
}

// Original seeded technique slugs (never delete these during cleanup)
var seededTechniqueSlugs = map[string]bool{
	"scissor-sweep": true, "hip-bump-sweep": true, "armbar-from-guard": true,
	"triangle-choke": true, "rear-naked-choke": true, "americana": true,
	"cross-collar-choke": true, "side-control-escape-shrimp": true,
	"single-leg-takedown": true, "double-leg-takedown": true,
}

func main() {
	inputFile := flag.String("input", "data/playlist-enriched.json", "Path to enriched playlist JSON")
	discipline := flag.String("discipline", "bjj", "Discipline ID")
	ownerUID := flag.String("owner-uid", "system", "Owner UID for created records")
	dryRun := flag.Bool("dry-run", false, "Print what would be created without writing to Firestore")
	cleanup := flag.Bool("cleanup", false, "Delete previously imported data before re-importing")
	flag.Parse()

	// Read input file
	raw, err := os.ReadFile(*inputFile)
	if err != nil {
		slog.Error("failed to read input file", "path", *inputFile, "error", err)
		os.Exit(1)
	}

	var playlist PlaylistFile
	if err := json.Unmarshal(raw, &playlist); err != nil {
		slog.Error("failed to parse input JSON", "error", err)
		os.Exit(1)
	}

	// Filter active videos (keep all disciplines - judo, luta-livre are ok)
	var active []PlaylistVideo
	var skipped int
	for _, v := range playlist.Videos {
		if v.Error != nil {
			skipped++
			continue
		}
		if v.Original == nil || v.Original.Duration == "" {
			skipped++
			continue
		}
		if v.Original.Title == "Private video" || v.Original.Title == "Deleted video" {
			skipped++
			continue
		}
		if v.Enriched == nil {
			skipped++
			continue
		}
		// Skip non-martial-arts content
		if v.Enriched.SuggestedDiscipline == "music" {
			slog.Info("skipping non-martial-arts", "videoId", v.VideoID, "discipline", v.Enriched.SuggestedDiscipline)
			skipped++
			continue
		}
		active = append(active, v)
	}

	slog.Info("filtered videos", "total", len(playlist.Videos), "active", len(active), "skipped", skipped)

	if *dryRun {
		// Load category slugs for filtering
		catSlugs := make(map[string]bool)
		for _, slug := range positionToCategorySlug {
			catSlugs[slug] = true
		}
		dryRunAnalysis(active, catSlugs)
		return
	}

	// Initialize Firebase
	cfg := config.Load()
	ctx := context.Background()
	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()
	fs := clients.Firestore

	// Cleanup previous import if requested
	if *cleanup {
		cleanupPreviousImport(ctx, fs, *discipline)
	}

	// Load existing category slugs from Firestore
	categorySlugs := loadCategorySlugs(ctx, fs, *discipline)
	slog.Info("loaded categories", "count", len(categorySlugs))

	// ============================================================
	// Phase 1: Create tags from techniqueType + classification
	// ============================================================
	tagSlugs := collectAllTagSlugs(active)
	var tagsCreated, tagsExisted int
	for _, slug := range tagSlugs {
		created := ensureTag(ctx, fs, *discipline, slug, *ownerUID)
		if created {
			tagsCreated++
		} else {
			tagsExisted++
		}
	}
	slog.Info("tags phase complete", "created", tagsCreated, "existed", tagsExisted)

	// ============================================================
	// Phase 2: Extract techniques per video, accumulate unique set
	// ============================================================
	var videoResults []videoTechniques
	allTechniques := make(map[string]*techniqueInfo) // slug -> info

	for _, v := range active {
		vt := extractVideoTechniques(v, categorySlugs)
		videoResults = append(videoResults, vt)

		// Accumulate techniques
		for _, tSlug := range vt.TechSlugs {
			ti, exists := allTechniques[tSlug]
			if !exists {
				ti = &techniqueInfo{
					Slug:        tSlug,
					Name:        tagToName(tSlug),
					CategoryIDs: make(map[string]bool),
				}
				allTechniques[tSlug] = ti
			}
			// Merge categories from this video
			for _, cat := range vt.CategorySlugs {
				ti.CategoryIDs[cat] = true
			}
			// Description left empty — use technique-enrich tool to generate generic descriptions via Gemini
		}
	}

	slog.Info("extracted techniques", "unique", len(allTechniques), "videos", len(videoResults))

	// ============================================================
	// Phase 3: Create techniques in Firestore
	// ============================================================
	var techCreated, techExisted int
	for _, ti := range allTechniques {
		// Validate category IDs against what exists in Firestore
		validCatIDs := make([]string, 0)
		for cat := range ti.CategoryIDs {
			if categorySlugs[cat] {
				validCatIDs = append(validCatIDs, cat)
			}
		}

		techRef := fs.Collection("techniques").Doc(ti.Slug)
		techDoc, err := techRef.Get(ctx)
		if err != nil && status.Code(err) != codes.NotFound {
			slog.Error("failed to check technique", "slug", ti.Slug, "error", err)
			continue
		}

		if techDoc != nil && techDoc.Exists() {
			techExisted++
			// Update categoryIds if we have more to add
			existingData := techDoc.Data()
			existingCats, _ := existingData["categoryIds"].([]interface{})
			existingCatSet := make(map[string]bool)
			for _, c := range existingCats {
				if cs, ok := c.(string); ok {
					existingCatSet[cs] = true
				}
			}
			newCats := false
			for _, cat := range validCatIDs {
				if !existingCatSet[cat] {
					newCats = true
					existingCatSet[cat] = true
				}
			}
			if newCats {
				merged := make([]string, 0, len(existingCatSet))
				for cat := range existingCatSet {
					merged = append(merged, cat)
				}
				techRef.Update(ctx, []firestore.Update{
					{Path: "categoryIds", Value: merged},
					{Path: "updatedAt", Value: time.Now()},
				})
				slog.Info("updated technique categories", "slug", ti.Slug, "categories", merged)
			} else {
				slog.Info("technique exists, no changes", "slug", ti.Slug)
			}
		} else {
			now := time.Now()
			desc := "" // Left empty — enriched via technique-enrich tool with Gemini
			_, err := techRef.Set(ctx, map[string]interface{}{
				"name":         ti.Name,
				"slug":         ti.Slug,
				"description":  desc,
				"disciplineId": *discipline,
				"categoryIds":  validCatIDs,
				"tagIds":       []string{},
				"ownerUid":     *ownerUID,
				"createdAt":    now,
				"updatedAt":    now,
			})
			if err != nil {
				slog.Error("failed to create technique", "slug", ti.Slug, "error", err)
				continue
			}
			techCreated++
			slog.Info("created technique", "slug", ti.Slug, "name", ti.Name, "categories", validCatIDs)
		}
	}
	slog.Info("techniques phase complete", "created", techCreated, "existed", techExisted)

	// ============================================================
	// Phase 4: Create assets with proper techniqueIds + tagIds
	// ============================================================
	var assetCreated, assetExisted int
	for _, vt := range videoResults {
		v := vt.Video
		assetDocID := "yt-" + v.VideoID
		assetRef := fs.Collection("assets").Doc(assetDocID)

		existDoc, err := assetRef.Get(ctx)
		if err != nil && status.Code(err) != codes.NotFound {
			slog.Error("failed to check asset", "docId", assetDocID, "error", err)
			continue
		}

		if existDoc != nil && existDoc.Exists() {
			assetExisted++
			slog.Info("asset exists", "docId", assetDocID)
			continue
		}

		now := time.Now()
		techniqueIDs := vt.TechSlugs
		if techniqueIDs == nil {
			techniqueIDs = []string{}
		}
		categoryIDs := vt.CategorySlugs
		if categoryIDs == nil {
			categoryIDs = []string{}
		}
		tagIDs := vt.TagSlugs
		if tagIDs == nil {
			tagIDs = []string{}
		}

		// Add "seminar" category for seminar-type videos
		if v.Enriched.VideoType == "seminar" && !containsStr(categoryIDs, "seminar") {
			categoryIDs = append(categoryIDs, "seminar")
		}

		assetData := map[string]interface{}{
			"url":          v.URL,
			"title":        v.Enriched.Title,
			"description":  v.Enriched.Description,
			"type":         "video",
			"videoType":    mapVideoType(v.Enriched.VideoType),
			"techniqueIds": techniqueIDs,
			"categoryIds":  categoryIDs,
			"tagIds":       tagIDs,
			"disciplineId": *discipline,
			"ownerUid":     *ownerUID,
			"createdAt":    now,
			"updatedAt":    now,
		}

		if len(v.Enriched.Authors) > 0 {
			assetData["originator"] = v.Enriched.Authors[0]
		}
		if v.Original.ThumbnailURL != "" {
			assetData["thumbnailUrl"] = v.Original.ThumbnailURL
		}

		_, err = assetRef.Set(ctx, assetData)
		if err != nil {
			slog.Error("failed to create asset", "docId", assetDocID, "error", err)
			continue
		}
		assetCreated++
		slog.Info("created asset", "docId", assetDocID, "title", v.Enriched.Title,
			"techniques", techniqueIDs, "tags", tagIDs)
	}

	slog.Info("import complete",
		"tagsCreated", tagsCreated,
		"techniquesCreated", techCreated,
		"techniquesExisted", techExisted,
		"assetsCreated", assetCreated,
		"assetsExisted", assetExisted,
	)
}

// extractVideoTechniques extracts technique slugs, category slugs, and tag slugs for a single video.
func extractVideoTechniques(v PlaylistVideo, categorySlugs map[string]bool) videoTechniques {
	vt := videoTechniques{Video: v}
	if v.Enriched == nil {
		return vt
	}

	// Extract category slugs from positions
	for _, pos := range v.Enriched.Positions {
		catSlug, ok := positionToCategorySlug[pos]
		if ok && !containsStr(vt.CategorySlugs, catSlug) {
			vt.CategorySlugs = append(vt.CategorySlugs, catSlug)
		}
	}

	// Extract technique slugs from suggestedTags
	// A tag is a technique if it's NOT generic, NOT an instructor name, and NOT a category slug
	for _, tag := range v.Enriched.SuggestedTags {
		if genericTags[tag] {
			continue
		}
		if categorySlugs[tag] {
			// This is a category, add it to category slugs if not already there
			if !containsStr(vt.CategorySlugs, tag) {
				vt.CategorySlugs = append(vt.CategorySlugs, tag)
			}
			continue
		}
		if !containsStr(vt.TechSlugs, tag) {
			vt.TechSlugs = append(vt.TechSlugs, tag)
		}
	}

	// No fallback: if no technique tags found, this video has no techniques
	// (documentaries, seminars, etc. are tagged + categorized only)

	// Extract tag slugs from techniqueType + classification
	for _, tt := range v.Enriched.TechniqueType {
		slug := validate.GenerateSlug(tt)
		if slug != "" && !containsStr(vt.TagSlugs, slug) {
			vt.TagSlugs = append(vt.TagSlugs, slug)
		}
	}
	for _, cl := range v.Enriched.Classification {
		slug := validate.GenerateSlug(cl)
		if slug != "" && !containsStr(vt.TagSlugs, slug) {
			vt.TagSlugs = append(vt.TagSlugs, slug)
		}
	}

	return vt
}

// collectAllTagSlugs gathers all unique tag slugs from techniqueType + classification across all videos.
func collectAllTagSlugs(videos []PlaylistVideo) []string {
	seen := make(map[string]bool)
	var result []string
	for _, v := range videos {
		if v.Enriched == nil {
			continue
		}
		for _, tt := range v.Enriched.TechniqueType {
			slug := validate.GenerateSlug(tt)
			if slug != "" && !seen[slug] {
				seen[slug] = true
				result = append(result, slug)
			}
		}
		for _, cl := range v.Enriched.Classification {
			slug := validate.GenerateSlug(cl)
			if slug != "" && !seen[slug] {
				seen[slug] = true
				result = append(result, slug)
			}
		}
	}
	return result
}

// ensureTag creates a tag document if it doesn't exist. Returns true if created.
func ensureTag(ctx context.Context, fs *firestore.Client, disciplineID, slug, ownerUID string) bool {
	ref := fs.Collection("tags").Doc(slug)
	doc, err := ref.Get(ctx)
	if err == nil && doc.Exists() {
		return false
	}

	now := time.Now()
	_, err = ref.Set(ctx, map[string]interface{}{
		"name":         tagToName(slug),
		"slug":         slug,
		"disciplineId": disciplineID,
		"ownerUid":     ownerUID,
		"createdAt":    now,
		"updatedAt":    now,
	})
	if err != nil {
		slog.Error("failed to create tag", "slug", slug, "error", err)
		return false
	}
	slog.Info("created tag", "slug", slug)
	return true
}

// cleanupPreviousImport deletes all yt-* assets and imported techniques (not original seeded ones).
func cleanupPreviousImport(ctx context.Context, fs *firestore.Client, disciplineID string) {
	slog.Info("cleaning up previous import...")

	// Delete all yt-* assets
	assetIter := fs.Collection("assets").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "==", "system").
		Documents(ctx)
	assetDocs, err := assetIter.GetAll()
	if err != nil {
		slog.Error("failed to list assets for cleanup", "error", err)
		return
	}

	var assetsDeleted int
	for _, doc := range assetDocs {
		if strings.HasPrefix(doc.Ref.ID, "yt-") {
			if _, err := doc.Ref.Delete(ctx); err != nil {
				slog.Error("failed to delete asset", "docId", doc.Ref.ID, "error", err)
			} else {
				assetsDeleted++
			}
		}
	}
	slog.Info("deleted imported assets", "count", assetsDeleted)

	// Delete imported techniques (ownerUid=system, NOT in seeded set)
	techIter := fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "==", "system").
		Documents(ctx)
	techDocs, err := techIter.GetAll()
	if err != nil {
		slog.Error("failed to list techniques for cleanup", "error", err)
		return
	}

	var techsDeleted int
	for _, doc := range techDocs {
		slug, _ := doc.Data()["slug"].(string)
		if !seededTechniqueSlugs[slug] {
			if _, err := doc.Ref.Delete(ctx); err != nil {
				slog.Error("failed to delete technique", "slug", slug, "error", err)
			} else {
				techsDeleted++
			}
		}
	}
	slog.Info("deleted imported techniques", "count", techsDeleted)

	// Delete imported tags (ownerUid=system)
	tagIter := fs.Collection("tags").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "==", "system").
		Documents(ctx)
	tagDocs, err := tagIter.GetAll()
	if err != nil {
		slog.Error("failed to list tags for cleanup", "error", err)
		return
	}

	var tagsDeleted int
	for _, doc := range tagDocs {
		if _, err := doc.Ref.Delete(ctx); err != nil {
			slog.Error("failed to delete tag", "docId", doc.Ref.ID, "error", err)
		} else {
			tagsDeleted++
		}
	}
	slog.Info("deleted imported tags", "count", tagsDeleted)
}

// tagToName converts a tag slug to a human-readable name.
func tagToName(tag string) string {
	parts := strings.Split(tag, "-")
	for i, p := range parts {
		if len(p) > 0 {
			parts[i] = strings.ToUpper(p[:1]) + p[1:]
		}
	}
	return strings.Join(parts, " ")
}

func mapVideoType(vt string) string {
	switch vt {
	case "short", "full", "instructional", "seminar":
		return vt
	default:
		return "full"
	}
}

func loadCategorySlugs(ctx context.Context, fs *firestore.Client, disciplineID string) map[string]bool {
	result := make(map[string]bool)
	iter := fs.Collection("categories").Where("disciplineId", "==", disciplineID).Documents(ctx)
	docs, err := iter.GetAll()
	if err != nil {
		slog.Error("failed to load categories", "error", err)
		return result
	}
	for _, doc := range docs {
		slug, _ := doc.Data()["slug"].(string)
		if slug != "" {
			result[slug] = true
		}
	}
	return result
}

func containsStr(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}

func dryRunAnalysis(videos []PlaylistVideo, categorySlugs map[string]bool) {
	allTechniques := make(map[string][]string) // slug -> list of video titles
	allTags := make(map[string]int)            // slug -> count
	multiTechVideos := 0

	for _, v := range videos {
		vt := extractVideoTechniques(v, categorySlugs)

		if len(vt.TechSlugs) > 1 {
			multiTechVideos++
		}

		for _, slug := range vt.TechSlugs {
			allTechniques[slug] = append(allTechniques[slug], v.Enriched.Title)
		}
		for _, slug := range vt.TagSlugs {
			allTags[slug]++
		}
	}

	fmt.Printf("\n=== DRY RUN ANALYSIS ===\n")
	fmt.Printf("Videos: %d\n", len(videos))
	fmt.Printf("Unique techniques: %d\n", len(allTechniques))
	fmt.Printf("Videos with multiple techniques: %d\n", multiTechVideos)
	fmt.Printf("Unique tags: %d\n", len(allTags))

	fmt.Printf("\n--- TAGS (from techniqueType + classification) ---\n")
	for slug, cnt := range allTags {
		fmt.Printf("  [%s] %s (%d videos)\n", slug, tagToName(slug), cnt)
	}

	fmt.Printf("\n--- TECHNIQUES (from suggestedTags, filtered) ---\n")
	for slug, titles := range allTechniques {
		fmt.Printf("  [%s] %s (%d videos)\n", slug, tagToName(slug), len(titles))
		for _, t := range titles {
			fmt.Printf("    - %s\n", t)
		}
	}
}

// Unused but kept for potential future use with batch operations
var _ = iterator.Done
