package validate

import (
	"regexp"
	"strings"
)

var (
	nonAlphanumeric = regexp.MustCompile(`[^\w\s-]`)
	whitespace      = regexp.MustCompile(`\s+`)
	multipleHyphens = regexp.MustCompile(`-+`)
	leadingHyphens  = regexp.MustCompile(`^-+`)
	trailingHyphens = regexp.MustCompile(`-+$`)
)

// GenerateSlug creates a URL-friendly slug from a string.
// Ported from packages/shared/src/utils/slug.ts
func GenerateSlug(text string) string {
	s := strings.ToLower(strings.TrimSpace(text))
	s = nonAlphanumeric.ReplaceAllString(s, "")
	s = whitespace.ReplaceAllString(s, "-")
	s = multipleHyphens.ReplaceAllString(s, "-")
	s = leadingHyphens.ReplaceAllString(s, "")
	s = trailingHyphens.ReplaceAllString(s, "")
	return s
}
