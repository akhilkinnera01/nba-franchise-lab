# NBA Franchise Lab

NBA Franchise Lab is an open-source, demo-data-first NBA decision intelligence workspace. The public repository is intentionally scoped to the product shell, the simulation core, typed API contracts, and adapter interfaces that can be wired to rights-cleared or user-supplied data.

The public repo does **not** ship live scraping integrations, raw source exports, or ambiguous redistribution rights. Restricted ingestion work belongs in a separate private research environment.

## What Is In This Repo

- A Next.js product shell for franchise dashboards, scenario workspaces, and shareable analysis views.
- A Python simulation core for player value, age curves, injuries, cap logic, and scenario evaluation.
- Typed API contracts under `api/schemas/` so private adapters and public clients can agree on the wire format.
- Provider interfaces and demo fixture loaders for building safe local examples.
- Public CBA rule templates, methodology notes, and contribution policy files.

## What Is Intentionally Out Of This Repo

- Scraper implementations and warehouse loaders.
- Raw or derived exports from restricted, paid, or unclear-rights sources.
- Public roadmap/issues that position the product as scraper-first.
- Source-specific history that should remain in the private research repo.

## Demo Data

- Public examples use synthetic, redacted, or otherwise redistributable fixtures.
- The default public development posture is `demo-data-first`.
- Any real data adapter must satisfy [DATA_SOURCE_POLICY.md](DATA_SOURCE_POLICY.md) before it is referenced in code, tests, docs, or screenshots.

## Tech Stack

- Python 3.12+ with `uv`, Pydantic v2, NumPy, PyYAML, Ruff, mypy, and pytest.
- Next.js App Router with strict TypeScript, Tailwind CSS, ESLint, and Vitest.
- Adapter-based data boundaries so live/private provider logic can stay outside the public repository.

## Repository Layout

```text
api/schemas/   Typed API contracts shared across adapters and clients
engine/        Simulation and decision-intelligence primitives
providers/     Provider interfaces and demo fixture loaders
data/cba/      Public CBA rule templates
demo/fixtures/ Synthetic demo payloads safe for redistribution
tests/         Python engine and provider verification
web/           Next.js frontend
.github/       CI and GitHub workflow templates
```

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 20+
- `uv`
- `npm`

### Environment

Copy `.env.example` to `.env.local` and set the values you need for local development:

```bash
cp .env.example .env.local
```

`NEXT_PUBLIC_API_URL` is only required if you want the frontend to talk to a separate local or private API service. `DEMO_FIXTURE_ROOT` points the demo provider at the synthetic fixture bundle in this repository.

### Common Commands

```bash
make setup
make lint
make typecheck
make test
make build
```

## Policies

- [DATA_SOURCE_POLICY.md](DATA_SOURCE_POLICY.md): rules for public data-source use and review gates.
- [ASSET_POLICY.md](ASSET_POLICY.md): rules for screenshots, logos, photos, generated assets, and attribution.
- [CONTRIBUTING.md](CONTRIBUTING.md): workflow, quality gates, and public-repo contribution rules.
- [METHODOLOGY.md](METHODOLOGY.md): simulation formulas, assumptions, and modeling notes.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or pull requests.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE).
