.PHONY: up down seed build logs help dev dev-emulators dev-backend dev-frontend stop

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# === Docker Compose (recommended) ===

up: ## Start full stack via Docker Compose
	docker compose up --build

down: ## Stop and remove containers
	docker compose down

seed: ## Seed Firestore emulator with sample data
	docker compose exec backend go run cmd/seed/main.go

logs: ## Tail logs for all services
	docker compose logs -f

build: ## Build both frontend and backend (local, no Docker)
	cd backend && go build ./...
	cd frontend && npm run build

# === Native (no Docker) ===

JAVA_PATH := /opt/homebrew/opt/openjdk/bin
export FIRESTORE_EMULATOR_HOST := localhost:8181
export FIREBASE_AUTH_EMULATOR_HOST := localhost:9099

dev: ## Start full stack natively (requires Java, Go, Node)
	@echo "Starting SkillHive dev stack (native)..."
	@echo "  Emulator UI: http://localhost:4000"
	@echo "  Backend API: http://localhost:8080"
	@echo "  Frontend:    http://localhost:5173"
	@echo ""
	@$(MAKE) -j3 dev-emulators dev-backend dev-frontend

dev-emulators:
	PATH="$(JAVA_PATH):$$PATH" npx firebase-tools emulators:start --project skillhive

dev-backend:
	@sleep 5
	cd backend && go run main.go

dev-frontend:
	@sleep 3
	cd frontend && npm run dev

stop: ## Kill all native dev processes
	@echo "Stopping dev stack..."
	@-lsof -ti :8080 | xargs kill 2>/dev/null || true
	@-lsof -ti :8181 | xargs kill 2>/dev/null || true
	@-lsof -ti :9099 | xargs kill 2>/dev/null || true
	@-lsof -ti :5173 | xargs kill 2>/dev/null || true
	@-lsof -ti :4000 | xargs kill 2>/dev/null || true
	@echo "Done."
