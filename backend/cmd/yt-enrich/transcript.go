package main

import (
	"bytes"
	"encoding/json"
	"encoding/xml"
	"fmt"
	"html"
	"io"
	"log/slog"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"os/exec"
	"regexp"
	"strings"
	"time"
)

// TranscriptSegment represents a single caption segment
type TranscriptSegment struct {
	Text     string  `xml:",chardata"`
	Start    float64 `xml:"start,attr"`
	Duration float64 `xml:"dur,attr"`
}

// TranscriptXML represents the XML response from YouTube's timedtext API
type TranscriptXML struct {
	XMLName  xml.Name            `xml:"transcript"`
	Segments []TranscriptSegment `xml:"text"`
}

// CaptionTrackName can be a string or an object with simpleText
type CaptionTrackName struct {
	SimpleText string `json:"simpleText"`
}

// CaptionTrack represents available caption tracks
type CaptionTrack struct {
	BaseURL      string          `json:"baseUrl"`
	LanguageCode string          `json:"languageCode"`
	Kind         string          `json:"kind"` // "asr" for auto-generated
	Name         json.RawMessage `json:"name"` // Can be string or object
	VssID        string          `json:"vssId"`
}

// GetName extracts the name as a string
func (c *CaptionTrack) GetName() string {
	// Try to unmarshal as a simple string first
	var nameStr string
	if err := json.Unmarshal(c.Name, &nameStr); err == nil {
		return nameStr
	}

	// Try as an object with simpleText
	var nameObj CaptionTrackName
	if err := json.Unmarshal(c.Name, &nameObj); err == nil {
		return nameObj.SimpleText
	}

	return ""
}

// MaxTranscriptLength is the maximum transcript length to send to LLM
const MaxTranscriptLength = 12000

// GetTranscript fetches the transcript for a YouTube video
// Returns (transcript text, available, error)
func GetTranscript(videoID string) (string, bool, error) {
	// Try yt-dlp first (most reliable)
	transcript, err := fetchTranscriptViaYtDlp(videoID)
	if err == nil && transcript != "" {
		if len(transcript) > MaxTranscriptLength {
			transcript = transcript[:MaxTranscriptLength] + "..."
			slog.Debug("transcript truncated", "videoId", videoID, "length", MaxTranscriptLength)
		}
		slog.Info("transcript fetched via yt-dlp", "videoId", videoID, "length", len(transcript))
		return transcript, true, nil
	}
	slog.Debug("yt-dlp failed, trying internal API", "videoId", videoID, "error", err)

	// Try the internal YouTube API
	transcript, err = fetchTranscriptViaInternalAPI(videoID)
	if err == nil && transcript != "" {
		if len(transcript) > MaxTranscriptLength {
			transcript = transcript[:MaxTranscriptLength] + "..."
			slog.Debug("transcript truncated", "videoId", videoID, "length", MaxTranscriptLength)
		}
		slog.Info("transcript fetched successfully", "videoId", videoID, "length", len(transcript))
		return transcript, true, nil
	}
	slog.Debug("internal API failed, trying timedtext API", "videoId", videoID, "error", err)

	// Fall back to timedtext API
	tracks, err := getCaptionTracks(videoID)
	if err != nil {
		slog.Debug("no caption tracks found", "videoId", videoID, "error", err)
		return "", false, nil
	}

	if len(tracks) == 0 {
		slog.Debug("empty caption tracks", "videoId", videoID)
		return "", false, nil
	}

	slog.Debug("found caption tracks", "videoId", videoID, "count", len(tracks))

	// Prefer English, then auto-generated English, then any available
	var selectedTrack *CaptionTrack
	for i := range tracks {
		track := &tracks[i]
		if strings.HasPrefix(track.LanguageCode, "en") && track.Kind != "asr" {
			selectedTrack = track
			slog.Debug("selected manual English track", "videoId", videoID, "lang", track.LanguageCode)
			break
		}
	}
	if selectedTrack == nil {
		for i := range tracks {
			track := &tracks[i]
			if strings.HasPrefix(track.LanguageCode, "en") {
				selectedTrack = track
				slog.Debug("selected auto-generated English track", "videoId", videoID, "lang", track.LanguageCode, "kind", track.Kind)
				break
			}
		}
	}
	if selectedTrack == nil {
		selectedTrack = &tracks[0]
		slog.Debug("selected first available track", "videoId", videoID, "lang", selectedTrack.LanguageCode)
	}

	// Fetch the transcript
	transcript, err = fetchTranscriptFromURL(selectedTrack.BaseURL)
	if err != nil {
		slog.Debug("failed to fetch transcript from URL", "videoId", videoID, "error", err)
		return "", false, nil
	}

	// Truncate if too long
	if len(transcript) > MaxTranscriptLength {
		transcript = transcript[:MaxTranscriptLength] + "..."
		slog.Debug("transcript truncated", "videoId", videoID, "length", MaxTranscriptLength)
	}

	slog.Info("transcript fetched successfully", "videoId", videoID, "length", len(transcript))
	return transcript, true, nil
}

