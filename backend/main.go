package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/thomas/skillhive-api/internal/config"
	"github.com/thomas/skillhive-api/internal/handler"
	"github.com/thomas/skillhive-api/internal/middleware"
	"github.com/thomas/skillhive-api/internal/store"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	clients, err := store.NewFirebaseClients(ctx, cfg.GCPProject, cfg.FirebaseKeyPath)
	if err != nil {
		slog.Error("failed to initialize Firebase", "error", err)
		os.Exit(1)
	}
	defer clients.Close()

	r := chi.NewRouter()

	// Global middleware stack
	r.Use(chimiddleware.RequestSize(1 << 20)) // 1MB
	r.Use(chimiddleware.Timeout(30 * time.Second))
	r.Use(middleware.CORSHandler(cfg.CORSAllowedOrigins).Handler)
	r.Use(securityHeaders)
	r.Use(middleware.Logging)

	// Public routes
	r.Get("/healthz", handler.HealthCheck)

	// Handlers
	disciplineHandler := handler.NewDisciplineHandler(clients.Firestore)
	tagHandler := handler.NewTagHandler(clients.Firestore)
	categoryHandler := handler.NewCategoryHandler(clients.Firestore)
	techniqueHandler := handler.NewTechniqueHandler(clients.Firestore)
	assetHandler := handler.NewAssetHandler(clients.Firestore)
	oembedHandler := handler.NewOEmbedHandler()
	curriculumHandler := handler.NewCurriculumHandler(clients.Firestore)
	elementHandler := handler.NewElementHandler(clients.Firestore)

	// Protected API routes
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.FirebaseAuth(clients.Auth))

		// Disciplines (read-only)
		r.Get("/disciplines", disciplineHandler.List)

		// Tags
		r.Get("/tags", tagHandler.List)
		r.Post("/tags", tagHandler.Create)
		r.Get("/tags/{id}", tagHandler.Get)
		r.Patch("/tags/{id}", tagHandler.Update)
		r.Delete("/tags/{id}", tagHandler.Delete)

		// Categories
		r.Get("/categories", categoryHandler.List)
		r.Post("/categories", categoryHandler.Create)
		r.Get("/categories/{id}", categoryHandler.Get)
		r.Patch("/categories/{id}", categoryHandler.Update)
		r.Delete("/categories/{id}", categoryHandler.Delete)

		// Techniques
		r.Get("/techniques", techniqueHandler.List)
		r.Post("/techniques", techniqueHandler.Create)
		r.Get("/techniques/{id}", techniqueHandler.Get)
		r.Patch("/techniques/{id}", techniqueHandler.Update)
		r.Delete("/techniques/{id}", techniqueHandler.Delete)

		// Assets
		r.Get("/assets", assetHandler.List)
		r.Post("/assets", assetHandler.Create)
		r.Get("/assets/{id}", assetHandler.Get)
		r.Patch("/assets/{id}", assetHandler.Update)
		r.Delete("/assets/{id}", assetHandler.Delete)

		// YouTube oEmbed
		r.Post("/youtube/resolve", oembedHandler.ResolveYouTube)

		// Curricula
		r.Get("/curricula", curriculumHandler.List)
		r.Get("/curricula/public", curriculumHandler.ListPublic)
		r.Post("/curricula", curriculumHandler.Create)
		r.Get("/curricula/{id}", curriculumHandler.Get)
		r.Patch("/curricula/{id}", curriculumHandler.Update)
		r.Delete("/curricula/{id}", curriculumHandler.Delete)

		// Curriculum elements
		r.Get("/curricula/{id}/elements", elementHandler.ListElements)
		r.Post("/curricula/{id}/elements", elementHandler.CreateElement)
		r.Put("/curricula/{id}/elements/{elemId}", elementHandler.UpdateElement)
		r.Delete("/curricula/{id}/elements/{elemId}", elementHandler.DeleteElement)
		r.Put("/curricula/{id}/elements/reorder", elementHandler.ReorderElements)
	})

	addr := fmt.Sprintf(":%s", cfg.Port)
	srv := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	done := make(chan os.Signal, 1)
	signal.Notify(done, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("server starting", "addr", addr, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server failed", "error", err)
			os.Exit(1)
		}
	}()

	<-done
	slog.Info("shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced shutdown", "error", err)
	}

	slog.Info("server stopped")
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}
