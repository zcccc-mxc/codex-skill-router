# Changelog

All notable changes to Codex Skill Router will be documented in this file.

## [Unreleased]

## [0.2.0-rc.1] - 2026-07-20

### Added

- Added machine-readable JSON output for `csr route`.
- Added the initial `csr plan` command combining local Skill routing and metadata budget estimates.
- Added local permission-risk analysis and confirmation recommendations to `csr plan`.
- Added pre-execution acceptance criteria and suggested verification methods to `csr plan`.
- Added local Agent Strategy recommendations for single, parallel, and sequential task delegation.
- Added a public-safe v0.2 validation suite covering plan, permission risk, acceptance criteria, and Agent Strategy.

### Changed

- Kept route and plan JSON output versioned, private by default, and compatible with existing text commands.
- Kept all planning output local and predictive; it does not record or control Codex execution.

### Validation

- `npm test` passes 34 automated tests.
- The v0.2 primary validation suite has 47 complete cases and 1 recorded P2 failure; the reserved suite has 12 complete cases.
- The existing 30-case route Eval remains 28 complete and 2 known P2 failures, with no regression in its reported metrics.

### Security

- Paths remain hidden by default in text and JSON output.
- `csr plan` provides reminders and confirmation suggestions only; it does not execute commands, create agents, install packages, publish packages, or create Releases.

### Known limitations

- Task-text interpretation is heuristic. Some explicit negative wording such as `without publishing`, `不要访问网络`, or `不要 push` can be misread; review predicted actions before acting.
- `docs-authoring` may still be over-recommended for a small number of web/mobile routing tasks.
- Token values are rough local metadata estimates, not actual Codex Token use.

## [0.1.0] - 2026-07-03

### Added

- Added stable release notes draft at `docs/RELEASE_NOTES_0.1.0.md`.
- Added product vision and roadmap documentation.
- Added RC1 validation plan, validation log, issue triage, and stable release checklist.
- Added public-safe real-world validation materials under `validation/`.

### Changed

- Rewrote the English README around a public 60-second tryout, installation paths, privacy promises, and validation status.
- Rewrote the Chinese README to provide a clear public entry point for Chinese users.
- Documented the stable `v0.1.0` release decision based on RC1 validation.
- Updated package metadata from `0.1.0-rc.1` to `0.1.0`.

### Validation

- RC1 validation covered 30 real tasks.
- 28 of 30 real tasks were complete.
- 2 of 30 real tasks failed because `docs-authoring` was additionally recommended on web/mobile tasks.
- Required Skill Recall was 100.0%.
- No-Match Accuracy was 100.0%.
- Exclusion Accuracy was 91.7%.
- Local retest on 2026-07-02 passed `npm.cmd test` with 21 tests.

### Known limitations

- `docs-authoring` may still be over-recommended in a small number of web/mobile tasks.
- This is tracked as RC1-001, severity P2, and does not block stable `v0.1.0`.

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