// fetchTranscriptViaInternalAPI uses YouTube's internal API to get transcripts
func fetchTranscriptViaInternalAPI(videoID string) (string, error) {
	// First, get the video page to extract necessary params
	videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)

	req, err := http.NewRequest("GET", videoURL, nil)
	if err != nil {
		return "", err
	}

	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	// Use shared client to maintain cookies
	resp, err := httpClientWithCookies.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	pageContent := string(body)

	// Extract serialized share entity for transcript request
	// Look for the params needed for transcript API
	paramsRegex := regexp.MustCompile(`"serializedShareEntity"\s*:\s*"([^"]+)"`)
	paramsMatch := paramsRegex.FindStringSubmatch(pageContent)

	// Also try to find captions in ytInitialPlayerResponse directly
	// Look for playerCaptionsTracklistRenderer
	transcriptRegex := regexp.MustCompile(`"playerCaptionsTracklistRenderer"\s*:\s*(\{[^}]+(?:\{[^}]*\}[^}]*)*\})`)
	transcriptMatch := transcriptRegex.FindStringSubmatch(pageContent)

	if transcriptMatch == nil && paramsMatch == nil {
		// Try extracting transcript segments directly from initial data
		return extractTranscriptFromPage(pageContent, videoID)
	}

	// If we found caption renderer, try to get transcript URL and fetch it
	if transcriptMatch != nil {
		slog.Debug("found playerCaptionsTracklistRenderer", "videoId", videoID)
	}

	return extractTranscriptFromPage(pageContent, videoID)
}

// extractTranscriptFromPage tries to extract transcript data directly from the page
func extractTranscriptFromPage(pageContent string, videoID string) (string, error) {
	// Check if transcript-related content exists
	hasTranscript := strings.Contains(pageContent, "transcript")
	hasCaptions := strings.Contains(pageContent, "captions")
	slog.Debug("page content check", "videoId", videoID, "hasTranscript", hasTranscript, "hasCaptions", hasCaptions, "pageLen", len(pageContent))

	// Try to find transcript cue groups
	cueGroupRegex := regexp.MustCompile(`"transcriptCueGroupRenderer"\s*:\s*\{[^}]*"cues"\s*:\s*\[((?:[^\[\]]|\[[^\]]*\])*)\]`)
	matches := cueGroupRegex.FindAllStringSubmatch(pageContent, -1)

	slog.Debug("cueGroupRenderer matches", "videoId", videoID, "count", len(matches))

	if len(matches) > 0 {
		var allText []string
		for _, match := range matches {
			cueTextRegex := regexp.MustCompile(`"simpleText"\s*:\s*"([^"]*)"`)
			textMatches := cueTextRegex.FindAllStringSubmatch(match[1], -1)
			for _, tm := range textMatches {
				text := tm[1]
				text = strings.ReplaceAll(text, `\n`, " ")
				text = strings.ReplaceAll(text, `\"`, `"`)
				text = strings.TrimSpace(text)
				if text != "" {
					allText = append(allText, text)
				}
			}
		}
		if len(allText) > 0 {
			return strings.Join(allText, " "), nil
		}
	}

	// Alternative: look for transcript segments
	segmentRegex := regexp.MustCompile(`"transcriptSegmentRenderer"\s*:\s*\{[^}]*"snippet"\s*:\s*\{[^}]*"text"\s*:\s*"([^"]*)"`)
	segmentMatches := segmentRegex.FindAllStringSubmatch(pageContent, -1)

	slog.Debug("segmentRenderer matches", "videoId", videoID, "count", len(segmentMatches))

	if len(segmentMatches) > 0 {
		var allText []string
		for _, match := range segmentMatches {
			text := match[1]
			text = strings.ReplaceAll(text, `\n`, " ")
			text = strings.ReplaceAll(text, `\"`, `"`)
			text = strings.TrimSpace(text)
			if text != "" {
				allText = append(allText, text)
			}
		}
		if len(allText) > 0 {
			return strings.Join(allText, " "), nil
		}
	}

	// Try yet another format - look for timedtext in the page data
	// The transcript might be loaded via AJAX, so we need to check if there's an endpoint
	if strings.Contains(pageContent, `"playerCaptionsTracklistRenderer"`) {
		slog.Debug("found playerCaptionsTracklistRenderer but no inline transcript", "videoId", videoID)
	}

	return "", fmt.Errorf("no transcript found in page content")
}

