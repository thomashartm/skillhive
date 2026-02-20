package youtube

import (
	"context"
	"fmt"
	"regexp"
	"strings"

	"google.golang.org/api/option"
	ytapi "google.golang.org/api/youtube/v3"
)

// VideoMetadata holds YouTube video metadata fetched from the API.
type VideoMetadata struct {
	VideoID      string `json:"videoId"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	ChannelTitle string `json:"channelTitle"`
	Duration     string `json:"duration"`
	ThumbnailURL string `json:"thumbnailUrl"`
	URL          string `json:"url"`
}

var youtubeURLRegex = regexp.MustCompile(
	`^https?://(www\.)?(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[\w-]+`,
)

// IsYouTubeURL checks if the given URL is a YouTube video URL.
func IsYouTubeURL(url string) bool {
	return youtubeURLRegex.MatchString(url)
}

// ExtractVideoID extracts the video ID from various YouTube URL formats.
func ExtractVideoID(url string) string {
	patterns := []string{
		`(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/|youtube\.com/v/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})`,
	}
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		if matches := re.FindStringSubmatch(url); len(matches) > 1 {
			return matches[1]
		}
	}
	return ""
}

// FetchVideoMetadata fetches metadata for a single YouTube video.
func FetchVideoMetadata(ctx context.Context, apiKey, videoURL string) (*VideoMetadata, error) {
	videoID := ExtractVideoID(videoURL)
	if videoID == "" {
		return nil, fmt.Errorf("could not extract video ID from URL: %s", videoURL)
	}

	svc, err := ytapi.NewService(ctx, option.WithAPIKey(apiKey))
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

	return &VideoMetadata{
		VideoID:      videoID,
		Title:        item.Snippet.Title,
		Description:  item.Snippet.Description,
		ChannelTitle: item.Snippet.ChannelTitle,
		ThumbnailURL: thumbnail,
		Duration:     item.ContentDetails.Duration,
		URL:          fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
	}, nil
}

// FetchPlaylistVideos fetches all videos from a YouTube playlist.
func FetchPlaylistVideos(ctx context.Context, apiKey, playlistID string) ([]*VideoMetadata, error) {
	svc, err := ytapi.NewService(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		return nil, fmt.Errorf("creating youtube service: %w", err)
	}

	var videos []*VideoMetadata
	pageToken := ""

	for {
		call := svc.PlaylistItems.List([]string{"snippet", "contentDetails"}).
			PlaylistId(playlistID).
			MaxResults(50).
			PageToken(pageToken)

		resp, err := call.Do()
		if err != nil {
			errStr := err.Error()
			if strings.Contains(errStr, "playlistNotFound") {
				return nil, fmt.Errorf("playlist not found - make sure the playlist exists and is public. Playlist ID: %s", playlistID)
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

			videos = append(videos, &VideoMetadata{
				VideoID:      videoID,
				Title:        item.Snippet.Title,
				Description:  item.Snippet.Description,
				ChannelTitle: item.Snippet.ChannelTitle,
				ThumbnailURL: thumbnail,
				URL:          fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID),
			})
		}

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

// enrichWithDuration adds duration info to videos via the Videos API.
func enrichWithDuration(ctx context.Context, apiKey string, videos []*VideoMetadata) error {
	svc, err := ytapi.NewService(ctx, option.WithAPIKey(apiKey))
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
