# yt-enrich

CLI tool for enriching YouTube video metadata with AI-generated training content for SkillHive.

## Overview

`yt-enrich` fetches videos from YouTube playlists or individual URLs, extracts transcripts, and uses an LLM (Ollama or Google Gemini) to generate structured metadata for the SkillHive training platform.

## Features

- Fetch videos from YouTube playlists or individual URLs
- Extract transcripts automatically using yt-dlp (most reliable) with fallback to internal API
- Generate enriched metadata via LLM:
  - Refined title and description
  - Suggested discipline and tags
  - Author identification (instructors only, not channel owners)
  - Training purpose summary
  - Video type classification
  - Positions involved (for grappling content)
  - Technique types and classifications
- Output to JSON or directly to Firestore
- Support for both Ollama (local) and Gemini (cloud) LLMs
- Concurrent video processing

## Prerequisites

- Go 1.21+
- YouTube Data API key
- Ollama running locally OR Gemini API key
- Firebase credentials (for Firestore writes)
- **yt-dlp** (recommended for reliable transcript extraction)

### Installing yt-dlp

yt-dlp is the recommended method for transcript extraction as it handles YouTube's anti-bot measures reliably.

```bash
# macOS (Homebrew)
brew install yt-dlp

# Linux (pip)
pip install yt-dlp

# Or download binary directly
# https://github.com/yt-dlp/yt-dlp/releases
```

If yt-dlp is not installed, the tool falls back to YouTube's internal timedtext API, which may have limited success.

## Installation

```bash
cd backend
go build -o bin/yt-enrich ./cmd/yt-enrich
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `YOUTUBE_API_KEY` | Yes | YouTube Data API v3 key |
| `GEMINI_API_KEY` | If using Gemini | Google AI Studio API key |
| `OLLAMA_HOST` | No | Ollama server URL (default: `http://localhost:11434`) |
| `FIREBASE_KEY_PATH` | For DB writes | Path to Firebase service account JSON |
| `GCP_PROJECT` | For DB writes | Google Cloud project ID |

## Usage

### Process a Playlist with Ollama

```bash
yt-enrich --playlist PLxxxxxx --discipline bjj --llm-provider ollama
```

### Process a Single Video with Gemini

```bash
yt-enrich --video "https://youtube.com/watch?v=abc123" --llm-provider gemini
```

### Auto-detect Discipline

Omit `--discipline` to let the LLM suggest one based on content:

```bash
yt-enrich --playlist PLxxxxxx --llm-provider ollama
```

### Dry Run (output JSON only)

```bash
yt-enrich --playlist PLxxxxxx --dry-run
```

### Save to File

```bash
yt-enrich --playlist PLxxxxxx --output enriched.json
```

### Auto-create Suggested Tags

```bash
yt-enrich --playlist PLxxxxxx --discipline jkd --create-tags
```

## CLI Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--playlist` | - | YouTube playlist ID |
| `--video` | - | Single YouTube video URL |
| `--discipline` | - | Target discipline ID (optional, LLM auto-detects if omitted) |
| `--llm-provider` | `ollama` | LLM provider: `ollama` or `gemini` |
| `--model` | auto | Model name (e.g., `llama3.2`, `gemini-2.0-flash`) |
| `--owner-uid` | `system` | Owner UID for created assets |
| `--video-type` | - | Override video type classification |
| `--create-tags` | `false` | Auto-create suggested tags in Firestore |
| `--dry-run` | `false` | Print JSON without writing to database |
| `--output` | - | Write JSON to file (implies dry-run) |
| `--concurrency` | `3` | Number of videos to process in parallel |
| `--verbose` | `false` | Enable debug logging (shows transcript fetch attempts, LLM prompts, etc.) |

## Output Format

### Enriched Video JSON

```json
{
  "videos": [
    {
      "videoId": "abc123",
      "url": "https://youtube.com/watch?v=abc123",
      "original": {
        "title": "Original Video Title",
        "description": "Original description...",
        "channelTitle": "Channel Name",
        "duration": "PT5M30S",
        "thumbnailUrl": "https://i.ytimg.com/vi/abc123/hqdefault.jpg"
      },
      "enriched": {
        "title": "Refined Training Title",
        "description": "Concise training-focused description",
        "suggestedDiscipline": "bjj",
        "suggestedTags": ["guard-passing", "fundamentals"],
        "author": "Instructor Name",
        "purposeSummary": "Learn the key concepts of...",
        "videoType": "instructional",
        "transcriptAvailable": true
      }
    }
  ],
  "metadata": {
    "processedAt": "2024-01-15T10:30:00Z",
    "llmProvider": "ollama",
    "model": "llama3.2",
    "totalVideos": 10,
    "successCount": 9,
    "errorCount": 1
  }
}
```

