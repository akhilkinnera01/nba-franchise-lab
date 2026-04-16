# Contributing to NBA Franchise Lab

## Principles

- Keep diffs focused, reviewable, and reversible.
- Add or update tests for behavior changes.
- Update docs whenever contracts, public behavior, or methodology change.
- Keep the public repo demo-data-first and rights-clean.
- Do not commit secrets, local runtime state, or restricted source content.

## Development Workflow

1. Create a feature or fix branch from `main`.
2. Keep one logical change per commit.
3. Use descriptive commit messages that explain why the change exists.
4. Run the required checks before opening a PR:
   - Python: `ruff check`, `ruff format --check`, `mypy`, `pytest`
   - Frontend: `eslint`, `tsc --noEmit`, `vitest`, `next build`
5. Update any affected docs:
   - `DATA_SOURCE_POLICY.md` for source-boundary changes
   - `ASSET_POLICY.md` for new asset classes or license requirements
   - `METHODOLOGY.md` for formula or modeling changes
   - `README.md` for setup, workflow, or scope changes

## Pull Requests

Every PR should explain:

- what changed
- why it changed
- how to test it
- any known limitations or follow-up work

Use the pull request template in `.github/pull_request_template.md`.

## Data and Asset Contributions

### Data contributions

- Use only demo, synthetic, redacted, or otherwise redistributable data in the public repo.
- Every new source must satisfy [DATA_SOURCE_POLICY.md](DATA_SOURCE_POLICY.md).
- If source rights are unclear, stop and treat the source as blocked.
- Keep restricted or contract-bound adapters outside this repository.

### Asset contributions

- Every committed asset must satisfy [ASSET_POLICY.md](ASSET_POLICY.md).
- Do not commit screenshots, photos, logos, or exports with unclear rights.
- Public README/media examples must remain demo-safe.

## Local-Only Files

These must stay out of Git:

- `.env*` except `.env.example`
- `docs/internal/`
- `.omx/`
- local caches and build outputs
- notebook checkpoints and generated outputs
- restricted provider exports or private adapter configs

## Questions and Proposals

- Open an issue before large feature work or product-direction changes.
- For adapter or contract changes, include the source-rights and verification plan up front.
- For methodology changes, include the assumptions, trade-offs, and expected validation path.
