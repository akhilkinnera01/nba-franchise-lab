"""Shared guardrails for CPU- and memory-intensive simulation helpers."""

from __future__ import annotations

# Phase 2 is designed around 10,000-iteration Monte Carlo runs. This ceiling keeps
# public API and job callers from requesting pathological simulation sizes that can
# exhaust CPU or memory while still leaving room for offline experimentation.
MAX_MONTE_CARLO_ITERATIONS = 50_000