## Architecture

```
+-------------------------------------+
|         yt-enrich (Go CLI)          |
|  - YouTube Data API integration     |
|  - Transcript extraction            |
|  - LLM client (Ollama/Gemini)       |
|  - Firestore writes                 |
|  - Concurrent processing            |
+-------------------------------------+
```

Single binary with no external dependencies (no Python, no Node.js).

## Development

### Project Structure

```
backend/cmd/yt-enrich/
├── README.md           # This file
├── main.go             # CLI entry point and orchestration
├── transcript.go       # YouTube transcript extraction
├── llm.go              # Ollama and Gemini LLM clients
├── enricher.go         # Prompt building and response parsing
└── testdata/           # Sample data for testing
```

### Run Locally with Ollama

```bash
# Start Ollama (if not running)
ollama serve

# Pull a model
ollama pull llama3.2

# Run enrichment
export YOUTUBE_API_KEY="your-key"
./bin/yt-enrich --video "https://youtube.com/watch?v=VIDEO_ID" --dry-run
```

### Run with Gemini

```bash
export YOUTUBE_API_KEY="your-key"
export GEMINI_API_KEY="your-gemini-key"
./bin/yt-enrich --video "https://youtube.com/watch?v=VIDEO_ID" --llm-provider gemini --dry-run
```

## Transcript Handling

The tool extracts transcripts using multiple methods in order of reliability:

1. **yt-dlp** (recommended) - Most reliable, handles YouTube's anti-bot measures
2. **Internal YouTube API** - Parses transcript data from video page
3. **timedtext API** - Direct caption track fetching (may return empty responses)

When a video has no available transcript:

1. Processing continues with metadata only (title, description, channel)
2. Output marks `transcriptAvailable: false`
3. The LLM generates enrichment based on available metadata

This ensures the import process is not blocked by missing transcripts.

### Supported Subtitle Formats

The tool can parse multiple subtitle formats:
- **VTT** (WebVTT) - Standard web subtitle format
- **srv3/XML** - YouTube's XML-based format
- **JSON3** - YouTube's JSON caption format

## Future Enhancements

- [ ] Instagram video support
- [ ] Facebook video support
- [ ] Batch import from CSV/JSON file
- [ ] Interactive mode for reviewing LLM suggestions
- [ ] Caching layer for transcripts
- [ ] Resume interrupted imports

## Troubleshooting

### "No transcript available"

Some videos have disabled captions or are live streams. The tool continues with metadata-only enrichment and marks `transcriptAvailable: false`.

### "Ollama connection refused"

Ensure Ollama is running:

```bash
ollama serve
```

### "playlist not found"

The playlist must be **public** or **unlisted**. Private playlists cannot be accessed with an API key. Either:
- Make the playlist public/unlisted in YouTube Studio
- Use `--video` with individual video URLs instead

### "Invalid discipline"

When using `--discipline`, the discipline ID must exist in Firestore. Either:
- Create the discipline first via the SkillHive API
- Omit `--discipline` to let the LLM suggest one

### "YOUTUBE_API_KEY not set"

Export the environment variable:

```bash
export YOUTUBE_API_KEY="your-youtube-api-key"
```

Get an API key from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials).

### "GEMINI_API_KEY not set"

When using `--llm-provider gemini`, export the Gemini API key:

```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### "Rate limit exceeded"

YouTube API has quota limits. Use `--concurrency 1` to slow down requests, or wait for quota reset.

### "yt-dlp not found in PATH"

Install yt-dlp for reliable transcript extraction:

```bash
# macOS
brew install yt-dlp

# Linux/Windows
pip install yt-dlp
```

The tool will fall back to internal API methods if yt-dlp is unavailable, but transcript success rate may be lower.

### Transcripts returning empty

If transcripts consistently fail, this is usually due to YouTube blocking automated requests. Solutions:

1. **Install yt-dlp** - Most reliable method
2. **Use `--verbose`** - See which transcript method is being attempted
3. **Check video captions** - Ensure the video has captions enabled (some videos disable them)
