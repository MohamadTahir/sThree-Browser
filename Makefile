# sThree Browser — common tasks. Run `make` or `make help` to list them.

IMAGE      ?= sthree-browser
PORT       ?= 3000
MINIO_PORT ?= 19000
MINIO_USER ?= sthreetest
MINIO_PASS ?= sthree-test-secret-123

.DEFAULT_GOAL := help
.PHONY: help install dev build start typecheck check tauri-dev tauri-build \
        docker-build docker-run minio minio-stop clean

help: ## List available targets
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	pnpm install --frozen-lockfile

dev: install ## Run the web app in dev mode on http://localhost:3000
	pnpm dev

build: install ## Production web build (standalone server)
	pnpm build

start: build ## Build, then serve the production web app (PORT=3000)
	pnpm start -p $(PORT)

typecheck: install ## Type-check the project
	pnpm typecheck

check: typecheck build ## Type-check and build both web and desktop
	pnpm build:tauri
	cargo check --manifest-path src-tauri/Cargo.toml

tauri-dev: install ## Run the desktop app with hot reload
	pnpm tauri dev

tauri-build: install ## Build desktop installers into src-tauri/target/release/bundle
	pnpm tauri build

docker-build: ## Build the web Docker image (IMAGE=sthree-browser)
	docker build -t $(IMAGE) .

docker-run: docker-build ## Run the web Docker image (PORT=3000)
	docker run --rm -p $(PORT):3000 --name $(IMAGE) $(IMAGE)

minio: ## Start a throwaway local MinIO for testing (MINIO_PORT=19000)
	docker run -d --rm --name sthree-minio -p $(MINIO_PORT):9000 \
		-e MINIO_ROOT_USER=$(MINIO_USER) -e MINIO_ROOT_PASSWORD=$(MINIO_PASS) \
		quay.io/minio/minio:latest server /data
	@echo "MinIO: endpoint http://localhost:$(MINIO_PORT), access key $(MINIO_USER), path-style URLs on."
	@echo "Create a bucket: docker exec sthree-minio sh -c 'mc alias set l http://127.0.0.1:9000 $(MINIO_USER) $(MINIO_PASS) && mc mb l/test'"

minio-stop: ## Stop the local MinIO (its data is discarded)
	docker stop sthree-minio

clean: ## Remove build output
	rm -rf .next out tsconfig.tsbuildinfo
