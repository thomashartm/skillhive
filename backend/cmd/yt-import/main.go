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
	"github.com/thomas/skillhive-api/internal/model"
	"github.com/thomas/skillhive-api/internal/store"
	"google.golang.org/api/option"
	"google.golang.org/api/youtube/v3"
)

type playlistVideo struct {
	VideoID      string `json:"videoId"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	ChannelTitle string `json:"channelTitle"`
	ThumbnailURL string `json:"thumbnailUrl"`
	Position     int64  `json:"position"`
	Duration     string `json:"duration"`
	URL          string `json:"url"`
}

func main() {
	playlistID := flag.String("playlist", "", "YouTube playlist ID (required)")
	disciplineID := flag.String("discipline", "", "Discipline ID to associate assets with (required)")
	ownerUID := flag.String("owner-uid", "system", "Owner UID for created assets")
	dryRun := flag.Bool("dry-run", false, "Print JSON output without writing to Firestore")
	videoType := flag.String("video-type", "", "Optional video type: short, full, instructional, seminar")
	flag.Parse()

	if *playlistID == "" || *disciplineID == "" {
		fmt.Fprintln(os.Stderr, "Usage: yt-import --playlist <ID> --discipline <ID> [--owner-uid <UID>] [--dry-run] [--video-type <type>]")
		flag.PrintDefaults()
		os.Exit(1)
	}

	if *videoType != "" {
		valid := map[string]bool{"short": true, "full": true, "instructional": true, "seminar": true}
		if !valid[*videoType] {
			fmt.Fprintf(os.Stderr, "Invalid --video-type %q. Must be one of: short, full, instructional, seminar\n", *videoType)
			os.Exit(1)
		}
	}

	cfg := config.Load()
	apiKey := os.Getenv("YOUTUBE_API_KEY")
	if apiKey == "" {
		slog.Error("YOUTUBE_API_KEY environment variable is required")
		os.Exit(1)
	}

	ctx := context.Background()

	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()

	fs := clients.Firestore

	// Validate discipline exists
	discDoc, err := fs.Collection("disciplines").Doc(*disciplineID).Get(ctx)
	if err != nil || !discDoc.Exists() {
		slog.Error("discipline not found in Firestore", "disciplineId", *disciplineID)
		os.Exit(1)
	}
	slog.Info("discipline validated", "disciplineId", *disciplineID)

	// Fetch playlist items
	videos, err := fetchPlaylistItems(ctx, apiKey, *playlistID)
	if err != nil {
		slog.Error("failed to fetch playlist items", "error", err)
		os.Exit(1)
	}
	slog.Info("fetched playlist items", "count", len(videos))

	if len(videos) == 0 {
		slog.Info("no videos found in playlist")
		return
	}

	// Enrich with duration
	if err := enrichWithDuration(ctx, apiKey, videos); err != nil {
		slog.Error("failed to enrich videos with duration", "error", err)
		os.Exit(1)
	}

	// Dry-run: print JSON and exit
	if *dryRun {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		if err := enc.Encode(videos); err != nil {
			slog.Error("failed to encode JSON", "error", err)
			os.Exit(1)
		}
		slog.Info("dry-run complete", "count", len(videos))
		return
	}

	// Import to Firestore
	created := 0
	skipped := 0
	for _, v := range videos {
		exists, err := assetURLExists(ctx, fs, v.URL)
		if err != nil {
			slog.Error("failed to check for duplicate", "url", v.URL, "error", err)
			continue
		}
		if exists {
			slog.Info("skipping duplicate", "title", v.Title, "url", v.URL)
			skipped++
			continue
		}

		now := time.Now()
		asset := map[string]interface{}{
			"url":          v.URL,
			"title":        v.Title,
			"description":  truncate(v.Description, 500),
			"type":         string(model.AssetTypeVideo),
			"originator":   v.ChannelTitle,
			"thumbnailUrl": v.ThumbnailURL,
			"disciplineId": *disciplineID,
			"ownerUid":     *ownerUID,
			"techniqueIds": []string{},
			"tagIds":       []string{},
			"duration":     v.Duration,
			"createdAt":    now,
			"updatedAt":    now,
		}

		if *videoType != "" {
			asset["videoType"] = *videoType
		}

		ref, _, err := fs.Collection("assets").Add(ctx, asset)
		if err != nil {
			slog.Error("failed to create asset", "title", v.Title, "error", err)
			continue
		}
		slog.Info("created asset", "id", ref.ID, "title", v.Title)
		created++
	}

	slog.Info("import complete", "created", created, "skipped", skipped, "total", len(videos))
}

func fetchPlaylistItems(ctx context.Context, apiKey, playlistID string) ([]*playlistVideo, error) {
	svc, err := youtube.NewService(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("creating youtube service: %w", err)
	}

	var videos []*playlistVideo
	pageToken := ""

	for {
		call := svc.PlaylistItems.List([]string{"snippet", "contentDetails"}).
			PlaylistId(playlistID).
			MaxResults(50).
			PageToken(pageToken)

		resp, err := call.Do()
		if err != nil {
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

			videos = append(videos, &playlistVideo{
				VideoID:      videoID,
				Title:        item.Snippet.Title,
				Description:  item.Snippet.Description,
				ChannelTitle: item.Snippet.ChannelTitle,
				ThumbnailURL: thumbnail,
				Position:     int64(item.Snippet.Position),
				URL:          fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
			})
		}

		slog.Info("fetched page", "items", len(resp.Items), "totalSoFar", len(videos))

		if resp.NextPageToken == "" {
			break
		}
		pageToken = resp.NextPageToken
	}

	return videos, nil
}

func enrichWithDuration(ctx context.Context, apiKey string, videos []*playlistVideo) error {
	svc, err := youtube.NewService(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return fmt.Errorf("creating youtube service: %w", err)
	}

	// Batch video IDs in groups of 50
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

		call := svc.Videos.List([]string{"contentDetails"}).
			Id(strings.Join(ids, ","))

		resp, err := call.Do()
		if err != nil {
			return fmt.Errorf("fetching video details: %w", err)
		}

		// Build lookup map
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

func assetURLExists(ctx context.Context, fs *firestore.Client, url string) (bool, error) {
	iter := fs.Collection("assets").Where("url", "==", url).Limit(1).Documents(ctx)
	defer iter.Stop()

	_, err := iter.Next()
	if err != nil {
		// iterator.Done means no results found
		return false, nil
	}
	return true, nil
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen]
}
