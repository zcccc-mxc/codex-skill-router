# RC1 Validation Log

Version: `v0.1.0-rc.1`

Use this file for public-safe validation notes only. Put sensitive details in `validation/private/`, which is ignored by Git.

## RC1 Real Validation Summary

### 1. Real Project Baseline Check

Validation content:

- Checked the project-level Skill directory in a real project.
- Checked `AGENTS.md` and Skill registration notes.
- Checked configuration for 3 project-level Skills.
- Fixed inconsistent `agents/openai.yaml` formatting in 2 Skills.
- Ran the project baseline checks.

Result:

- The project-level Skill structure works.
- Skill configuration is now consistent.
- The project baseline check passed.
- This stage proves that the Skill directory and configuration are ready.
- This stage alone does not prove automatic Skill selection accuracy.

### 2. Small Real Task Validation

Validation content:

- Tested automatic Skill selection with 6 real tasks.
- Defined expected results before running route checks.
- Wrote the results into the real-world Eval file.
- Did not modify the routing algorithm.

Result:

```text
Real tasks: 6
Complete: 5
Failed: 1
```

Only issue:

- One task additionally recommended `docs-authoring`.
- The correct primary Skills were still selected.
- This is a minor over-selection issue.

Other results:

```text
npm test: 21 tests passed
Product code: not modified
Routing algorithm: not modified
```

### 3. Full 30-Task Real Validation

Validation content:

- Expanded the real validation set to 30 tasks.
- Covered documentation, web page work, mobile display checks, security review, and simple tasks that should not need a Skill.
- Used the same fixed Skill set for all tasks.
- Recorded results in the real-world Eval file and this validation log.

Final result:

```text
Real tasks: 30
Complete: 28
Failed: 2
```

Core metrics:

```text
Required Skill Recall: 100.0%
No-Match Accuracy: 100.0%
Exclusion Accuracy: 91.7%
```

Remaining issues:

- Both remaining failures happened in web page or mobile tasks.
- Both failures additionally recommended `docs-authoring`.
- The correct primary Skills were selected.
- No required primary Skill was missed.
- These are minor P2 over-selection issues and do not block current use.

## Final RC1 Conclusion

RC1 real validation is complete.

Confirmed:

- Skill scan and route behavior are usable.
- Required Skills were not missed.
- Tasks that should not need a Skill did not receive incorrect recommendations.
- No program crash was found.
- No serious privacy issue was found.
- No release-blocking error was found.
- 28 of 30 real tasks were completely correct.
- The remaining 2 issues are minor extra recommendations.

Release judgment:

```text
RC1 real validation passed.
The current version has practical usage value.
It is reasonable to prepare the stable v0.1.0 release.
The two minor issues do not require publishing rc.2 first.
```

## 2026-07-02 Stable Pre-Release Retest

Purpose:

- Re-run the core CLI commands after the RC1 validation summary was recorded.
- Confirm that the 30-task Eval result is stable.
- Confirm that RC1-001 remains a P2 over-selection issue and does not become P1.
- Confirm that JSON output still hides local paths by default.

Commands run:

```text
node src/cli.js --version
node src/cli.js --help
node src/cli.js scan --path ./examples/skills
node src/cli.js audit --path ./examples/skills
node src/cli.js budget --path ./examples/skills
node src/cli.js route "优化一个页面的移动端显示" --path ./examples/skills
node src/cli.js route "只修改 README 的安装说明" --path ./examples/skills
node src/cli.js route "检查登录接口是否存在权限绕过" --path ./examples/skills
node src/cli.js eval validation/real-world.eval.yml --path ./examples/skills
node src/cli.js scan --json --path ./examples/skills
node src/cli.js eval validation/real-world.eval.yml --json --path ./examples/skills
npm.cmd test
```

Retest result:

```text
Version: 0.1.0-rc.1
scan: 10 Skills found, paths hidden by default
audit: 1 info-level possible overlap, 0 errors, 0 warnings
budget: 541 estimated tokens, low risk
route docs task: docs-authoring selected correctly
route security task: security-review selected correctly
route mobile UI task: frontend-ui and browser-validation selected, with known extra docs-authoring
real-world Eval: 30 total, 28 complete, 2 failed
npm test: 21 tests passed
JSON privacy: paths hidden as "(hidden path)"
```

Conclusion:

- Today's retest matches the recorded RC1 result.
- No new P0 or P1 issue was found.
- RC1-001 remains an open P2 issue.
- The recommendation to prepare stable `v0.1.0` still stands.

## Daily Log

| Date | Tester | Environment | Commands run | Result | Issues opened | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-07-01 | project owner + Codex | Windows, Node v26.2.0, npm 11.13.0, csr 0.1.0-rc.1 | `npm test`; `csr --version`; `csr --help`; `csr scan --path ./examples/skills`; `csr audit --path ./examples/skills`; `csr budget --path ./examples/skills`; route checks | pass with known P2 over-selection | RC1-001 | RC1 validation began with project baseline checks and a small real-task set. |
| 2026-07-01 | project owner + Codex | Windows validation session | planning review | continue rc.1 validation |  | Project owner confirmed that artificial tasks should not be counted as real validation evidence. |
| 2026-07-01 | project owner + Codex | Windows validation session | `csr route`; `csr eval validation/real-world.eval.yml --path ./examples/skills` | pass; real-world Eval reached 6 cases |  | Registered the validation-documentation task as RW-006. |
| 2026-07-01 | Codex | Windows, Node v26.2.0, npm 11.13.0, csr 0.1.0-rc.1 | `csr eval validation/real-world.eval.yml --path ./examples/skills` | pass with two known UI/docs exclusion failures | RC1-001 | Expanded the real-world Eval to 30 cases and confirmed the same docs-authoring over-recommendation on two UI/mobile scenarios. |
| 2026-07-02 | Codex | Windows, csr 0.1.0-rc.1 | `csr --version`; `csr --help`; `csr scan`; `csr audit`; `csr budget`; 3 route smoke checks; text and JSON Eval; `npm.cmd test` | pass with the same two known P2 failures | RC1-001 | Stable pre-release retest confirmed the 30-task result is unchanged: 28 complete, 2 failed, no missed required Skills, no-match accuracy 100.0%. |

