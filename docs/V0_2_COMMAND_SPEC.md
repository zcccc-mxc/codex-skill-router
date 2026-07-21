# v0.2 Command Specification

P1 implements `csr route "task" --json`. P2 implements the read-only `plan` foundation. P3 adds local task-text permission predictions and confirmation recommendations. P4 adds pre-execution acceptance criteria and suggested verification methods; it does not execute, approve, enforce, or verify any action.

## Commands

```bash
csr route "task" --json
csr plan "task"
csr plan "task" --json
csr plan "task" --path <path>
csr plan "task" --show-paths
csr plan "task" --max-tokens <number>
```

## Shared rules

- `task` is one required, non-empty task description.
- `--path <path>` uses one explicit local Skill directory and follows the existing scan behavior for custom paths.
- Without `--path`, discovery follows the existing default local scan roots.
- Default text and JSON output hide absolute paths. `--show-paths` reveals only local path fields for intentional debugging.
- `--json` writes parseable JSON only: no ANSI control characters or explanatory text outside the JSON value.
- Invalid command input returns exit code `2`; successful planning returns `0`; the interface introduces no new exit code.
- These commands inspect and predict only. They do not execute a Shell command, change files, install packages, modify Git state, or publish anything.

## `csr route "task" --json`

P1 adds a machine-readable view of the existing local route prediction. It uses the same `routeTask()` result and scoring behavior as text `route`; it does not create a second routing algorithm.

The response uses the JSON envelope in [V0_2_JSON_SCHEMA.md](V0_2_JSON_SCHEMA.md). It includes recommended and not-recommended Skills, explainable evidence, and warnings. It does not include Skill bodies, secrets, or paths unless `--show-paths` is present. `csr route --json` without a task returns parseable JSON with `success: false`, a `MISSING_TASK` error, and exit code `2`.

## `csr plan "task"`

Creates a plain-language pre-execution plan. P4 text output uses these headings:

```text
Task
Recommended Skills
Token Estimate
Expected Actions
Permission Risks
Required Confirmations
Acceptance Criteria
Agent Strategy
Warnings
Unknowns
```

P5 also shows an Agent Strategy: a local suggestion for `single`, `parallel`, or `sequential` roles. It never creates, invokes, or controls an agent. Criteria remain pre-execution guidance; no check is run and no PASS/FAIL result is produced.

## `csr plan "task" --json`

Returns the stable JSON plan schema. JSON is intended for local downstream tooling; it is not an execution request. P4 fills `acceptanceCriteria` and `acceptanceSummary` with pre-execution planning data. It never contains a verification result.

## `csr plan "task" --path <path>`

Plans against the specified local Skill directory. It accepts the existing path-validation rules. The supplied path is hidden in normal output and JSON unless `--show-paths` is also supplied.

## `csr plan "task" --show-paths`

Shows local Skill or scan paths needed for debugging a local plan. It does not reveal Skill bodies, secret values, environment variables, or paths inferred from the task itself. Documentation must warn users not to paste path-revealing output into public issues without review.

## `csr plan "task" --max-tokens <number>`

Accepts a positive whole number. It is a local planning cap for estimated metadata from recommended Skills. It may cause lower-priority recommendations to be omitted or marked as excluded by the cap. The output must state the cap and that it is not a real Codex Token limit, billing limit, or runtime guarantee. Invalid, zero, fractional, or negative values are input errors.

In P2, the threshold applies to all available valid Skill metadata. It adds a warning when exceeded but does not alter routing recommendations or fail the command.

## Text wording requirements

Use short, ordinary-language explanations. For example, say “may need to change project files” rather than only “file-write permission.” Keep the canonical category code in parentheses when it helps users compare JSON and text. Do not overstate confidence, infer an unmentioned deployment, or describe permissions as approved.
