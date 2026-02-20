package main

import (
	"fmt"
	"log/slog"
	"strings"

	"github.com/thomas/skillhive-api/internal/enrich"
	"github.com/thomas/skillhive-api/internal/llm"
	"github.com/thomas/skillhive-api/internal/youtube"
)

// EnrichedData is the LLM-generated enrichment result for CLI output.
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

// BuildCLIEnrichmentPrompt builds the prompt for CLI batch enrichment.
// This is a simpler version of the server prompt that does not include
// technique/category matching context.
func BuildCLIEnrichmentPrompt(
	title string,
	description string,
	channelTitle string,
	transcript string,
	existingDisciplines []string,
	existingTags []string,
) string {
	// Build transcript section
	transcriptSection := "**Transcript:** Not available. Analyze based on title and description only."
	if transcript != "" {
		transcriptSection = fmt.Sprintf(`**Transcript (use this for summarization and extracting instructor names):**
%s

IMPORTANT: Use the transcript to:
- Create an accurate description/summary of what is taught
- Identify the instructor's name if they introduce themselves
- Understand the specific techniques and positions demonstrated`, transcript)
	}

	// Build disciplines section
	disciplinesSection := `**Existing Disciplines:** None defined yet. Suggest an appropriate discipline name (lowercase, hyphenated, e.g., "brazilian-jiu-jitsu", "muay-thai").`
	if len(existingDisciplines) > 0 {
		disciplinesList := strings.Join(existingDisciplines, ", ")
		disciplinesSection = fmt.Sprintf(`**Existing Disciplines:** %s
Prefer using one of these existing disciplines if applicable. You may suggest a new discipline if none fit.`, disciplinesList)
	}

	// Build tags section
	tagsSection := `**Existing Tags:** None defined yet. Suggest relevant tags (lowercase, hyphenated, e.g., "guard-passing", "beginner", "competition").`
	if len(existingTags) > 0 {
		limitedTags := existingTags
		if len(existingTags) > 30 {
			limitedTags = existingTags[:30]
		}
		tagsList := strings.Join(limitedTags, ", ")
		tagsSection = fmt.Sprintf(`**Existing Tags:** %s
Prefer using existing tags when applicable. You may suggest new tags if needed.`, tagsList)
	}

	desc := description
	if desc == "" {
		desc = "(No description provided)"
	}

	return fmt.Sprintf(`You are analyzing a training video for SkillHive, a skill development platform focused on martial arts and physical training disciplines.

Your task is to extract and generate structured metadata that will help students find and understand this training content.

## Video Information

**Title:** %s
**Channel (playlist owner, NOT the instructor):** %s
**Description:**
%s

%s

## Context

%s

%s

## Your Task

Analyze the video content (especially the transcript if available) and generate the following metadata in JSON format:

1. **title**: A clear, descriptive title optimized for training context (keep original if already good)
2. **description**: A 2-3 sentence summary explaining what students will learn. USE THE TRANSCRIPT to create an accurate summary of the actual content taught.
3. **suggestedDiscipline**: The most appropriate discipline for this content
4. **suggestedTags**: 3-5 relevant tags that describe the techniques, level, or concepts covered
5. **authors**: Array of instructor names. Check the transcript for introductions like "Hi, I'm [Name]" or "My name is [Name]". Also check the title and description. There may be multiple instructors. NEVER use the channel/playlist owner name. Return empty array [] if no instructors can be identified.
6. **purposeSummary**: A brief explanation of the training value and what skills this develops
7. **videoType**: One of: "short" (under 3 min, single concept), "full" (3-20 min, complete lesson), "instructional" (detailed breakdown), "seminar" (long-form, multiple topics)
8. **positions**: Array of BJJ/grappling positions involved (lowercase, hyphenated)
9. **techniqueType**: Array of technique types shown. Can include multiple: "attack", "escape", "sweep", "reversal", "pass", "takedown", "defense", "transition", "drill", "concept", "setup"
10. **classification**: Array that can include: "offense" and/or "defense"

## Output Format

Respond with ONLY a valid JSON object (no markdown, no explanation):

{
  "title": "...",
  "description": "...",
  "suggestedDiscipline": "...",
  "suggestedTags": ["...", "...", "..."],
  "authors": ["...", "..."],
  "purposeSummary": "...",
  "videoType": "...",
  "positions": ["...", "..."],
  "techniqueType": ["...", "..."],
  "classification": ["..."]
}`,
		title,
		channelTitle,
		desc,
		transcriptSection,
		disciplinesSection,
		tagsSection,
	)
}

// EnrichVideo enriches a single video with transcript and LLM analysis.
func EnrichVideo(
	video *youtube.VideoMetadata,
	llmClient llm.Client,
	existingDisciplines []string,
	existingTags []string,
) (*EnrichedData, error) {
	// Get transcript using shared package
	transcript, transcriptAvailable, err := youtube.GetTranscript(video.VideoID)
	if err != nil {
		transcript = ""
		transcriptAvailable = false
	}

	if transcriptAvailable {
		slog.Info("transcript available", "videoId", video.VideoID, "length", len(transcript))
	}

	// Build prompt (CLI-specific version)
	prompt := BuildCLIEnrichmentPrompt(
		video.Title,
		video.Description,
		video.ChannelTitle,
		transcript,
		existingDisciplines,
		existingTags,
	)

	// Call LLM using shared client
	response, err := llmClient.Generate(prompt)
	if err != nil {
		return nil, fmt.Errorf("LLM generation failed: %w", err)
	}

	// Parse response using shared parser
	parsed, err := enrich.ParseLLMResponse(response)
	if err != nil {
		return nil, err
	}

	// Build CLI-specific enriched data
	enriched := &EnrichedData{
		Title:               parsed.Title,
		Description:         parsed.Description,
		SuggestedDiscipline: parsed.SuggestedDiscipline,
		SuggestedTags:       parsed.SuggestedTags,
		Authors:             parsed.Authors,
		PurposeSummary:      parsed.PurposeSummary,
		VideoType:           parsed.VideoType,
		Positions:           parsed.Positions,
		TechniqueType:       parsed.TechniqueType,
		Classification:      parsed.Classification,
		TranscriptAvailable: transcriptAvailable,
	}

	if enriched.Title == "" {
		enriched.Title = video.Title
	}

	return enriched, nil
}
