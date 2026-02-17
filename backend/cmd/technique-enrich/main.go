package main

import (
	"bytes"
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"google.golang.org/api/iterator"
)

// Original seeded technique slugs (never delete or re-describe these)
var seededTechniqueSlugs = map[string]bool{
	"scissor-sweep": true, "hip-bump-sweep": true, "armbar-from-guard": true,
	"triangle-choke": true, "rear-naked-choke": true, "americana": true,
	"cross-collar-choke": true, "side-control-escape-shrimp": true,
	"single-leg-takedown": true, "double-leg-takedown": true,
}

type techniqueDoc struct {
	DocID       string
	Name        string
	Slug        string
	Description string
}

type geminiResult struct {
	Name        string `json:"name"`
	IsTechnique bool   `json:"isTechnique"`
	Description string `json:"description"`
}

// --- Gemini REST API types (same as yt-enrich) ---

type geminiRequest struct {
	Contents         []geminiContent         `json:"contents"`
	GenerationConfig *geminiGenerationConfig `json:"generationConfig,omitempty"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiGenerationConfig struct {
	Temperature      float64 `json:"temperature,omitempty"`
	MaxOutputTokens  int     `json:"maxOutputTokens,omitempty"`
	ResponseMimeType string  `json:"responseMimeType,omitempty"`
}

type geminiResponse struct {
	Candidates []geminiCandidate `json:"candidates"`
	Error      *geminiError      `json:"error,omitempty"`
}

type geminiCandidate struct {
	Content geminiContent `json:"content"`
}

type geminiError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

func main() {
	discipline := flag.String("discipline", "bjj", "Discipline ID")
	dryRun := flag.Bool("dry-run", false, "Print what would be changed without writing")
	deleteInvalid := flag.Bool("delete-invalid", false, "Delete techniques that Gemini says are not real techniques")
	cleanupRefs := flag.Bool("cleanup-refs", false, "Clean up stale technique references in assets (no Gemini needed)")
	model := flag.String("model", "gemini-2.0-flash", "Gemini model to use")
	batchSize := flag.Int("batch-size", 25, "Number of techniques per Gemini call")
	flag.Parse()

	// Initialize Firebase for Firestore
	cfg := config.Load()
	ctx := context.Background()
	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()
	fs := clients.Firestore

	// Cleanup stale refs mode - no Gemini needed
	if *cleanupRefs {
		cleanupStaleRefs(ctx, fs, *discipline, *dryRun)
		return
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		slog.Error("GEMINI_API_KEY environment variable is required")
		os.Exit(1)
	}

	// Load all non-seeded techniques
	techniques := loadTechniques(ctx, fs, *discipline)
	slog.Info("loaded techniques", "total", len(techniques))

	if len(techniques) == 0 {
		slog.Info("no techniques to process")
		return
	}

	httpClient := &http.Client{Timeout: 2 * time.Minute}

	// Process in batches
	var validated, invalid, updated, deleted, skipped, errors int
	for i := 0; i < len(techniques); i += *batchSize {
		end := i + *batchSize
		if end > len(techniques) {
			end = len(techniques)
		}
		batch := techniques[i:end]

		batchNum := (i / *batchSize) + 1
		totalBatches := (len(techniques) + *batchSize - 1) / *batchSize
		slog.Info("processing batch", "batch", batchNum, "of", totalBatches, "size", len(batch))

		results, err := enrichBatch(httpClient, apiKey, *model, batch)
		if err != nil {
			slog.Error("failed to enrich batch", "batch", batchNum, "error", err)
			errors += len(batch)
			continue
		}

		// Map results by name (lowered) for matching
		resultMap := make(map[string]geminiResult)
		for _, r := range results {
			resultMap[strings.ToLower(r.Name)] = r
		}

		for _, t := range batch {
			result, ok := resultMap[strings.ToLower(t.Name)]
			if !ok {
				slog.Warn("no Gemini result for technique", "name", t.Name, "slug", t.Slug)
				errors++
				continue
			}

			if result.IsTechnique {
				validated++
				if result.Description == "" {
					skipped++
					continue
				}
				if result.Description == t.Description {
					skipped++
					continue
				}
				if *dryRun {
					fmt.Printf("  VALID [%s] %s\n    NEW: %s\n", t.Slug, t.Name, truncate(result.Description, 120))
				} else {
					_, err := fs.Collection("techniques").Doc(t.DocID).Update(ctx, []firestore.Update{
						{Path: "description", Value: result.Description},
						{Path: "updatedAt", Value: time.Now()},
					})
					if err != nil {
						slog.Error("failed to update technique", "slug", t.Slug, "error", err)
						errors++
					} else {
						updated++
						slog.Info("updated technique", "slug", t.Slug, "description", truncate(result.Description, 80))
					}
				}
			} else {
				invalid++
				if *dryRun {
					fmt.Printf("  INVALID [%s] %s — not a real technique\n", t.Slug, t.Name)
				} else if *deleteInvalid {
					_, err := fs.Collection("techniques").Doc(t.DocID).Delete(ctx)
					if err != nil {
						slog.Error("failed to delete invalid technique", "slug", t.Slug, "error", err)
						errors++
					} else {
						deleted++
						slog.Info("deleted invalid technique", "slug", t.Slug, "name", t.Name)
					}
				} else {
					slog.Warn("invalid technique (not deleted)", "slug", t.Slug, "name", t.Name)
				}
			}
		}

		// Small delay between batches to avoid rate limiting
		if end < len(techniques) {
			time.Sleep(2 * time.Second)
		}
	}

	slog.Info("enrichment complete",
		"validated", validated,
		"invalid", invalid,
		"updated", updated,
		"deleted", deleted,
		"skipped", skipped,
		"errors", errors,
	)
}

func loadTechniques(ctx context.Context, fs *firestore.Client, disciplineID string) []techniqueDoc {
	iter := fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID).
		Where("ownerUid", "==", "system").
		Documents(ctx)

	var result []techniqueDoc
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate techniques", "error", err)
			break
		}

		slug, _ := doc.Data()["slug"].(string)
		if seededTechniqueSlugs[slug] {
			continue
		}

		name, _ := doc.Data()["name"].(string)
		desc, _ := doc.Data()["description"].(string)

		result = append(result, techniqueDoc{
			DocID:       doc.Ref.ID,
			Name:        name,
			Slug:        slug,
			Description: desc,
		})
	}
	return result
}

func enrichBatch(client *http.Client, apiKey, model string, techniques []techniqueDoc) ([]geminiResult, error) {
	// Build the technique list
	names := make([]string, len(techniques))
	for i, t := range techniques {
		names[i] = t.Name
	}
	nameList := strings.Join(names, "\n- ")

	prompt := fmt.Sprintf(`You are a martial arts expert specializing in Brazilian Jiu-Jitsu, Judo, Wrestling, and grappling arts.

For each item in the list below, determine:
1. Is this a real, recognized martial arts technique or position variation? (not a video title, person's name, generic concept, or compound phrase)
2. If yes, write a concise 1-2 sentence generic description of the technique suitable for an encyclopedia entry. Focus on what the technique IS and HOW it works, not who invented it.

Items:
- %s

Respond with a JSON array. Each element must have:
- "name": the exact item name as given
- "isTechnique": true/false
- "description": generic technique description if isTechnique is true, empty string if false

Examples of VALID techniques: "Armbar", "Kimura", "Scissor Sweep", "De La Riva Guard", "Berimbolo"
Examples of INVALID (not techniques): "BJJ Fundamentals Overview", "Saulo Ribeiro Seminar", "Guard Passing Concepts", "Competition Highlights"

Return ONLY the JSON array, no other text.`, nameList)

	reqBody := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
		GenerationConfig: &geminiGenerationConfig{
			Temperature:      0.3,
			MaxOutputTokens:  4096,
			ResponseMimeType: "application/json",
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	url := fmt.Sprintf(
		"https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
		model, apiKey,
	)

	resp, err := client.Post(url, "application/json", bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("calling Gemini API: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Gemini API error (status %d): %s", resp.StatusCode, truncate(string(body), 200))
	}

	var gemResp geminiResponse
	if err := json.Unmarshal(body, &gemResp); err != nil {
		return nil, fmt.Errorf("decoding response: %w", err)
	}

	if gemResp.Error != nil {
		return nil, fmt.Errorf("Gemini error: %s", gemResp.Error.Message)
	}

	if len(gemResp.Candidates) == 0 || len(gemResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	text := gemResp.Candidates[0].Content.Parts[0].Text

	// Parse JSON
	var results []geminiResult
	if err := json.Unmarshal([]byte(text), &results); err != nil {
		// Try to clean up (sometimes wrapped in ```json ... ```)
		cleaned := strings.TrimSpace(text)
		cleaned = strings.TrimPrefix(cleaned, "```json")
		cleaned = strings.TrimPrefix(cleaned, "```")
		cleaned = strings.TrimSuffix(cleaned, "```")
		cleaned = strings.TrimSpace(cleaned)
		if err2 := json.Unmarshal([]byte(cleaned), &results); err2 != nil {
			return nil, fmt.Errorf("failed to parse Gemini JSON: %w\nRaw: %s", err, truncate(text, 300))
		}
	}

	return results, nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// cleanupStaleRefs removes technique IDs from assets that reference non-existent techniques.
func cleanupStaleRefs(ctx context.Context, fs *firestore.Client, disciplineID string, dryRun bool) {
	slog.Info("loading valid technique IDs...")

	// Build set of all existing technique doc IDs
	validTechIDs := make(map[string]bool)
	techIter := fs.Collection("techniques").
		Where("disciplineId", "==", disciplineID).
		Documents(ctx)
	for {
		doc, err := techIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate techniques", "error", err)
			return
		}
		validTechIDs[doc.Ref.ID] = true
	}
	slog.Info("valid techniques", "count", len(validTechIDs))

	// Scan all assets and remove stale techniqueIds
	assetIter := fs.Collection("assets").
		Where("disciplineId", "==", disciplineID).
		Documents(ctx)

	var assetsScanned, assetsUpdated, refsRemoved int
	for {
		doc, err := assetIter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			slog.Error("failed to iterate assets", "error", err)
			return
		}
		assetsScanned++

		data := doc.Data()
		rawIDs, _ := data["techniqueIds"].([]interface{})
		if len(rawIDs) == 0 {
			continue
		}

		var clean []string
		var stale []string
		for _, raw := range rawIDs {
			id, ok := raw.(string)
			if !ok {
				continue
			}
			if validTechIDs[id] {
				clean = append(clean, id)
			} else {
				stale = append(stale, id)
			}
		}

		if len(stale) == 0 {
			continue
		}

		refsRemoved += len(stale)
		title, _ := data["title"].(string)

		if dryRun {
			fmt.Printf("  [%s] %s — removing %d stale refs: %v\n", doc.Ref.ID, truncate(title, 50), len(stale), stale)
		} else {
			if clean == nil {
				clean = []string{}
			}
			_, err := doc.Ref.Update(ctx, []firestore.Update{
				{Path: "techniqueIds", Value: clean},
				{Path: "updatedAt", Value: time.Now()},
			})
			if err != nil {
				slog.Error("failed to update asset", "docId", doc.Ref.ID, "error", err)
			} else {
				assetsUpdated++
				slog.Info("cleaned asset", "docId", doc.Ref.ID, "title", truncate(title, 40), "removed", stale)
			}
		}
	}

	slog.Info("cleanup complete", "assetsScanned", assetsScanned, "assetsUpdated", assetsUpdated, "refsRemoved", refsRemoved)
}