// httpClientWithCookies is a shared client for maintaining session
var httpClientWithCookies *http.Client

func init() {
	jar, _ := cookiejar.New(nil)
	httpClientWithCookies = &http.Client{
		Timeout: 30 * time.Second,
		Jar:     jar,
	}
}

// fetchTranscriptViaYtDlp uses yt-dlp to fetch subtitles for a video
// This is the most reliable method as yt-dlp handles YouTube's anti-bot measures
func fetchTranscriptViaYtDlp(videoID string) (string, error) {
	// Check if yt-dlp is available
	_, err := exec.LookPath("yt-dlp")
	if err != nil {
		return "", fmt.Errorf("yt-dlp not found in PATH: %w", err)
	}

	videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)

	// Use yt-dlp to write subtitles to stdout
	// --write-auto-sub: include auto-generated subtitles
	// --sub-lang en: prefer English
	// --skip-download: don't download the video
	// --sub-format vtt: use VTT format (easier to parse)
	// -o -: output to stdout (for subtitle filename template, we use a temp approach)
	cmd := exec.Command("yt-dlp",
		"--write-sub",
		"--write-auto-sub",
		"--sub-lang", "en",
		"--sub-format", "vtt",
		"--skip-download",
		"--print", "%(subtitles)j",
		videoURL,
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Debug("running yt-dlp for subtitles", "videoId", videoID)

	err = cmd.Run()
	if err != nil {
		slog.Debug("yt-dlp command failed", "videoId", videoID, "error", err, "stderr", stderr.String())
		// yt-dlp may fail but still output useful info, try alternate approach
		return fetchTranscriptViaYtDlpDirect(videoID)
	}

	output := stdout.String()
	slog.Debug("yt-dlp subtitles output", "videoId", videoID, "length", len(output), "preview", truncateForLog(output, 500))

	// The output is JSON with subtitle info, but not the actual text
	// We need to use a different approach: download subs to temp file
	return fetchTranscriptViaYtDlpDirect(videoID)
}

