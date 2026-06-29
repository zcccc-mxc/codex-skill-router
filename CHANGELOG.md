# Changelog

All notable changes to Codex Skill Router will be documented in this file.

## [Unreleased]

- No unreleased changes yet.

## [0.1.0-rc.1] - 2026-06-29

### Added

- Added `csr scan` for local, read-only `SKILL.md` discovery.
- Added `csr audit` for Skill metadata quality checks.
- Added `csr route` for explainable local routing prediction.
- Added `csr eval` for routing regression tests.
- Added `csr budget` for rough local Skill metadata budget estimates.
- Added standard YAML parsing for Skill frontmatter and Eval files.
- Added strict and permissive Eval modes.
- Added no-match Eval cases.
- Added Required Recall, Exclusion Accuracy, Exact Set Match, Unexpected Recommendation Rate, No-Match Accuracy, and Complete Case Rate.
- Added Markdown Eval reports.
- Added Eval quality gates.
- Added optional local context hints from `agents/openai.yaml` and `.agents/openai.yaml`.
- Added source priority so project-level Skills can win close ties.
- Added JSON output with `schemaVersion`.
- Added GitHub Actions configuration for Linux, Windows, and macOS.
- Added release checklist and release notes draft.

### Changed

- Updated default scanning to prefer `.agents/skills`, walking upward to the Git root.
- Kept `$HOME/.agents/skills` and optional Linux/macOS `/etc/codex/skills`.
- Marked `.codex/skills` and `skills` as legacy compatibility locations.
- Hid local filesystem paths by default.
- Expanded public sample Eval coverage to 50 cases.
- Updated package metadata for `0.1.0-rc.1`.
- Rewrote README documentation to match implemented behavior.

### Fixed

- Fixed scan path expectations for the current Codex standard location.
- Fixed YAML parsing limitations from earlier hand-written parsing.
- Fixed false positives from exclusion text being counted as positive route evidence.
- Fixed Chinese exclusion marker handling.
- Fixed generic route terms causing over-triggering.
- Fixed Eval false-positive and false-negative metric reporting.
- Fixed README claims about dependencies, YAML support, and sample case counts.

### Security

- The CLI remains local-first.
- The CLI does not call external AI services.
- The CLI does not upload Skill contents.
- The CLI does not modify user Skill files.
- Default text and JSON output hide local paths.

### Known limitations

- Local prediction is not Codex actual Skill invocation.
- The router is rule-based and has limited semantic understanding.
- Dependency declarations are not dependency availability checks.
- `budget` is a rough estimate, not real token accounting.
- The tool does not automatically rewrite user Skills.
- The tool does not connect to external AI services.

## v0.1.0

Planned first stable release after release-candidate validation.
