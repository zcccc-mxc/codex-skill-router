# Post-Release Observation: v0.1.0

Status: observation period ready

This document records real-world feedback after the stable `v0.1.0` release. It is not a place to change routing expectations or tune the algorithm for one isolated case.

## Release Baseline

Verified on 2026-07-13:

- `codex-skill-router@0.1.0` is available from npm.
- Git tag `v0.1.0` exists in the repository.
- GitHub Release `v0.1.0` is published.
- A clean temporary npm installation ran `csr --version`, `csr --help`, `scan`, `audit`, `route`, `eval`, and `budget` successfully.
- The installation test used the packaged public examples and the inspected output did not reveal the local user directory or project absolute path.

## What To Collect

For each real usage report, record only sanitized information:

| Field | Record |
| --- | --- |
| Date | When the observation happened. |
| Task | Sanitized task content. Remove names, secrets, prices, private paths, and customer details. |
| Expected Skills | Skills that should be required, optional, or excluded. |
| Actual recommendation | Skills returned by `csr route`. |
| Over-selection | Whether unnecessary Skills were recommended. |
| Missed selection | Whether a required Skill was missing. |
| No-match expectation | Whether no recommendation should have been returned. |
| Outcome | Correct, partially correct, or incorrect. |
| Follow-up | Link to a sanitized issue or future Eval candidate when appropriate. |

## Observation Rules

- Keep private examples in `validation/private/`; it is Git-ignored.
- Do not record API keys, tokens, customer information, business costs, private Skill text, or local absolute paths.
- Do not change the router or existing Eval expectations to improve a single observation.
- Group repeated patterns before proposing a future routing change.

## Suggested Observation Window

Use the next 3 to 7 days to collect normal project tasks from different categories, especially documentation, frontend, mobile, security, refactoring, and clear no-match requests.

## Current Known P2 Issue

`docs-authoring` can be additionally recommended for a small number of web or mobile tasks. The primary Skill is still selected. Keep collecting comparable cases before making any algorithm decision.
