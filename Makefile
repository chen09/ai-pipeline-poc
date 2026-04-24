# AI Pipeline POC — common operations
# `make` prints help. All targets are idempotent unless noted.

SHELL := /usr/bin/env bash
COMPOSE := docker compose

.DEFAULT_GOAL := help
.PHONY: help bootstrap up down restart ps logs health reset

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m\n\nTargets:\n"} /^[a-zA-Z_-]+:.*?##/ {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

bootstrap: ## Generate .env with random secrets (idempotent)
	@./scripts/bootstrap.sh

up: ## Start all services (pulls images as needed)
	@$(COMPOSE) up -d
	@echo ""
	@echo "Services starting. Wait ~60s, then run: make ps"

down: ## Stop services (keeps ./data)
	@$(COMPOSE) down

restart: ## Restart all services
	@$(COMPOSE) restart

ps: ## Show service status
	@$(COMPOSE) ps

logs: ## Tail logs. Usage: make logs [s=<service>]
	@if [ -z "$(s)" ]; then \
		$(COMPOSE) logs -f --tail=100; \
	else \
		$(COMPOSE) logs -f --tail=200 $(s); \
	fi

health: ## Run healthcheck probes on the host side
	@echo "n8n       :" && (curl -fsS http://localhost:5678/healthz && echo " OK") || echo " FAIL"
	@echo "litellm   :" && (curl -fsS http://localhost:4000/health/liveliness -o /dev/null && echo " OK") || echo " FAIL"
	@echo "langfuse  :" && (curl -fsS http://localhost:3000/api/public/health -o /dev/null && echo " OK") || echo " FAIL"
	@echo "minio     :" && (curl -fsS http://localhost:9090/minio/health/live -o /dev/null && echo " OK") || echo " FAIL"

reset: ## DANGEROUS: stop services and wipe ./data (interactive confirm)
	@read -p "This will delete ./data/ (all service state). Type 'yes' to confirm: " ans; \
	if [ "$$ans" = "yes" ]; then \
		$(COMPOSE) down -v; \
		rm -rf ./data/postgres ./data/redis ./data/clickhouse ./data/clickhouse-logs ./data/minio ./data/n8n; \
		mkdir -p ./data/postgres ./data/redis ./data/clickhouse ./data/minio ./data/n8n; \
		echo "data/ wiped."; \
	else \
		echo "Aborted."; \
	fi