## Real Task Records

Classification:

- `correct`: recommended Skills matched the expected result.
- `partial`: at least one useful Skill was recommended, but there was a miss or extra recommendation.
- `failed`: recommendation included a Skill that was explicitly expected to be excluded, or otherwise violated the expected result.

| ID | Date | Sanitized task prompt | Expected result | Actual result | Classification | Issue ID | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RW-001 | 2026-07-01 | Check which Skills are available in the current project and whether any are missing. | no-match for `route`; use `scan` instead | no recommendation | correct |  | This is a meta inspection task, not a Skill-routing task. |
| RW-002 | 2026-07-01 | Improve README installation instructions without changing product code. | `docs-authoring` | `docs-authoring` | correct |  | Documentation-only task routed correctly. |
| RW-003 | 2026-07-01 | Check whether a login API has an authorization bypass risk. | `security-review` | `security-review` | correct |  | Security task routed correctly. |
| RW-004 | 2026-07-01 | Improve a page from a screenshot and check mobile display. | `browser-validation`, `frontend-ui` | `browser-validation`, `frontend-ui`, `docs-authoring` | failed | RC1-001 | Correct primary Skills were selected, but `docs-authoring` was an extra excluded recommendation. |
| RW-005 | 2026-07-01 | Decide whether an intentionally vague task should return no-match. | no-match | no recommendation | correct |  | Ambiguous task returned no reliable recommendation. |
| RW-006 | 2026-07-01 | Register the decision about insufficient real RC1 validation tasks in the validation documents. | `docs-authoring` | `docs-authoring` | correct |  | Documentation and validation-log task routed correctly. |
| RW-007 - RW-030 | 2026-07-01 | Additional public-safe real validation tasks covering docs, UI, mobile, security, and no-match/simple work. | fixed expected Skill set per case | 26 correct, 1 additional `docs-authoring` over-selection | 24 correct, 1 failed within this range | RC1-001 | The second failure was another UI/mobile task where the correct primary Skills were selected but `docs-authoring` was extra. |

## Command Stability Records

| Date | Command | Data source | Success | Output checked | Notes |
| --- | --- | --- | --- | --- | --- |
| 2026-07-01 | `csr scan` | real project and `./examples/skills` | yes | Skill discovery and path hiding | Project-level Skill structure worked. Paths hidden by default. |
| 2026-07-01 | `csr audit` | real project and `./examples/skills` | yes | findings quality | Skill configuration was made consistent. |
| 2026-07-01 | `csr route` | 30 public-safe tasks | yes | recommendations/exclusions | 28 complete, 2 failed. Both failures over-recommended `docs-authoring` on UI/mobile tasks. |
| 2026-07-01 | `csr eval` | `validation/real-world.eval.yml` | yes | metrics/exit code | 30 cases: 28 complete, 2 failed. Failures are expected P2 `docs-authoring` over-recommendations. |
| 2026-07-01 | `csr budget` | `./examples/skills` | yes | token estimate/privacy | Budget command completed and did not expose private paths by default. |
| 2026-07-01 | `npm test` | repository tests | yes | test count | 21 tests passed. |
| 2026-07-02 | `csr eval` | `validation/real-world.eval.yml` | yes | text and JSON metrics | 30 cases: 28 complete, 2 failed. Same two P2 failures as RC1 summary. |
| 2026-07-02 | `csr scan --json` | `./examples/skills` | yes | JSON privacy | Paths were hidden as `(hidden path)` by default. |
| 2026-07-02 | `npm.cmd test` | repository tests | yes | test count | 21 tests passed. |

## Metrics Summary

| Metric | Current value | Target for stable `v0.1.0` |
| --- | ---: | ---: |
| Real tasks reviewed | 30 | 30+ |
| Complete | 28 | Track trend |
| Failed | 2 | Track trend |
| Required Skill Recall | 100.0% | >= 90.0% |
| Exclusion Accuracy | 91.7% | >= 90.0% |
| No-Match Accuracy | 100.0% | >= 90.0% |

## Release Decision Notes

| Date | Decision | Reason | Next action |
| --- | --- | --- | --- |
| 2026-07-01 | RC1 validation evidence complete | 30 real tasks are confirmed, required Skill recall is 100.0%, no-match accuracy is 100.0%, and the only remaining failures are two P2 over-recommendations on UI/mobile tasks | Prepare stable `v0.1.0` release materials. Do not mark RC1-001 as fixed. |
| 2026-07-01 | Recommend stable `v0.1.0` instead of `v0.1.0-rc.2` | The remaining issue is minor, repeated in a narrow UI/mobile pattern, and does not miss the correct primary Skills | Keep RC1-001 open for a future routing-quality improvement. |
