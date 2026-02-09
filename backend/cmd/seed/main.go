package main

import (
	"context"
	"log/slog"
	"os"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/store"
	"github.com/thomas/skillhive-api/internal/validate"
)

type seedDiscipline struct {
	Name        string
	Slug        string
	Description string
}

type seedCategory struct {
	Name        string
	Slug        string
	Description string
}

type seedTechnique struct {
	Name                string
	Slug                string
	Description         string
	PrimaryCategorySlug string
}

func main() {
	cfg := config.Load()
	ctx := context.Background()

	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()

	fs := clients.Firestore

	// Bootstrap admin if ADMIN_EMAIL is set
	if adminEmail := os.Getenv("ADMIN_EMAIL"); adminEmail != "" {
		bootstrapAdmin(ctx, clients, adminEmail)
	}

	// Seed disciplines
	disciplines := []seedDiscipline{
		{
			Name:        "Brazilian Jiu-Jitsu",
			Slug:        "bjj",
			Description: "Brazilian Jiu-Jitsu (BJJ) is a martial art and combat sport based on grappling, ground fighting, and submission holds.",
		},
		{
			Name:        "Jeet Kune Do",
			Slug:        "jkd",
			Description: "Jeet Kune Do (JKD) is a hybrid martial art philosophy and fighting system developed by Bruce Lee.",
		},
	}

	for _, d := range disciplines {
		seedDisciplineDoc(ctx, fs, d)
	}

	// Seed BJJ categories
	bjjCategories := []seedCategory{
		{Name: "Closing the Distance", Description: "Approach and entry to grappling range"},
		{Name: "Takedown", Description: "Standing grappling and takedowns"},
		{Name: "Guard", Description: "Guard positions and attacks"},
		{Name: "Half-Guard", Description: "Half-guard positions and transitions"},
		{Name: "Side Control", Description: "Pins and transitions from side control"},
		{Name: "Knee on Belly", Description: "Knee-on-belly pressure and transitions"},
		{Name: "Mount", Description: "Mount position attacks and escapes"},
		{Name: "Back", Description: "Back control, chokes, and maintenance"},
	}

	for _, c := range bjjCategories {
		c.Slug = validate.GenerateSlug(c.Name)
		seedCategoryDoc(ctx, fs, "bjj", c)
	}

	// Seed BJJ techniques
	bjjTechniques := []seedTechnique{
		{Name: "Scissor Sweep", Description: "Basic closed guard sweep", PrimaryCategorySlug: "guard"},
		{Name: "Hip Bump Sweep", Description: "Closed guard sweep using hip elevation", PrimaryCategorySlug: "guard"},
		{Name: "Armbar from Guard", Description: "Armbar attack from closed guard", PrimaryCategorySlug: "guard"},
		{Name: "Triangle Choke", Description: "Triangle choke from guard", PrimaryCategorySlug: "guard"},
		{Name: "Rear Naked Choke", Description: "Fundamental choke from back control", PrimaryCategorySlug: "back"},
		{Name: "Americana", Description: "Figure-four shoulder lock from mount/side", PrimaryCategorySlug: "mount"},
		{Name: "Cross Collar Choke", Description: "Gi choke from mount", PrimaryCategorySlug: "mount"},
		{Name: "Side Control Escape (Shrimp)", Description: "Hip escape to guard recovery", PrimaryCategorySlug: "side-control"},
		{Name: "Single Leg Takedown", Description: "Fundamental single leg takedown", PrimaryCategorySlug: "takedown"},
		{Name: "Double Leg Takedown", Description: "Fundamental double leg takedown", PrimaryCategorySlug: "takedown"},
	}

	for _, t := range bjjTechniques {
		t.Slug = validate.GenerateSlug(t.Name)
		seedTechniqueDoc(ctx, fs, "bjj", t)
	}

	slog.Info("seeding completed successfully")
}

func seedDisciplineDoc(ctx context.Context, fs *firestore.Client, d seedDiscipline) {
	ref := fs.Collection("disciplines").Doc(d.Slug)
	doc, err := ref.Get(ctx)
	if err == nil && doc.Exists() {
		slog.Info("discipline exists, skipping", "slug", d.Slug)
		return
	}

	now := time.Now()
	_, err = ref.Set(ctx, map[string]interface{}{
		"name":        d.Name,
		"slug":        d.Slug,
		"description": d.Description,
		"createdAt":   now,
		"updatedAt":   now,
	})
	if err != nil {
		slog.Error("failed to seed discipline", "slug", d.Slug, "error", err)
		return
	}
	slog.Info("seeded discipline", "slug", d.Slug)
}

func seedCategoryDoc(ctx context.Context, fs *firestore.Client, disciplineID string, c seedCategory) {
	ref := fs.Collection("categories").Doc(c.Slug)
	doc, err := ref.Get(ctx)
	if err == nil && doc.Exists() {
		slog.Info("category exists, skipping", "slug", c.Slug)
		return
	}

	now := time.Now()
	_, err = ref.Set(ctx, map[string]interface{}{
		"name":         c.Name,
		"slug":         c.Slug,
		"description":  c.Description,
		"disciplineId": disciplineID,
		"parentId":     nil,
		"ownerUid":     "system",
		"createdAt":    now,
		"updatedAt":    now,
	})
	if err != nil {
		slog.Error("failed to seed category", "slug", c.Slug, "error", err)
		return
	}
	slog.Info("seeded category", "slug", c.Slug)
}

func seedTechniqueDoc(ctx context.Context, fs *firestore.Client, disciplineID string, t seedTechnique) {
	ref := fs.Collection("techniques").Doc(t.Slug)
	doc, err := ref.Get(ctx)
	if err == nil && doc.Exists() {
		slog.Info("technique exists, skipping", "slug", t.Slug)
		return
	}

	now := time.Now()
	categoryIDs := []string{}
	if t.PrimaryCategorySlug != "" {
		categoryIDs = append(categoryIDs, t.PrimaryCategorySlug)
	}

	_, err = ref.Set(ctx, map[string]interface{}{
		"name":         t.Name,
		"slug":         t.Slug,
		"description":  t.Description,
		"disciplineId": disciplineID,
		"categoryIds":  categoryIDs,
		"tagIds":       []string{},
		"ownerUid":     "system",
		"createdAt":    now,
		"updatedAt":    now,
	})
	if err != nil {
		slog.Error("failed to seed technique", "slug", t.Slug, "error", err)
		return
	}
	slog.Info("seeded technique", "slug", t.Slug)
}

func bootstrapAdmin(ctx context.Context, clients *store.FirebaseClients, email string) {
	u, err := clients.Auth.GetUserByEmail(ctx, email)
	if err != nil {
		slog.Error("failed to find admin user by email", "email", email, "error", err)
		return
	}

	claims := u.CustomClaims
	if claims == nil {
		claims = map[string]interface{}{}
	}

	// Set admin for all seeded disciplines
	roles, _ := claims["roles"].(map[string]interface{})
	if roles == nil {
		roles = map[string]interface{}{}
	}
	roles["bjj"] = "admin"
	roles["jkd"] = "admin"
	claims["roles"] = roles

	if err := clients.Auth.SetCustomUserClaims(ctx, u.UID, claims); err != nil {
		slog.Error("failed to set admin claims", "email", email, "error", err)
		return
	}
	slog.Info("bootstrapped admin user", "email", email, "uid", u.UID)
}
