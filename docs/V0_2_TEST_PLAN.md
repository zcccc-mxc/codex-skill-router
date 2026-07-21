# v0.2 Test Plan

## P1 through P5 automated test scope

Add tests only after the implementation phase is explicitly approved. P0 adds this plan, not tests or product code.

1. **`route --json` structure:** implemented in P1 with parseable JSON, `schemaVersion: 1`, stable envelope, `command: "route"`, success/error handling, and the same recommendations as text route for a fixed Skill fixture.
2. **`plan` foundation:** P2 covers text and JSON output, route consistency, all/recommended metadata estimates, no-match, small-task suppression, over-budget warnings, paths, input errors, Chinese, English, and mixed-language tasks.
3. **P3 permission predictions:** pure-function fixtures cover read-only review, file update and tests, install, Git push, npm publish, single and recursive deletion, public secret exposure, Chinese and mixed-language negation, and vague tasks without noisy predicted permissions.
4. **P4 acceptance criteria:** pure-function fixtures cover stable IDs, valid enums, explicit versus derived sources, verification methods, action-based criteria, sensitive-data safety, Chinese constraints, and conservative vague-task output.
5. **`plan --json` structure:** P4 keeps action, permission, confirmation, acceptance, warning, and unknown fields stable; `verificationPerformed` is always `false`; a no-match plan is successful and includes empty recommended Skills plus unknowns.
6. **P5 Agent Strategy:** pure-function fixtures cover single, parallel, sequential, vague, high-risk, dependency, conflict, minimal-Skill, and no-runtime-state recommendations.
7. **P6 validation:** 48 primary and 12 reserved public-safe plan cases run through `npm run validate:v0.2`; reports record complete/partial/failed results without executing task text.
4. **Path hiding:** default text and JSON hide temporary absolute paths and task-derived paths; `--show-paths` reveals only allowed local path fields; no Skill body or secret fixture is emitted.
5. **Permission risk levels:** fixtures cover each category and assert the documented low/medium/high/critical defaults and escalation rules.
6. **Required confirmations:** high/critical `required` and concrete `possible` actions produce confirmations; unknown and not-required actions do not; `csr plan` does not create approval state.
7. **Token estimate labels:** estimate scope is recommended Skills only; `--max-tokens` accepts positive whole numbers and rejects invalid values; output says it is not actual usage.
8. **No-match tasks:** no recommendation is not an error; the plan does not invent Skills or high-risk actions.
9. **Language coverage:** Chinese, English, and Chinese-English mixed task fixtures cover routing, unknowns, and permission wording.
10. **Platform coverage:** CI or documented manual checks on Windows, Linux, and macOS verify arguments, path hiding, and JSON parsing.
11. **Node coverage:** run the full suite on Node 22 and Node 24 before release.
12. **Regression:** all v0.1 tests remain green without changing existing routing scores, keywords, or Eval expectations.

## Test fixture principles

- Use temporary local Skill fixtures and non-sensitive examples.
- Keep permission evidence short and sanitized.
- Test exact schema fields and semantics, but avoid brittle full-text snapshots beyond headings and safety labels.
- Add regression cases only for P1 behavior; do not use P0 to tune the existing `docs-authoring` issue.

## Required real-task validation

Before v0.2 release, review at least 30 real tasks. Define the expected plan before checking output and store public-safe notes only. Do not report a final success percentage until the real validation has actually run.

The set must cover:

| Area | Minimum coverage |
| --- | --- |
| Documentation | A task that reads/updates documentation without unrelated deployment claims. |
| Frontend | Existing page layout work with a minimal UI Skill recommendation. |
| Browser verification | A mobile or browser check that may use a local service. |
| Security review | Read-only review with careful secret-access uncertainty. |
| Dependency install | An explicit install request requiring high-risk confirmation. |
| Git operation | Read, local commit, and remote push cases distinguished. |
| npm publish | Explicit publish request requiring high-risk confirmation. |
| File deletion | Single deletion and large/destructive deletion risk cases. |
| Simple no-match | A small task that should not receive a Skill or invented permissions. |
| Ambiguous permission | A vague task whose relevant permissions remain `unknown`. |

For each case record: sanitized task intent, expected recommended/optional Skills, expected required/possible/unknown permissions, expected confirmation categories, expected acceptance criteria, actual output, and whether the outcome is complete or needs review. Never invent validation scores or count synthetic fixtures as real-task evidence.

## Exit criteria for P1 implementation review

- Existing tests pass.
- New interface and privacy tests pass on the supported Node/platform matrix.
- All required schema and risk classes have direct coverage.
- At least 30 real tasks have been reviewed with no fabricated results.
- Documentation states the unresolved limits and does not claim a sandbox, execution control, actual Token accounting, or automatic final-result judgment.
