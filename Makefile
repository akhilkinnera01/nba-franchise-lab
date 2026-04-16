PYTHON ?= python3
UV ?= $(PYTHON) -m uv
NPM ?= npm

.PHONY: setup install-uv backend-sync frontend-install lint typecheck test build web-dev

setup: install-uv backend-sync frontend-install

install-uv:
	@if $(PYTHON) -m uv --version >/dev/null 2>&1; then \
		echo "uv already installed"; \
	else \
		$(PYTHON) -m pip install --user uv; \
	fi

backend-sync:
	$(UV) sync --extra dev

frontend-install:
	$(NPM) --prefix web install

lint:
	$(UV) run ruff check api engine providers tests
	$(UV) run ruff format --check api engine providers tests
	$(NPM) --prefix web run lint

typecheck:
	$(UV) run mypy api/schemas engine providers tests
	$(NPM) --prefix web run typecheck

test:
	$(UV) run pytest tests/engine tests/providers
	$(NPM) --prefix web run test

build:
	$(NPM) --prefix web run build

web-dev:
	$(NPM) --prefix web run dev
