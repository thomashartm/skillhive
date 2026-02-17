package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"regexp"
	"strings"
)

// EnrichmentPrompt builds the prompt for LLM enrichment
func BuildEnrichmentPrompt(
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
		// Limit to avoid prompt bloat
		limitedTags := existingTags
		if len(existingTags) > 30 {
			limitedTags = existingTags[:30]
		}
		tagsList := strings.Join(limitedTags, ", ")
		tagsSection = fmt.Sprintf(`**Existing Tags:** %s
Prefer using existing tags when applicable. You may suggest new tags if needed.`, tagsList)
	}

	// Handle empty description
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
8. **positions**: Array of BJJ/grappling positions involved. Examples: "mount", "guard", "side-control", "back", "knee-on-belly", "turtle", "half-guard", "butterfly-guard", "closed-guard", "open-guard", "standing", "north-south", "scarf-hold", "z-guard", "de-la-riva", "spider-guard", "lasso-guard", "x-guard"
9. **techniqueType**: Array of technique types shown. Can include multiple: "attack" (submission), "escape" (getting out of bad position), "sweep" (reversing from bottom to top), "reversal" (countering opponent's move), "pass" (passing opponent's guard), "takedown" (taking opponent to ground), "defense" (preventing attack), "transition" (moving between positions), "drill" (training exercise), "concept" (theory/principles), "setup" (creating opportunities)
10. **classification**: Array that can include: "offense" (attacking/advancing position) and/or "defense" (escaping/preventing). Many techniques involve both.

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

// LLMEnrichmentResult is the parsed result from LLM
type LLMEnrichmentResult struct {
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
}

// ParseLLMResponse parses the LLM response to extract JSON
func ParseLLMResponse(response string) (*LLMEnrichmentResult, error) {
	response = strings.TrimSpace(response)

	// Try direct JSON parse
	var result LLMEnrichmentResult
	if err := json.Unmarshal([]byte(response), &result); err == nil {
		return normalizeResult(&result), nil
	}

	// Try to extract JSON from markdown code block
	codeBlockRegex := regexp.MustCompile("```(?:json)?\\s*([\\s\\S]*?)```")
	if matches := codeBlockRegex.FindStringSubmatch(response); len(matches) > 1 {
		if err := json.Unmarshal([]byte(strings.TrimSpace(matches[1])), &result); err == nil {
			return normalizeResult(&result), nil
		}
	}

	// Try to find JSON object in the response
	jsonRegex := regexp.MustCompile(`\{[\s\S]*\}`)
	if match := jsonRegex.FindString(response); match != "" {
		if err := json.Unmarshal([]byte(match), &result); err == nil {
			return normalizeResult(&result), nil
		}
	}

	return nil, fmt.Errorf("could not parse JSON from LLM response: %s", truncateForError(response))
}

// normalizeResult normalizes the enrichment result
func normalizeResult(result *LLMEnrichmentResult) *LLMEnrichmentResult {
	// Normalize discipline (lowercase, hyphenated)
	result.SuggestedDiscipline = slugify(result.SuggestedDiscipline)

	// Normalize tags
	normalizedTags := make([]string, 0, len(result.SuggestedTags))
	for _, tag := range result.SuggestedTags {
		normalized := slugify(tag)
		if normalized != "" {
			normalizedTags = append(normalizedTags, normalized)
		}
	}
	result.SuggestedTags = normalizedTags

	// Normalize positions
	normalizedPositions := make([]string, 0, len(result.Positions))
	for _, pos := range result.Positions {
		normalized := slugify(pos)
		if normalized != "" {
			normalizedPositions = append(normalizedPositions, normalized)
		}
	}
	result.Positions = normalizedPositions

	// Validate video type
	validVideoTypes := map[string]bool{
		"short":         true,
		"full":          true,
		"instructional": true,
		"seminar":       true,
	}
	if !validVideoTypes[result.VideoType] {
		result.VideoType = "full"
	}

	// Validate technique types
	validTechniqueTypes := map[string]bool{
		"attack":     true,
		"escape":     true,
		"sweep":      true,
		"reversal":   true,
		"pass":       true,
		"takedown":   true,
		"defense":    true,
		"transition": true,
		"drill":      true,
		"concept":    true,
		"setup":      true,
	}
	normalizedTechTypes := make([]string, 0, len(result.TechniqueType))
	for _, tt := range result.TechniqueType {
		normalized := slugify(tt)
		if validTechniqueTypes[normalized] {
			normalizedTechTypes = append(normalizedTechTypes, normalized)
		}
	}
	result.TechniqueType = normalizedTechTypes

	// Validate classifications
	validClassifications := map[string]bool{
		"offense": true,
		"defense": true,
	}
	normalizedClassifications := make([]string, 0, len(result.Classification))
	for _, c := range result.Classification {
		normalized := strings.ToLower(strings.TrimSpace(c))
		if validClassifications[normalized] {
			normalizedClassifications = append(normalizedClassifications, normalized)
		}
	}
	result.Classification = normalizedClassifications

	return result
}

// truncateForError truncates a string for error messages
func truncateForError(s string) string {
	if len(s) > 200 {
		return s[:200] + "..."
	}
	return s
}

// EnrichVideo enriches a single video with transcript and LLM analysis
func EnrichVideo(
	video *VideoInput,
	llmClient LLMClient,
	existingDisciplines []string,
	existingTags []string,
) (*EnrichedData, error) {
	// Get transcript
	transcript, transcriptAvailable, err := GetTranscript(video.VideoID)
	if err != nil {
		// Log but continue without transcript
		transcript = ""
		transcriptAvailable = false
	}

	if transcriptAvailable {
		slog.Info("transcript available", "videoId", video.VideoID, "length", len(transcript))
	}

	// Build prompt
	prompt := BuildEnrichmentPrompt(
		video.Title,
		video.Description,
		video.ChannelTitle,
		transcript,
		existingDisciplines,
		existingTags,
	)

	// Call LLM
	response, err := llmClient.Generate(prompt)
	if err != nil {
		return nil, fmt.Errorf("LLM generation failed: %w", err)
	}

	// Parse response
	parsed, err := ParseLLMResponse(response)
	if err != nil {
		return nil, err
	}

	// Build enriched data
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

	// Fall back to original title if LLM returned empty
	if enriched.Title == "" {
		enriched.Title = video.Title
	}
	// Do NOT fall back to channel name for authors - leave empty if not identified

	return enriched, nil
}
