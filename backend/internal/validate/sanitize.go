package validate

import (
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

var (
	strictPolicy   = bluemonday.StrictPolicy()
	markdownPolicy = bluemonday.UGCPolicy()
)

// StripAllHTML removes all HTML tags from the input.
func StripAllHTML(input string) string {
	return strings.TrimSpace(strictPolicy.Sanitize(input))
}

// SanitizeMarkdown allows safe markdown HTML (links, emphasis, etc).
func SanitizeMarkdown(input string) string {
	return strings.TrimSpace(markdownPolicy.Sanitize(input))
}