// fetchTranscriptViaYtDlpDirect downloads subtitles to a temp location and reads them
func fetchTranscriptViaYtDlpDirect(videoID string) (string, error) {
	videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)

	// Use yt-dlp to get the subtitle content directly using --print-to-file won't work
	// Instead, we'll use --dump-json to get subtitle URLs and fetch them
	cmd := exec.Command("yt-dlp",
		"--dump-json",
		"--skip-download",
		videoURL,
	)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	slog.Debug("running yt-dlp --dump-json", "videoId", videoID)

	err := cmd.Run()
	if err != nil {
		slog.Debug("yt-dlp dump-json failed", "videoId", videoID, "error", err, "stderr", stderr.String())
		return "", fmt.Errorf("yt-dlp failed: %w", err)
	}

	// Parse the JSON output to find subtitle URLs
	var videoInfo struct {
		Subtitles         map[string][]SubtitleFormat `json:"subtitles"`
		AutomaticCaptions map[string][]SubtitleFormat `json:"automatic_captions"`
	}

	if err := json.Unmarshal(stdout.Bytes(), &videoInfo); err != nil {
		slog.Debug("failed to parse yt-dlp JSON", "videoId", videoID, "error", err)
		return "", fmt.Errorf("failed to parse yt-dlp output: %w", err)
	}

	// Look for English subtitles (prefer manual over auto)
	var subtitleURL string
	var subtitleExt string

	// Check manual subtitles first
	for _, lang := range []string{"en", "en-US", "en-GB"} {
		if formats, ok := videoInfo.Subtitles[lang]; ok && len(formats) > 0 {
			// Prefer vtt or srv3 format
			for _, f := range formats {
				if f.Ext == "vtt" || f.Ext == "srv3" || f.Ext == "json3" {
					subtitleURL = f.URL
					subtitleExt = f.Ext
					slog.Debug("found manual subtitle", "videoId", videoID, "lang", lang, "ext", f.Ext)
					break
				}
			}
			if subtitleURL != "" {
				break
			}
			// Fall back to first available format
			subtitleURL = formats[0].URL
			subtitleExt = formats[0].Ext
			break
		}
	}

	// Check auto-generated captions if no manual subs
	if subtitleURL == "" {
		for _, lang := range []string{"en", "en-US", "en-GB", "en-orig"} {
			if formats, ok := videoInfo.AutomaticCaptions[lang]; ok && len(formats) > 0 {
				// Prefer vtt or srv3 format
				for _, f := range formats {
					if f.Ext == "vtt" || f.Ext == "srv3" || f.Ext == "json3" {
						subtitleURL = f.URL
						subtitleExt = f.Ext
						slog.Debug("found auto caption", "videoId", videoID, "lang", lang, "ext", f.Ext)
						break
					}
				}
				if subtitleURL != "" {
					break
				}
				// Fall back to first available format
				subtitleURL = formats[0].URL
				subtitleExt = formats[0].Ext
				break
			}
		}
	}

	if subtitleURL == "" {
		slog.Debug("no subtitles found via yt-dlp", "videoId", videoID,
			"manualLangs", len(videoInfo.Subtitles),
			"autoLangs", len(videoInfo.AutomaticCaptions))
		return "", fmt.Errorf("no English subtitles available")
	}

	// Fetch the subtitle content
	slog.Debug("fetching subtitle content", "videoId", videoID, "ext", subtitleExt, "url", truncateForLog(subtitleURL, 100))

	resp, err := http.Get(subtitleURL)
	if err != nil {
		return "", fmt.Errorf("failed to fetch subtitle: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read subtitle: %w", err)
	}

	slog.Debug("subtitle content fetched", "videoId", videoID, "length", len(body))

	// Parse the subtitle content based on format
	content := string(body)

	switch subtitleExt {
	case "vtt":
		return parseVTT(content), nil
	case "srv3", "xml":
		return parseSRV3(content), nil
	case "json3":
		return parseJSON3Format(content)
	default:
		// Try VTT first, then raw text extraction
		if strings.Contains(content, "WEBVTT") {
			return parseVTT(content), nil
		}
		// Just strip any obvious formatting
		return extractPlainText(content), nil
	}
}

// SubtitleFormat represents a subtitle format option from yt-dlp
type SubtitleFormat struct {
	Ext  string `json:"ext"`
	URL  string `json:"url"`
	Name string `json:"name"`
}

// parseVTT extracts plain text from WebVTT format
func parseVTT(content string) string {
	lines := strings.Split(content, "\n")
	var textLines []string

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Skip empty lines, WEBVTT header, timestamps, and metadata
		if line == "" ||
			strings.HasPrefix(line, "WEBVTT") ||
			strings.HasPrefix(line, "Kind:") ||
			strings.HasPrefix(line, "Language:") ||
			strings.HasPrefix(line, "NOTE") ||
			strings.Contains(line, "-->") ||
			isTimestamp(line) {
			continue
		}

		// Remove VTT formatting tags like <c>, </c>, <00:00:00.000>, etc.
		line = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(line, "")
		line = regexp.MustCompile(`\{[^}]+\}`).ReplaceAllString(line, "")

		// Clean up HTML entities
		line = html.UnescapeString(line)
		line = strings.TrimSpace(line)

		if line != "" {
			textLines = append(textLines, line)
		}
	}

	// Join and deduplicate consecutive identical lines (VTT often has dupes)
	var result []string
	var prevLine string
	for _, line := range textLines {
		if line != prevLine {
			result = append(result, line)
			prevLine = line
		}
	}

	return strings.Join(result, " ")
}

