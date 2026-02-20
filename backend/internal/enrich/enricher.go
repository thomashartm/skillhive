package enrich

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

// EnrichmentResult is the parsed result from LLM enrichment.
type EnrichmentResult struct {
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
	// Extended fields for entity matching
	MatchedTechniques []string `json:"matchedTechniques"`
	NewTechniques     []string `json:"newTechniques"`
	MatchedCategories []string `json:"matchedCategories"`
}

// ParseLLMResponse parses the LLM response to extract JSON.
func ParseLLMResponse(response string) (*EnrichmentResult, error) {
	response = strings.TrimSpace(response)

	// Try direct JSON parse
	var result EnrichmentResult
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

// normalizeResult normalizes the enrichment result.
func normalizeResult(result *EnrichmentResult) *EnrichmentResult {
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

	// Normalize matched techniques/categories slugs
	normalizedMatchedTech := make([]string, 0, len(result.MatchedTechniques))
	for _, t := range result.MatchedTechniques {
		if s := slugify(t); s != "" {
			normalizedMatchedTech = append(normalizedMatchedTech, s)
		}
	}
	result.MatchedTechniques = normalizedMatchedTech

	normalizedMatchedCat := make([]string, 0, len(result.MatchedCategories))
	for _, c := range result.MatchedCategories {
		if s := slugify(c); s != "" {
			normalizedMatchedCat = append(normalizedMatchedCat, s)
		}
	}
	result.MatchedCategories = normalizedMatchedCat

	return result
}

// slugify converts a string to a URL-friendly slug.
func slugify(s string) string {
	s = strings.ToLower(s)
	s = strings.ReplaceAll(s, " ", "-")
	s = strings.ReplaceAll(s, "_", "-")
	re := regexp.MustCompile(`-+`)
	s = re.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	return s
}

// truncateForError truncates a string for error messages.
func truncateForError(s string) string {
	if len(s) > 200 {
		return s[:200] + "..."
	}
	return s
}
