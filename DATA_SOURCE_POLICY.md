# Data Source Policy

## Purpose

This repository may only include data sources that we can legally collect, store, transform, and redistribute in public.

## Requirements

- Every source must have a named owner, source URL, collection scope, and permitted use documented before ingestion.
- Prefer public, documented, reproducible sources with stable terms.
- Do not commit data from sources that prohibit scraping, redistribution, or derivative storage unless explicit permission is documented.
- Do not commit private, paid, credentialed, or access-controlled data unless the license or contract explicitly allows public-repo storage.
- Redact or exclude personal data, secrets, credentials, and other restricted fields before any commit.
- Demo, sample, and fixture data must be synthetic, redacted, or otherwise safe for public distribution.

## Review Gate

- New sources require explicit rights review before code, fixtures, or documentation reference them.
- If rights are unclear, stop and treat the source as blocked until resolved.
- If a source is approved only for local or private use, keep it out of git and document the restriction in the private repo.

## Exceptions

- Temporary local experiments may use restricted sources, but the outputs may not be committed here.
- Any exception must be documented with the source name, scope, and review owner.
