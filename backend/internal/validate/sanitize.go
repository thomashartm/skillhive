package validate

import (
	"html"
	"strings"

	"github.com/microcosm-cc/bluemonday"
)

var (
	strictPolicy   = bluemonday.StrictPolicy()
	markdownPolicy = bluemonday.UGCPolicy()
)

// StripAllHTML removes all HTML tags from the input and returns plain text.
// bluemonday escapes its output (' becomes &#39;), so unescape it: callers store
// plain text and the frontend escapes or sanitizes it when rendering.
func StripAllHTML(input string) string {
	return strings.TrimSpace(html.UnescapeString(strictPolicy.Sanitize(input)))
}

// SanitizeMarkdown allows safe markdown HTML (links, emphasis, etc).
func SanitizeMarkdown(input string) string {
	return strings.TrimSpace(markdownPolicy.Sanitize(input))
}
