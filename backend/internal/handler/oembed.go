package handler

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"regexp"
	"time"

	"github.com/thomas/skillhive-api/internal/model"
)

var youtubeURLRegex = regexp.MustCompile(
	`^https?://(www\.)?(youtube\.com/(watch\?v=|shorts/|embed/)|youtu\.be/)[\w-]+`,
)

type OEmbedHandler struct{}

func NewOEmbedHandler() *OEmbedHandler {
	return &OEmbedHandler{}
}

func (h *OEmbedHandler) ResolveYouTube(w http.ResponseWriter, r *http.Request) {
	var req struct {
		URL string `json:"url"`
	}
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	if req.URL == "" {
		writeError(w, http.StatusBadRequest, "url is required")
		return
	}

	// SSRF protection: validate YouTube URL
	if !youtubeURLRegex.MatchString(req.URL) {
		writeError(w, http.StatusBadRequest, "only YouTube URLs are supported")
		return
	}

	oembedURL := fmt.Sprintf(
		"https://www.youtube.com/oembed?url=%s&format=json",
		url.QueryEscape(req.URL),
	)

	client := &http.Client{
		Timeout: 5 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Only allow redirects to YouTube domains
			if req.URL.Host != "www.youtube.com" && req.URL.Host != "youtube.com" {
				return fmt.Errorf("redirect to non-YouTube host blocked")
			}
			return nil
		},
	}

	resp, err := client.Get(oembedURL)
	if err != nil {
		slog.Error("oEmbed request failed", "url", req.URL, "error", err)
		writeError(w, http.StatusBadGateway, "failed to fetch video metadata")
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		writeError(w, http.StatusBadGateway, fmt.Sprintf("YouTube returned status %d", resp.StatusCode))
		return
	}

	var oembed model.OEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&oembed); err != nil {
		slog.Error("failed to decode oEmbed response", "error", err)
		writeError(w, http.StatusBadGateway, "failed to parse video metadata")
		return
	}

	writeJSON(w, http.StatusOK, oembed)
}
