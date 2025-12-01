.PHONY: db-start db-stop db-restart db-status db-logs db-reset db-shell db-schema db-seed token token-save kill-api kill-web

# Database container management
db-start:
	@echo "Starting MySQL database container..."
	docker-compose up -d mysql
	@echo "Waiting for database to be ready..."
	@timeout=30; \
	while [ $$timeout -gt 0 ]; do \
		if docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p$${MYSQL_ROOT_PASSWORD:-trainhive_root_password} --silent 2>/dev/null; then \
			echo "Database is ready!"; \
			break; \
		fi; \
		sleep 1; \
		timeout=$$((timeout-1)); \
	done

db-stop:
	@echo "Stopping MySQL database container..."
	docker-compose stop mysql

db-restart: db-stop db-start

db-status:
	@echo "Database container status:"
	@docker-compose ps mysql
	@echo ""
	@if docker-compose ps mysql | grep -q "Up"; then \
		echo "Database is running"; \
		docker-compose exec -T mysql mysqladmin ping -h localhost -u root -p$${MYSQL_ROOT_PASSWORD:-trainhive_root_password} --silent 2>/dev/null && echo "Database is healthy" || echo "Database is not responding"; \
	else \
		echo "Database is not running"; \
	fi

db-logs:
	docker-compose logs -f mysql

db-reset: db-stop
	@echo "Resetting database (removing volume)..."
	@read -p "This will delete all data. Continue? [y/N] " confirm; \
	if [ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ]; then \
		docker-compose down -v mysql; \
		docker-compose up -d mysql; \
		echo "Waiting for database to be ready..."; \
		sleep 5; \
		echo "Database reset complete. Run 'make db-schema' to install schema."; \
	else \
		echo "Reset cancelled."; \
	fi

db-shell:
	docker-compose exec mysql mysql -u trainhive_user -ptrainhive_password trainhive

# Database schema and seeding
db-schema:
	@echo "Building database package..."
	@npm run build --workspace=packages/db
	@echo "Installing database schema..."
	@npm run db:schema

db-seed:
	@echo "Building database package..."
	@npm run build --workspace=packages/db
	@echo "Seeding test data..."
	@npm run db:seed

db-setup: db-start db-schema db-seed
	@echo "Database setup complete! Ready to use."

# Generate bearer token for API testing
# Usage:
#   make token              - Interactive mode
#   make token USER_NUM=1   - Generate for specific user
#   make token-save USER_NUM=1 - Generate and save to CLI tool
token:
	@echo "Generating bearer token..."
	@npx ts-node -P packages/db/tsconfig.json scripts/generate-token.ts $(USER_NUM)

# Generate and save token directly to CLI tool
token-save:
	@echo "Generating and saving bearer token..."
	@TOKEN=$$(npx ts-node -P packages/db/tsconfig.json scripts/generate-token.ts $(USER_NUM) 2>/dev/null | grep -A1 "Bearer Token:" | tail -1 | tr -d ' '); \
	if [ -n "$$TOKEN" ]; then \
		echo "$$TOKEN" > ~/.trainhive-token; \
		echo "Token saved to ~/.trainhive-token"; \
		echo "You can now use the CLI: npm run cli -w @trainhive/api-cli -- request GET /api/v1/videos"; \
	else \
		echo "Failed to generate token"; \
		exit 1; \
	fi

kill-api:
	@echo "Killing local API server..."
	lsof -t -i :3001 | xargs kill

kill-web:
	@echo "Killing local Next.js Website"
	lsof -t -i :3001 | xargs kill	


