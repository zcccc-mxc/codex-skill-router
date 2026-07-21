# Codex Skill Router Roadmap

This roadmap describes product direction only. Later-stage items are not part of the current release candidate unless explicitly implemented and validated.

## v0.1: Skill Routing Foundation

Goal: make local Skills discoverable, auditable, routable, and testable.

Scope:

- scan local Skill directories;
- audit Skill metadata quality;
- predict likely Skill matches for a task;
- run Eval cases against the route logic;
- estimate local Skill metadata budget.

Current commands:

- `csr scan`
- `csr audit`
- `csr route`
- `csr eval`
- `csr budget`

## v0.2: Task Plan & Permission Safety

Goal: prepare safer execution before work starts.

Status: `v0.2.0-rc.1` candidate prepared for human review; it is not yet published.

Planned direction:

- add machine-readable `csr route --json` output for downstream tooling;
- summarize the intended task plan;
- P2 foundation: combine local routing with all-Skill and recommended-Skill metadata budget estimates;
- P3: add local task-text permission-risk predictions and confirmation recommendations without execution or enforcement;
- P4: add pre-execution acceptance criteria and suggested verification methods without running verification;
- P5: add local Agent Strategy recommendations without creating or controlling agents;
- P6: validate v0.2 planning output and release readiness without adding product features;
- identify likely file, network, Git, package, and publish actions;
- label permission risk levels;
- ask for clearer human confirmation before high-risk actions;
- keep all checks local-first.

## v0.3: Execution Trace

Goal: record what happened during a task in a structured, privacy-safe way.

Planned direction:

- record route decisions;
- record approved actions;
- record command summaries and exit codes;
- redact secrets and private paths;
- support public-safe validation logs.

## v0.4: Result Verification

Goal: check whether task results satisfy the original request.

Planned direction:

- define acceptance criteria before execution;
- verify changed files, command results, tests, and generated outputs;
- classify outcomes as complete, partial, or failed;
- convert failures into reproducible validation cases.

## v0.5: Governed Execution

Goal: combine routing, budget, permission safety, trace, and verification into a governed local workflow.

Planned direction:

- recommend minimal Skill combinations;
- estimate cost and risk before execution;
- record privacy-safe traces during execution;
- verify results afterward;
- keep the user in final control.

This version still should not claim to control Codex internals. It should remain a local governance layer around Codex workflows.
