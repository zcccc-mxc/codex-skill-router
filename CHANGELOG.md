# Changelog

All notable changes to Codex Skill Router will be documented in this file.

This project has not published a stable release yet.

## Unreleased

### Added

- Created the initial open source project documentation.
- Added product requirements for the v0.1.0 direction.
- Added project collaboration rules in `AGENTS.md`.
- Added `README.md`, `LICENSE`, `.gitignore`, and `CONTRIBUTING.md`.
- Added a minimal Node.js CLI entrypoint for `csr`.
- Implemented `csr scan` for local, read-only `SKILL.md` discovery.
- Implemented `csr audit` for basic Skill configuration checks.
- Implemented `csr route` for local keyword-based routing prediction.
- Implemented `csr eval` for JSON and simple YAML route test files.
- Improved `csr scan` with summary counts and JSON output.
- Added `csr scan --hide-paths` to avoid showing local filesystem paths in shared output.
- Added `csr scan --brief` for compact scan output.
- Added `csr audit --severity` to focus on error, warning, or info issues.
- Improved `csr route` scoring with name matches, description matches, exclusion penalties, and broad-description penalties.
- Improved `csr route` description understanding with English synonyms and semantic concept hints.
- Added `csr eval --json` for machine-readable evaluation results.
- Added `examples/eval.yml` as a small evaluation example.
- Added Node.js built-in tests for the core CLI behavior.

### Safety Notes

- The current implementation is local-first.
- The current implementation does not call external AI services.
- The current implementation does not upload Skill contents.
- The current implementation does not modify user Skill files.
- `route` output is a local prediction and does not represent Codex internal execution.

### Known Limitations

- `route` uses simple keyword matching and a small Chinese-English keyword map.
- `audit` uses rule-based checks and may produce conservative suggestions.
- YAML support in `eval` is intentionally limited to the simple test format used by this project.
- There is no npm package release yet.

## v0.1.0

Planned first release.

Release criteria are documented in [docs/PRODUCT_REQUIREMENTS.md](docs/PRODUCT_REQUIREMENTS.md).
