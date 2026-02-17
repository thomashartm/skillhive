package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log/slog"
	"os"
	"regexp"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/store"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

// VideoInput is the video metadata from YouTube API
type VideoInput struct {
	VideoID      string `json:"videoId"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	ChannelTitle string `json:"channelTitle"`
	Duration     string `json:"duration"`
	ThumbnailURL string `json:"thumbnailUrl"`
	URL          string `json:"url"`
}

// EnrichedData is the LLM-generated enrichment
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

// OutputVideo combines original and enriched data for output
type OutputVideo struct {
	VideoID  string        `json:"videoId"`
	URL      string        `json:"url"`
	Original *VideoInput   `json:"original"`
	Enriched *EnrichedData `json:"enriched"`
	Error    *string       `json:"error,omitempty"`
}

// OutputMetadata contains processing metadata
type OutputMetadata struct {
	ProcessedAt  string `json:"processedAt"`
	LLMProvider  string `json:"llmProvider"`
	Model        string `json:"model"`
	TotalVideos  int    `json:"totalVideos"`
	SuccessCount int    `json:"successCount"`
	ErrorCount   int    `json:"errorCount"`
}

// Output is the final JSON output structure
type Output struct {
	Videos   []OutputVideo   `json:"videos"`
	Metadata *OutputMetadata `json:"metadata"`
}

func main() {
	// CLI flags
	playlistID := flag.String("playlist", "", "YouTube playlist ID")
	videoURL := flag.String("video", "", "Single YouTube video URL")
	disciplineID := flag.String("discipline", "", "Discipline ID (optional, LLM auto-detects if omitted)")
	llmProvider := flag.String("llm-provider", "ollama", "LLM provider: ollama or gemini")
	llmModel := flag.String("model", "", "LLM model name (default: llama3.2 for ollama, gemini-2.0-flash for gemini)")
	ownerUID := flag.String("owner-uid", "system", "Owner UID for created assets")
	videoType := flag.String("video-type", "", "Override video type: short, full, instructional, seminar")
	createTags := flag.Bool("create-tags", false, "Auto-create suggested tags in Firestore")
	dryRun := flag.Bool("dry-run", false, "Print JSON without writing to database")
	outputFile := flag.String("output", "", "Write JSON to file (implies dry-run)")
	concurrency := flag.Int("concurrency", 3, "Number of videos to process in parallel")
	verbose := flag.Bool("verbose", false, "Enable verbose/debug logging")
	flag.Parse()

	// Set log level based on verbose flag
	if *verbose {
		slog.SetDefault(slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelDebug})))
	}

	// Validate inputs
	if *playlistID == "" && *videoURL == "" {
		fmt.Fprintln(os.Stderr, "Error: Either --playlist or --video is required")
		fmt.Fprintln(os.Stderr, "\nUsage:")
		fmt.Fprintln(os.Stderr, "  yt-enrich --playlist <PLAYLIST_ID> [options]")
		fmt.Fprintln(os.Stderr, "  yt-enrich --video <VIDEO_URL> [options]")
		fmt.Fprintln(os.Stderr, "\nOptions:")
		flag.PrintDefaults()
		os.Exit(1)
	}

	if *playlistID != "" && *videoURL != "" {
		fmt.Fprintln(os.Stderr, "Error: Cannot specify both --playlist and --video")
		os.Exit(1)
	}

	if *llmProvider != "ollama" && *llmProvider != "gemini" {
		fmt.Fprintf(os.Stderr, "Error: Invalid --llm-provider %q. Must be 'ollama' or 'gemini'\n", *llmProvider)
		os.Exit(1)
	}

	if *videoType != "" {
		valid := map[string]bool{"short": true, "full": true, "instructional": true, "seminar": true}
		if !valid[*videoType] {
			fmt.Fprintf(os.Stderr, "Error: Invalid --video-type %q. Must be one of: short, full, instructional, seminar\n", *videoType)
			os.Exit(1)
		}
	}

	// Output file implies dry-run
	if *outputFile != "" {
		*dryRun = true
	}

	// Set default model based on provider
	if *llmModel == "" {
		if *llmProvider == "ollama" {
			*llmModel = "llama3.2"
		} else {
			*llmModel = "gemini-2.0-flash"
		}
	}

	// Load config and check API key
	cfg := config.Load()
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	if apiKey == "" {
		slog.Error("YOUTUBE_API_KEY environment variable is required")
		os.Exit(1)
	}

	ctx := context.Background()

	// Initialize Firebase clients
	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()

	fs := clients.Firestore

	// Validate discipline if provided
	if *disciplineID != "" {
		discDoc, err := fs.Collection("disciplines").Doc(*disciplineID).Get(ctx)
		if err != nil || !discDoc.Exists() {
			slog.Error("discipline not found in Firestore", "disciplineId", *disciplineID)
			os.Exit(1)
		}
		slog.Info("discipline validated", "disciplineId", *disciplineID)
	}

	// Fetch existing disciplines and tags for LLM context
	existingDisciplines, err := fetchExistingDisciplines(ctx, fs)
	if err != nil {
		slog.Warn("failed to fetch existing disciplines", "error", err)
	}

	existingTags, err := fetchExistingTags(ctx, fs, *disciplineID)
	if err != nil {
		slog.Warn("failed to fetch existing tags", "error", err)
	}

	// Fetch videos
	var videos []*VideoInput
	if *playlistID != "" {
		videos, err = fetchPlaylistVideos(ctx, apiKey, *playlistID)
		if err != nil {
			slog.Error("failed to fetch playlist videos", "error", err)
			os.Exit(1)
		}
		slog.Info("fetched playlist videos", "count", len(videos))
	} else {
		video, err := fetchSingleVideo(ctx, apiKey, *videoURL)
		if err != nil {
			slog.Error("failed to fetch video", "error", err)
			os.Exit(1)
		}
		videos = []*VideoInput{video}
		slog.Info("fetched single video", "title", video.Title)
	}

	if len(videos) == 0 {
		slog.Info("no videos to process")
		return
	}

	// Create LLM client
	llmClient, err := NewLLMClient(LLMProvider(*llmProvider), *llmModel)
	if err != nil {
		slog.Error("failed to create LLM client", "error", err)
		os.Exit(1)
	}

	// Process videos with enrichment
	outputVideos := processVideos(
		videos,
		llmClient,
		existingDisciplines,
		existingTags,
		*concurrency,
	)

	// Calculate stats
	successCount := 0
	errorCount := 0
	for _, v := range outputVideos {
		if v.Error == nil {
			successCount++
		} else {
			errorCount++
		}
	}

	// Build output
	output := Output{
		Videos: outputVideos,
		Metadata: &OutputMetadata{
			ProcessedAt:  time.Now().UTC().Format(time.RFC3339),
			LLMProvider:  *llmProvider,
			Model:        *llmModel,
			TotalVideos:  len(videos),
			SuccessCount: successCount,
			ErrorCount:   errorCount,
		},
	}

	// Handle output modes
	if *dryRun {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")

		if *outputFile != "" {
			// Expand ~ to home directory
			outPath := *outputFile
			if strings.HasPrefix(outPath, "~/") {
				home, err := os.UserHomeDir()
				if err == nil {
					outPath = home + outPath[1:]
				}
			}

			f, err := os.Create(outPath)
			if err != nil {
				slog.Error("failed to create output file", "error", err, "path", outPath)
				os.Exit(1)
			}
			defer f.Close()
			enc = json.NewEncoder(f)
			enc.SetIndent("", "  ")
		}

		if err := enc.Encode(output); err != nil {
			slog.Error("failed to encode JSON", "error", err)
			os.Exit(1)
		}

		if *outputFile != "" {
			// Show expanded path in log
			outPath := *outputFile
			if strings.HasPrefix(outPath, "~/") {
				if home, err := os.UserHomeDir(); err == nil {
					outPath = home + outPath[1:]
				}
			}
			slog.Info("output written to file", "file", outPath)
		}
		slog.Info("dry-run complete", "success", successCount, "errors", errorCount)
		return
	}

	// Write to Firestore
	created := 0
	skipped := 0

	for _, v := range outputVideos {
		if v.Error != nil {
			slog.Warn("skipping video with error", "videoId", v.VideoID, "error", *v.Error)
			continue
		}

		// Check for duplicate
		exists, err := assetURLExists(ctx, fs, v.URL)
		if err != nil {
			slog.Error("failed to check for duplicate", "url", v.URL, "error", err)
			continue
		}
		if exists {
			slog.Info("skipping duplicate", "title", v.Original.Title, "url", v.URL)
			skipped++
			continue
		}

		// Determine discipline
		finalDisciplineID := *disciplineID
		if finalDisciplineID == "" && v.Enriched != nil && v.Enriched.SuggestedDiscipline != "" {
			// Try to find existing discipline matching suggestion
			suggested := v.Enriched.SuggestedDiscipline
			for _, d := range existingDisciplines {
				if strings.EqualFold(d, suggested) || strings.EqualFold(slugify(d), slugify(suggested)) {
					finalDisciplineID = slugify(d)
					break
				}
			}
			if finalDisciplineID == "" {
				slog.Warn("suggested discipline not found, skipping", "suggested", suggested, "videoId", v.VideoID)
				continue
			}
		}

		if finalDisciplineID == "" {
			slog.Warn("no discipline specified and none suggested, skipping", "videoId", v.VideoID)
			continue
		}

		// Auto-create tags if enabled
		tagIDs := []string{}
		if *createTags && v.Enriched != nil {
			for _, tagName := range v.Enriched.SuggestedTags {
				tagID, err := findOrCreateTag(ctx, fs, finalDisciplineID, *ownerUID, tagName)
				if err != nil {
					slog.Warn("failed to find/create tag", "tag", tagName, "error", err)
					continue
				}
				tagIDs = append(tagIDs, tagID)
			}
		}

		// Determine final values
		title := v.Original.Title
		description := truncate(v.Original.Description, 500)
		originator := v.Original.ChannelTitle
		finalVideoType := *videoType

		if v.Enriched != nil {
			if v.Enriched.Title != "" {
				title = v.Enriched.Title
			}
			if v.Enriched.Description != "" {
				description = v.Enriched.Description
			}
			if len(v.Enriched.Authors) > 0 {
				// Use first author as originator, or join all for display
				originator = strings.Join(v.Enriched.Authors, ", ")
			}
			if finalVideoType == "" && v.Enriched.VideoType != "" {
				finalVideoType = v.Enriched.VideoType
			}
		}

		// Build asset document
		now := time.Now()
		asset := map[string]interface{}{
			"url":          v.URL,
			"title":        title,
			"description":  description,
			"type":         string(model.AssetTypeVideo),
			"originator":   originator,
			"thumbnailUrl": v.Original.ThumbnailURL,
			"disciplineId": finalDisciplineID,
			"ownerUid":     *ownerUID,
			"techniqueIds": []string{},
			"tagIds":       tagIDs,
			"duration":     v.Original.Duration,
			"createdAt":    now,
			"updatedAt":    now,
		}

		if finalVideoType != "" {
			asset["videoType"] = finalVideoType
		}

		ref, _, err := fs.Collection("assets").Add(ctx, asset)
		if err != nil {
			slog.Error("failed to create asset", "title", title, "error", err)
			continue
		}
		slog.Info("created asset", "id", ref.ID, "title", title)
		created++
	}

	slog.Info("import complete", "created", created, "skipped", skipped, "errors", errorCount)
}

// fetchPlaylistVideos fetches all videos from a YouTube playlist
func fetchPlaylistVideos(ctx context.Context, apiKey, playlistID string) ([]*VideoInput, error) {
	svc, err := youtube.NewService(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("creating youtube service: %w", err)
	}

	var videos []*VideoInput
	pageToken := ""

	for {
		call := svc.PlaylistItems.List([]string{"snippet", "contentDetails"}).
			PlaylistId(playlistID).
			MaxResults(50).
			PageToken(pageToken)

		resp, err := call.Do()
		if err != nil {
			// Check for common errors
			errStr := err.Error()
			if strings.Contains(errStr, "playlistNotFound") {
				return nil, fmt.Errorf("playlist not found - make sure the playlist exists and is public (not private). Playlist ID: %s", playlistID)
			}
			if strings.Contains(errStr, "403") {
				return nil, fmt.Errorf("access denied - check your YOUTUBE_API_KEY is valid and has YouTube Data API v3 enabled")
			}
			return nil, fmt.Errorf("fetching playlist page: %w", err)
		}

		for _, item := range resp.Items {
			videoID := item.ContentDetails.VideoId
			if videoID == "" {
				continue
			}

			thumbnail := ""
			if item.Snippet.Thumbnails != nil {
				if item.Snippet.Thumbnails.High != nil {
					thumbnail = item.Snippet.Thumbnails.High.Url
				} else if item.Snippet.Thumbnails.Default != nil {
					thumbnail = item.Snippet.Thumbnails.Default.Url
				}
			}

			videos = append(videos, &VideoInput{
				VideoID:      videoID,
				Title:        item.Snippet.Title,
				Description:  item.Snippet.Description,
				ChannelTitle: item.Snippet.ChannelTitle,
				ThumbnailURL: thumbnail,
				URL:          fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
			})
		}

		slog.Info("fetched playlist page", "items", len(resp.Items), "totalSoFar", len(videos))

		if resp.NextPageToken == "" {
			break
		}
		pageToken = resp.NextPageToken
	}

	// Enrich with duration
	if err := enrichWithDuration(ctx, apiKey, videos); err != nil {
		return nil, err
	}

	return videos, nil
}

// fetchSingleVideo fetches metadata for a single video URL
func fetchSingleVideo(ctx context.Context, apiKey, videoURL string) (*VideoInput, error) {
	videoID := extractVideoID(videoURL)
	if videoID == "" {
		return nil, fmt.Errorf("could not extract video ID from URL: %s", videoURL)
	}

	svc, err := youtube.NewService(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("creating youtube service: %w", err)
	}

	call := svc.Videos.List([]string{"snippet", "contentDetails"}).Id(videoID)
	resp, err := call.Do()
	if err != nil {
		return nil, fmt.Errorf("fetching video: %w", err)
	}

	if len(resp.Items) == 0 {
		return nil, fmt.Errorf("video not found: %s", videoID)
	}

	item := resp.Items[0]
	thumbnail := ""
	if item.Snippet.Thumbnails != nil {
		if item.Snippet.Thumbnails.High != nil {
			thumbnail = item.Snippet.Thumbnails.High.Url
		} else if item.Snippet.Thumbnails.Default != nil {
			thumbnail = item.Snippet.Thumbnails.Default.Url
		}
	}

	return &VideoInput{
		VideoID:      videoID,
		Title:        item.Snippet.Title,
		Description:  item.Snippet.Description,
		ChannelTitle: item.Snippet.ChannelTitle,
		ThumbnailURL: thumbnail,
		Duration:     item.ContentDetails.Duration,
		URL:          fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
	}, nil
}

// enrichWithDuration adds duration info to videos
func enrichWithDuration(ctx context.Context, apiKey string, videos []*VideoInput) error {
	svc, err := youtube.NewService(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return fmt.Errorf("creating youtube service: %w", err)
	}

	for i := 0; i < len(videos); i += 50 {
		end := i + 50
		if end > len(videos) {
			end = len(videos)
		}

		batch := videos[i:end]
		ids := make([]string, len(batch))
		for j, v := range batch {
			ids[j] = v.VideoID
		}

		call := svc.Videos.List([]string{"contentDetails"}).Id(strings.Join(ids, ","))
		resp, err := call.Do()
		if err != nil {
			return fmt.Errorf("fetching video details: %w", err)
		}

		durationMap := make(map[string]string)
		for _, item := range resp.Items {
			durationMap[item.Id] = item.ContentDetails.Duration
		}

		for _, v := range batch {
			if d, ok := durationMap[v.VideoID]; ok {
				v.Duration = d
			}
		}
	}

	return nil
}

// processVideos processes videos with LLM enrichment
func processVideos(
	videos []*VideoInput,
	llmClient LLMClient,
	disciplines []string,
	tags []string,
	concurrency int,
) []OutputVideo {
	results := make([]OutputVideo, len(videos))
	var wg sync.WaitGroup
	semaphore := make(chan struct{}, concurrency)

	for i, video := range videos {
		wg.Add(1)
		go func(idx int, v *VideoInput) {
			defer wg.Done()
			semaphore <- struct{}{}
			defer func() { <-semaphore }()

			slog.Info("enriching video", "index", idx+1, "total", len(videos), "title", v.Title)

			enriched, err := EnrichVideo(v, llmClient, disciplines, tags)
			if err != nil {
				errStr := err.Error()
				results[idx] = OutputVideo{
					VideoID:  v.VideoID,
					URL:      v.URL,
					Original: v,
					Error:    &errStr,
				}
				slog.Warn("enrichment failed", "videoId", v.VideoID, "error", err)
				return
			}

			results[idx] = OutputVideo{
				VideoID:  v.VideoID,
				URL:      v.URL,
				Original: v,
				Enriched: enriched,
			}

			slog.Info("enriched video", "videoId", v.VideoID, "suggestedDiscipline", enriched.SuggestedDiscipline)
		}(i, video)
	}

	wg.Wait()
	return results
}

// fetchExistingDisciplines gets all discipline slugs from Firestore
func fetchExistingDisciplines(ctx context.Context, fs *firestore.Client) ([]string, error) {
	iter := fs.Collection("disciplines").Documents(ctx)
	defer iter.Stop()

	var disciplines []string
	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}
		if slug, ok := doc.Data()["slug"].(string); ok {
			disciplines = append(disciplines, slug)
		}
	}
	return disciplines, nil
}

// fetchExistingTags gets all tag names from Firestore (optionally filtered by discipline)
func fetchExistingTags(ctx context.Context, fs *firestore.Client, disciplineID string) ([]string, error) {
	query := fs.Collection("tags").Query
	if disciplineID != "" {
		query = fs.Collection("tags").Where("disciplineId", "==", disciplineID)
	}

	iter := query.Documents(ctx)
	defer iter.Stop()

	var tags []string
	for {
		doc, err := iter.Next()
		if err != nil {
			break
		}
		if name, ok := doc.Data()["name"].(string); ok {
			tags = append(tags, name)
		}
	}
	return tags, nil
}

// findOrCreateTag finds an existing tag or creates a new one
func findOrCreateTag(ctx context.Context, fs *firestore.Client, disciplineID, ownerUID, tagName string) (string, error) {
	slug := slugify(tagName)

	// Try to find existing tag
	iter := fs.Collection("tags").
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
	ref, _, err := fs.Collection("tags").Add(ctx, map[string]interface{}{
		"name":         tagName,
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

	slog.Info("created tag", "id", ref.ID, "name", tagName)
	return ref.ID, nil
}

// assetURLExists checks if an asset with the given URL already exists
func assetURLExists(ctx context.Context, fs *firestore.Client, url string) (bool, error) {
	iter := fs.Collection("assets").Where("url", "==", url).Limit(1).Documents(ctx)
	defer iter.Stop()

	_, err := iter.Next()
	if err != nil {
		return false, nil
	}
	return true, nil
}

// extractVideoID extracts the video ID from various YouTube URL formats
func extractVideoID(url string) string {
	patterns := []string{
		`(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/)([a-zA-Z0-9_-]{11})`,
	}

	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(url); len(matches) > 1 {
			return matches[1]
		}
	}

	return ""
}

// slugify converts a string to a URL-friendly slug
func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	// Remove multiple consecutive hyphens
	re := regexp.MustCompile(`-+`)
	s = re.ReplaceAllString(s, "-")
	// Remove leading/trailing hyphens
	s = strings.Trim(s, "-")
	return s
}

// truncate truncates a string to maxLen characters
func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