// parseSRV3 extracts plain text from srv3/XML format
func parseSRV3(content string) string {
	var transcriptXML TranscriptXML
	if err := xml.Unmarshal([]byte(content), &transcriptXML); err == nil && len(transcriptXML.Segments) > 0 {
		var parts []string
		for _, segment := range transcriptXML.Segments {
			text := strings.TrimSpace(segment.Text)
			text = html.UnescapeString(text)
			text = strings.ReplaceAll(text, "\n", " ")
			if text != "" {
				parts = append(parts, text)
			}
		}
		return strings.Join(parts, " ")
	}

	// Fallback: extract text between tags
	return extractPlainText(content)
}

// extractPlainText removes XML/HTML tags and extracts text
func extractPlainText(content string) string {
	// Remove XML/HTML tags
	content = regexp.MustCompile(`<[^>]+>`).ReplaceAllString(content, " ")
	// Clean up whitespace
	content = regexp.MustCompile(`\s+`).ReplaceAllString(content, " ")
	content = html.UnescapeString(content)
	return strings.TrimSpace(content)
}

// isTimestamp checks if a line is a VTT timestamp or cue identifier
func isTimestamp(line string) bool {
	// Match patterns like "00:00:00.000" or cue identifiers
	matched, _ := regexp.MatchString(`^\d+$|^\d{1,2}:\d{2}`, line)
	return matched
}

// getCaptionTracks extracts available caption tracks from video page
func getCaptionTracks(videoID string) ([]CaptionTrack, error) {
	// Fetch video page
	videoURL := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)

	req, err := http.NewRequest("GET", videoURL, nil)
	if err != nil {
		return nil, err
	}

	// Set headers to look like a browser
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Accept-Language", "en-US,en;q=0.9")
	req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")

	resp, err := httpClientWithCookies.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch video page: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	pageContent := string(body)

	// Extract captions data from the page
	// Look for "captionTracks" in the ytInitialPlayerResponse
	// Use a more robust regex that handles nested brackets
	captionsRegex := regexp.MustCompile(`"captionTracks"\s*:\s*(\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\])`)
	matches := captionsRegex.FindStringSubmatch(pageContent)
	if len(matches) < 2 {
		// Try simpler pattern as fallback
		captionsRegex = regexp.MustCompile(`"captionTracks"\s*:\s*(\[[^\]]+\])`)
		matches = captionsRegex.FindStringSubmatch(pageContent)
		if len(matches) < 2 {
			slog.Debug("no captionTracks found in page", "videoId", videoID)
			return nil, fmt.Errorf("no captions found")
		}
	}

	captionsJSON := matches[1]

	// Fix escaped characters
	captionsJSON = strings.ReplaceAll(captionsJSON, `\"`, `"`)
	captionsJSON = strings.ReplaceAll(captionsJSON, `\\u0026`, `&`)
	captionsJSON = strings.ReplaceAll(captionsJSON, `\u0026`, `&`)

	var tracks []CaptionTrack
	if err := json.Unmarshal([]byte(captionsJSON), &tracks); err != nil {
		return nil, fmt.Errorf("failed to parse captions JSON: %w", err)
	}

	return tracks, nil
}

