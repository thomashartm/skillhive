# Backend builds. All binaries land in bin/ — never at the package root,
# never sprinkled across cmd/<name>/. Add a new tool at cmd/<name>/main.go
# and `make tools` picks it up automatically (no Makefile edit needed).
.PHONY: help build server tools test clean

# Auto-discover everything under cmd/.
TOOLS := $(notdir $(wildcard cmd/*))

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

build: server tools ## Build the API server and every cmd/<name> into bin/

server: ## Build the API server into bin/server
	@mkdir -p bin
	go build -o bin/server .

tools: ## Build every cmd/<name> into bin/<name>
	@mkdir -p bin
	@for tool in $(TOOLS); do \
	  echo "  bin/$$tool"; \
	  go build -o bin/$$tool ./cmd/$$tool || exit 1; \
	done

test: ## Run all tests
	go test ./...

clean: ## Remove built binaries
	rm -rf bin/
