package enrich

import (
	"fmt"
	"strings"
)

// EntityContext holds existing entity data for the enrichment prompt.
type EntityContext struct {
	Disciplines []string            // discipline slugs
	Tags        []NameSlugPair      // existing tags
	Techniques  []NameSlugPair      // existing techniques
	Categories  []CategoryHierarchy // existing categories with hierarchy
}

// NameSlugPair holds a name and slug for an entity.
type NameSlugPair struct {
	Name string
	Slug string
}

// CategoryHierarchy holds a category with its parent path.
type CategoryHierarchy struct {
	Name     string
	Slug     string
	ParentID string
	Path     string // e.g., "Positions > Guard > Half Guard"
}

// BuildEnrichmentPrompt builds the prompt for LLM enrichment with entity context.
func BuildEnrichmentPrompt(
	title string,
	description string,
	channelTitle string,
	transcript string,
	entities *EntityContext,
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
	disciplinesSection := `**Existing Disciplines:** None defined yet. Suggest an appropriate discipline name (lowercase, hyphenated).`
	if entities != nil && len(entities.Disciplines) > 0 {
		disciplinesList := strings.Join(entities.Disciplines, ", ")
		disciplinesSection = fmt.Sprintf(`**Existing Disciplines:** %s
Prefer using one of these existing disciplines if applicable.`, disciplinesList)
	}

	// Build tags section
	tagsSection := `**Existing Tags:** None defined yet. Suggest relevant tags (lowercase, hyphenated).`
	if entities != nil && len(entities.Tags) > 0 {
		limitedTags := entities.Tags
		if len(limitedTags) > 30 {
			limitedTags = limitedTags[:30]
		}
		parts := make([]string, len(limitedTags))
		for i, t := range limitedTags {
			parts[i] = fmt.Sprintf("%s (%s)", t.Name, t.Slug)
		}
		tagsList := strings.Join(parts, ", ")
		tagsSection = fmt.Sprintf(`**Existing Tags:** %s
Prefer using existing tag slugs when applicable. You may suggest new tags if needed.`, tagsList)
	}

	// Build techniques section
	techniquesSection := ""
	if entities != nil && len(entities.Techniques) > 0 {
		limitedTech := entities.Techniques
		if len(limitedTech) > 50 {
			limitedTech = limitedTech[:50]
		}
		parts := make([]string, len(limitedTech))
		for i, t := range limitedTech {
			parts[i] = fmt.Sprintf("%s (%s)", t.Name, t.Slug)
		}
		techList := strings.Join(parts, ", ")
		techniquesSection = fmt.Sprintf(`
**Existing Techniques:** %s
Map to existing technique slugs when the video teaches or demonstrates these techniques. Suggest new technique names for techniques not in the list.`, techList)
	}

	// Build categories section
	categoriesSection := ""
	if entities != nil && len(entities.Categories) > 0 {
		limitedCat := entities.Categories
		if len(limitedCat) > 30 {
			limitedCat = limitedCat[:30]
		}
		parts := make([]string, len(limitedCat))
		for i, c := range limitedCat {
			if c.Path != "" {
				parts[i] = fmt.Sprintf("%s (%s) [path: %s]", c.Name, c.Slug, c.Path)
			} else {
				parts[i] = fmt.Sprintf("%s (%s)", c.Name, c.Slug)
			}
		}
		catList := strings.Join(parts, ", ")
		categoriesSection = fmt.Sprintf(`
**Existing Categories:** %s
Assign the most relevant existing category slugs. Do NOT create new categories.`, catList)
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
%s
%s

## Your Task

Analyze the video content (especially the transcript if available) and generate the following metadata in JSON format:

1. **title**: A clear, descriptive title optimized for training context (keep original if already good)
2. **description**: A 2-3 sentence summary explaining what students will learn. USE THE TRANSCRIPT to create an accurate summary.
3. **suggestedDiscipline**: The most appropriate discipline for this content
4. **suggestedTags**: 3-5 relevant tag slugs (use existing slugs when possible, or suggest new lowercase-hyphenated ones)
5. **authors**: Array of instructor names. Check the transcript for introductions. NEVER use the channel/playlist owner name. Return empty array [] if unknown.
6. **purposeSummary**: A brief explanation of the training value
7. **videoType**: One of: "short" (under 3 min), "full" (3-20 min), "instructional" (detailed breakdown), "seminar" (long-form)
8. **positions**: Array of positions involved (lowercase-hyphenated)
9. **techniqueType**: Array from: "attack", "escape", "sweep", "reversal", "pass", "takedown", "defense", "transition", "drill", "concept", "setup"
10. **classification**: Array from: "offense", "defense"
11. **matchedTechniques**: Array of existing technique SLUGS that this video teaches or demonstrates
12. **newTechniques**: Array of NEW technique NAMES for techniques not in the existing list
13. **matchedCategories**: Array of existing category SLUGS that best classify this video

## Output Format

Respond with ONLY a valid JSON object (no markdown, no explanation):

{
  "title": "...",
  "description": "...",
  "suggestedDiscipline": "...",
  "suggestedTags": ["slug1", "slug2"],
  "authors": ["..."],
  "purposeSummary": "...",
  "videoType": "...",
  "positions": ["..."],
  "techniqueType": ["..."],
  "classification": ["..."],
  "matchedTechniques": ["existing-slug-1"],
  "newTechniques": ["New Technique Name"],
  "matchedCategories": ["existing-category-slug"]
}`,
		title,
		channelTitle,
		desc,
		transcriptSection,
		disciplinesSection,
		tagsSection,
		techniquesSection,
		categoriesSection,
	)
}
