# RC1 Issue Triage

Use this file to classify issues found during `v0.1.0-rc.1` real usage validation.

Do not fix route logic immediately during triage. First record the issue, reproduction steps, impact, and whether it blocks stable release.

## Severity Levels

### P0: Blocks Stable Release

Use P0 when:

- a command crashes on normal input;
- install or packaged CLI execution fails;
- output leaks secrets or private paths by default;
- user Skill files are modified;
- Eval results are hard-coded or untrustworthy;
- GitHub release artifacts are wrong or unusable.

### P1: Must Fix Before Stable Release

Use P1 when:

- a common real routing task is consistently wrong;
- no-match behavior is unreliable;
- JSON output is invalid or unstable;
- README or release notes mislead users;
- Windows, macOS, or Linux support has a meaningful gap;
- audit warnings are noisy enough to reduce trust.

### P2: Can Fix After Stable Release

Use P2 when:

- wording is unclear but not misleading;
- output formatting could be better;
- a rare edge case needs better handling;
- docs could include more examples;
- metrics or reports need minor polish;
- the correct primary Skill is selected but one extra low-impact Skill is also recommended.

## Issue Index

| Issue ID | Severity | Status | Summary | Blocks stable? |
| --- | --- | --- | --- | --- |
| RC1-001 | P2 | open | `docs-authoring` may be over-recommended in a small number of web/mobile tasks | no |

## Open Issues

### RC1-001: Web/mobile tasks may over-recommend docs-authoring

- Severity: P2
- Status: open
- Blocks stable release: no
- Found on: 2026-07-01
- Environment: Windows, Node v26.2.0, npm 11.13.0, csr 0.1.0-rc.1
- Affected validation cases: 2 of 30 real tasks

#### Problem

`docs-authoring` may be additionally recommended in a small number of web page or mobile display tasks.

#### Impact

The correct primary Skills are still selected. The issue does not cause a required Skill to be missed and does not prevent the main task from being completed.

#### Severity

P2, minor issue.

#### Release Impact

Does not block stable `v0.1.0`.

#### Reproduction Summary

1. Run route checks for web page or mobile display tasks that should select UI/browser-related Skills.
2. Compare the recommended Skills with the expected excluded Skills.
3. In two RC1 validation cases, `docs-authoring` appeared as an extra recommendation.

#### Expected Result

The router should recommend the correct primary UI/browser-related Skills without also selecting `docs-authoring`.

#### Actual Result

The router selected the correct primary Skills and additionally selected `docs-authoring`.

#### Evidence

Public-safe summary:

```text
30 real tasks reviewed.
28 complete.
2 failed because docs-authoring was additionally recommended on web/mobile tasks.
Required Skill Recall: 100.0%.
No-Match Accuracy: 100.0%.
Exclusion Accuracy: 91.7%.
```

#### Triage Notes

This is an over-selection issue, not a crash, privacy issue, or missed primary Skill issue.

Do not mark this issue as fixed. Do not tune the algorithm only for these two examples. Continue collecting similar tasks and optimize in a future version using a broader pattern.

#### Release Decision

This issue does not require `v0.1.0-rc.2`. Stable `v0.1.0` can be prepared while keeping RC1-001 open as a known P2 limitation.

#### 2026-07-02 Retest

The stable pre-release retest reproduced the same pattern:

- the mobile UI smoke route selected the correct primary Skills;
- `docs-authoring` was still additionally recommended;
- the 30-task Eval result stayed at 28 complete and 2 failed;
- Required Skill Recall stayed at 100.0%;
- No-Match Accuracy stayed at 100.0%;
- no new crash, privacy leak, or missed required Skill was found.

RC1-001 remains P2 and open. It still does not block stable `v0.1.0`.

## Closed Issues

No RC1 issues are closed in this document.

## Issue Template

### RC1-000: Short title

- Severity: P0 / P1 / P2
- Status: open / investigating / fixed / accepted limitation
- Blocks stable release: yes / no
- Found on:
- Environment:
- Command:

#### Reproduction Steps

1. 
2. 
3. 

#### Expected Result

Describe what a reasonable user expected.

#### Actual Result

Describe what happened.

#### Evidence

Paste public-safe command output. Remove private paths, secrets, customer names, and internal Skill contents.

#### Triage Notes

Explain likely cause, scope, and whether the issue needs a code fix, documentation fix, Eval case, or no action.

#### Release Decision

State whether this issue blocks stable `v0.1.0`, requires `v0.1.0-rc.2`, or can wait.
