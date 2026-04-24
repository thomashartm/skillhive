package cleanup

import (
	"encoding/json"
	"fmt"
	"strings"
)

// ParseResponse parses Gemini's raw JSON response into an LLMResponse.
// It tolerates markdown code fences (```json ... ```) since models sometimes
// ignore the "no markdown" directive.
func ParseResponse(raw string) (*LLMResponse, error) {
	clean := stripFences(raw)
	var resp LLMResponse
	if err := json.Unmarshal([]byte(clean), &resp); err != nil {
		return nil, fmt.Errorf("parse: %w", err)
	}
	for i, a := range resp.Actions {
		if a.Action != ActionUpdate && a.Action != ActionDelete {
			return nil, fmt.Errorf("unknown action %q at index %d", a.Action, i)
		}
	}
	return &resp, nil
}

func stripFences(s string) string {
	s = strings.TrimSpace(s)
	if strings.HasPrefix(s, "```") {
		// remove opening fence (```json or ```)
		if i := strings.Index(s, "\n"); i >= 0 {
			s = s[i+1:]
		}
		s = strings.TrimSuffix(strings.TrimSpace(s), "```")
	}
	return strings.TrimSpace(s)
}
