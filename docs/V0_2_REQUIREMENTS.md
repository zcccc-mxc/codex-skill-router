# v0.2 P0 Requirements: Task Plan & Permission Safety

## Purpose

v0.2 helps a person understand a proposed task before work starts. `csr plan "task"` will locally suggest the smallest useful Skill set, give a clearly labelled local Token estimate, list likely actions and permission risks, identify actions that need human confirmation, and propose acceptance criteria.

It solves a planning and communication problem: a user should be able to see what may be needed before asking an agent or a developer to act. It does not execute the task.

## Target users

- People maintaining local Codex Skills and several software projects.
- Project owners who need a plain-language pre-work checklist.
- Developers who want a repeatable, local planning record before they begin a change.

## In scope

The v0.2 first release will add a read-only `csr plan` command. Its workflow is:

1. Read the task description supplied by the user.
2. Discover Skills using the same local scan scope as existing commands, or an explicit `--path`.
3. Use the local routing prediction to recommend the smallest useful Skill combination.
4. Estimate the local metadata cost for the recommended Skills, with an explicit estimate label.
5. Infer likely actions and permission reminders from the task wording and available local evidence.
6. Mark high- and critical-risk actions as requiring human confirmation.
7. Generate concise pre-execution acceptance criteria from task goals, explicit constraints, and generic predicted actions; list unknown information.
8. Print a human-readable plan or a stable JSON document. No action is performed.
9. Provide local Agent Strategy advice without creating or controlling agents.

`scan` remains the inventory command. `route` remains the explainable local Skill-matching prediction. `budget` remains the all-discovered-Skill metadata budget command. `plan` composes their planning information for one task; it must not claim that Codex will invoke a Skill or perform an action.

## Local-first and privacy

The command must work without an API key, external AI service, cloud database, or Skill upload. It must not change user Skill files. Default output hides absolute paths, Skill bodies, secrets, environment-variable values, and unredacted private task data. `--show-paths` is an explicit local-debugging choice only.

## Explicit limits

- The plan is a local, explainable prediction, not control or proof of Codex internal execution.
- Permission risks are reminders, not a security sandbox, operating-system permission system, or policy enforcement mechanism.
- Token numbers estimate selected local Skill metadata only. They are not real model Token use, hidden-context size, or runtime billing.
- Expected actions are possibilities inferred before work; they do not prove an action occurred.
- Acceptance criteria are proposed checks for a person to review. v0.2 does not automatically judge final task results.

The human user owns the final decision to proceed, change the plan, approve a risky action, or accept the finished work.

## Out of scope and prohibited work

v0.2 must not add:

- `csr run`;
- automatic Shell execution;
- automatic file modification or deletion;
- automatic dependency installation;
- automatic Git commit or push;
- automatic Release creation or npm publishing;
- cloud databases or external AI services;
- complete execution logs;
- a final-result automatic decision system.

It also does not change the existing router scoring, keyword lists, Eval expectations, or the open `docs-authoring` over-recommendation issue.

## Example: expected plan

Task:

```text
Optimize an existing Next.js page and verify its mobile layout without changing business logic.
```

Expected text shape (illustrative, not a record of work already done):

```text
Task
  Optimize an existing Next.js page and verify its mobile layout without changing business logic.

Recommended Skills
  - frontend-ui (recommended): existing page layout and mobile display work.
  - browser-validation (optional): use when browser or device-layout verification is available.
  - docs-authoring is not recommended for this task.

Token Estimate
  Estimated local metadata for recommended Skills: unknown until Skills are scanned.
  This is an estimate, not actual Codex Token usage.

Expected Actions
  - file-read: required, to inspect the existing page and its styles.
  - file-write: possible, to make the approved layout change.
  - shell: possible, to run local tests or a development server.
  - browser/local service: possible, to inspect the mobile layout.
  - git-push and package-publish: not-required for this task.

Permission Risks
  File writes and local Shell tests are medium risk reminders. No high-risk action is required from the stated task.

Required Confirmations
  None known from the stated task. If the plan later includes publishing, pushing, installing packages, or a network action, ask first.

Acceptance Criteria
  - The target page is usable at the agreed mobile viewport(s).
  - Business logic and user-visible behavior outside the layout remain unchanged.
  - Relevant available tests or browser checks have a recorded result.

Warnings
  The plan is a local prediction and does not perform the change or the checks.

Unknowns
  unknown: target page, supported mobile viewport(s), existing test command, and whether a browser/local service is available.
```

## Locked design decisions

1. **Reuse `routeTask()`: yes.** `plan` must call the existing local route engine through a small adapter, not duplicate or retune routing. P1 may add `route --json` serialization around the same result.
2. **Token scope: recommended Skills only.** `plan` reports the estimated local metadata for its recommended set, and separately reports `unknown` when no valid recommendation exists. `budget` remains the command for all discovered Skills. A user-supplied `--max-tokens` caps the planning recommendation budget; it never measures actual use.
3. **Possible versus required:** mark an action `required` only when the stated task necessarily needs it; mark it `possible` when it is a common implementation or verification path but alternatives exist; use `unknown` when the wording and local evidence are insufficient; use `not-required` only when the task explicitly does not need it or its absence follows directly from the task.
4. **Avoid alert fatigue:** emit only categories supported by task wording, selected Skill metadata, or known command intent; use `unknown` rather than guessing; do not turn every theoretical permission into a warning; require confirmation only for high or critical actions that are `required` or `possible` with concrete evidence.
5. **Acceptance criteria without industry keyword lists:** derive a small reusable set from task verbs and declared constraints (for example, change, verify, preserve, test, output), then state missing facts as `unknown`. Do not add a large hard-coded industry taxonomy.
6. **Configuration files: no for v0.2 first release.** The P0 interface has no configuration system. Revisit only after real validation shows a repeated, evidence-backed need.
7. **`route --json`: yes, P1 first item.** The stable serializer should land before `plan --json` so both commands share one JSON envelope and recommendation representation.
8. **Deferred work:** execution traces belong to v0.3; automated result verification belongs to v0.4; governed execution, any `run` concept, and enforceable controls are no earlier than v0.5 and need a separate approved scope.
