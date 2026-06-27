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
- Kept `csr scan --hide-paths` as a compatibility option.
- Changed CLI output to hide local filesystem paths by default, with `--show-paths` for explicit local debugging.
- Added `csr scan --brief` for compact scan output.
- Added `csr audit --severity` to focus on error, warning, or info issues.
- Improved `csr route` scoring with name matches, description matches, exclusion penalties, and broad-description penalties.
- Improved `csr route` description understanding with English synonyms and semantic concept hints.
- Improved `csr route` matching with simple English stemming and phrase-level concept detection.
- Reduced `csr route` false positives from generic check, test, review, validation, browser, page, and data terms.
- Reduced false positives by preventing exclusion text from being counted as positive route evidence.
- Reduced audit overlap false positives by comparing applicability text separately from exclusion text.
- Added `csr eval --json` for machine-readable evaluation results.
- Added `csr eval --min-complete-rate` to fail evaluation runs below a required complete rate.
- Added optional expectation handling for `csr eval`.
- Added `examples/eval.yml` with 30 reproducible routing tasks and public sample Skills under `examples/skills`.
- Added GitHub Actions CI for Node.js tests on Linux, Windows, and macOS.
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
