package validate

import "testing"

func TestStripAllHTML(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"apostrophe kept", "Dive under the opponent's hips", "Dive under the opponent's hips"},
		{"quotes and ampersand kept", `"Knee shield" & frames`, `"Knee shield" & frames`},
		{"comparison kept", "1 < 2 > 0", "1 < 2 > 0"},
		{"tags removed", "<b>Bold</b> <script>alert(1)</script>text", "Bold text"},
		{"stored entity normalized", "opponent&#39;s", "opponent's"},
		{"whitespace trimmed", "  padded  ", "padded"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := StripAllHTML(tt.input); got != tt.want {
				t.Errorf("StripAllHTML(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