// fetchTranscriptFromURL fetches and parses transcript from timedtext URL
func fetchTranscriptFromURL(baseURL string) (string, error) {
	// Try different formats: json3 first (most reliable), then srv3, then default
	formats := []string{"json3", "srv3", ""}

	for _, format := range formats {
		u, err := url.Parse(baseURL)
		if err != nil {
			return "", err
		}

		q := u.Query()
		if format != "" {
			q.Set("fmt", format)
		}
		u.RawQuery = q.Encode()

		slog.Debug("fetching transcript", "format", format, "url", u.String())

		req, err := http.NewRequest("GET", u.String(), nil)
		if err != nil {
			slog.Debug("request creation failed", "format", format, "error", err)
			continue
		}

		// Add headers to mimic browser
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "*/*")
		req.Header.Set("Accept-Language", "en-US,en;q=0.9")
		req.Header.Set("Referer", "https://www.youtube.com/")

		// Use shared client with cookies
		resp, err := httpClientWithCookies.Do(req)
		if err != nil {
			slog.Debug("fetch failed", "format", format, "error", err)
			continue
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()

		slog.Debug("transcript response", "format", format, "status", resp.StatusCode, "length", len(body))

		if resp.StatusCode != http.StatusOK {
			slog.Debug("non-200 response", "format", format, "status", resp.StatusCode, "body", truncateForLog(string(body), 200))
			continue
		}

		if len(body) == 0 {
			slog.Debug("empty response", "format", format)
			continue
		}

		slog.Debug("transcript content", "format", format, "preview", truncateForLog(string(body), 500))

		// Try to parse based on format
		if format == "json3" {
			transcript, err := parseJSON3Format(string(body))
			if err == nil && transcript != "" {
				return transcript, nil
			}
			slog.Debug("json3 parse failed", "error", err)
		}

		// Try XML parsing (srv3 format)
		var transcriptXML TranscriptXML
		if err := xml.Unmarshal(body, &transcriptXML); err == nil && len(transcriptXML.Segments) > 0 {
			var parts []string
			for _, segment := range transcriptXML.Segments {
				text := strings.TrimSpace(segment.Text)
				text = html.UnescapeString(text)
				text = strings.ReplaceAll(text, "\n", " ")
				if text != "" {
					parts = append(parts, text)
				}
			}
			if len(parts) > 0 {
				return strings.Join(parts, " "), nil
			}
		}

		// Try alternative JSON format
		transcript, err := parseAlternativeFormat(string(body))
		if err == nil && transcript != "" {
			return transcript, nil
		}
	}

	return "", fmt.Errorf("unable to parse transcript format")
}

// truncateForLog truncates a string for logging
func truncateForLog(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen] + "..."
	}
	return s
}

// parseJSON3Format parses the JSON3 transcript format
func parseJSON3Format(content string) (string, error) {
	// JSON3 format has structure like: {"events":[{"segs":[{"utf8":"text"}]}]}
	var data struct {
		Events []struct {
			Segs []struct {
				UTF8 string `json:"utf8"`
			} `json:"segs"`
		} `json:"events"`
	}

	if err := json.Unmarshal([]byte(content), &data); err != nil {
		return "", err
	}

	var parts []string
	for _, event := range data.Events {
		for _, seg := range event.Segs {
			text := strings.TrimSpace(seg.UTF8)
			if text != "" && text != "\n" {
				parts = append(parts, text)
			}
		}
	}

	if len(parts) == 0 {
		return "", fmt.Errorf("no text found in JSON3 format")
	}

	return strings.Join(parts, " "), nil
}

// parseAlternativeFormat tries to parse alternative transcript formats
func parseAlternativeFormat(content string) (string, error) {
	// Try to extract text from JSON format
	if strings.HasPrefix(strings.TrimSpace(content), "{") {
		var data map[string]interface{}
		if err := json.Unmarshal([]byte(content), &data); err == nil {
			if events, ok := data["events"].([]interface{}); ok {
				var parts []string
				for _, event := range events {
					if e, ok := event.(map[string]interface{}); ok {
						if segs, ok := e["segs"].([]interface{}); ok {
							for _, seg := range segs {
								if s, ok := seg.(map[string]interface{}); ok {
									if text, ok := s["utf8"].(string); ok {
										text = strings.TrimSpace(text)
										if text != "" && text != "\n" {
											parts = append(parts, text)
										}
									}
								}
							}
						}
					}
				}
				return strings.Join(parts, " "), nil
			}
		}
	}

	return "", fmt.Errorf("unable to parse transcript format")
}
