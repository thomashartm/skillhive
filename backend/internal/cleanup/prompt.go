package cleanup

import (
	"encoding/json"
	"fmt"
	"strings"
)

// BuildPrompt composes the full Gemini prompt: admin template body +
// serialized input records + required response schema.
//
// For categories, each record has `parentId` (nullable). For techniques,
// each record has `categoryIds` (array). The response schema mirrors that
// shape on its `after` payloads.
func BuildPrompt(entityType EntityType, tmpl *Template, records []RecordSnapshot) string {
	recordsJSON := serializeRecords(entityType, records)
	schema := outputSchema(entityType)

	var b strings.Builder
	b.WriteString(strings.TrimSpace(tmpl.PromptBody))
	b.WriteString("\n\nINPUT RECORDS (JSON):\n")
	b.WriteString(recordsJSON)
	b.WriteString("\n\nRespond ONLY with valid JSON in this exact shape — no markdown, no prose:\n")
	b.WriteString(schema)
	return b.String()
}

func serializeRecords(entityType EntityType, records []RecordSnapshot) string {
	items := make([]map[string]any, 0, len(records))
	for _, r := range records {
		item := map[string]any{
			"id":          r.ID,
			"name":        r.Name,
			"slug":        r.Slug,
			"description": r.Description,
		}
		switch entityType {
		case EntityCategory:
			if r.ParentID == nil {
				item["parentId"] = nil
			} else {
				item["parentId"] = *r.ParentID
			}
		case EntityTechnique:
			if r.CategoryIDs == nil {
				item["categoryIds"] = []string{}
			} else {
				item["categoryIds"] = r.CategoryIDs
			}
		}
		items = append(items, item)
	}
	out, _ := json.MarshalIndent(items, "", "  ")
	return string(out)
}

func outputSchema(entityType EntityType) string {
	afterCategory := `{ "name": "...", "slug": "...", "description": "...", "parentId": "<existing id or null>" }`
	afterTechnique := `{ "name": "...", "slug": "...", "description": "...", "categoryIds": ["<existing id>", "..."] }`

	afterShape := afterCategory
	if entityType == EntityTechnique {
		afterShape = afterTechnique
	}

	return fmt.Sprintf(`{
  "actions": [
    {
      "action":    "update",
      "id":        "<existing input id>",
      "after":     %s,
      "rationale": "..."
    },
    {
      "action":    "delete",
      "id":        "<existing input id>",
      "mergeInto": "<another id from the input>",
      "rationale": "..."
    }
  ]
}`, afterShape)
}
