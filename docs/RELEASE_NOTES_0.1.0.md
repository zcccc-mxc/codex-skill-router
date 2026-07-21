# Release Notes: 0.1.0

Published to npm: 2026-07-03
GitHub Release published: 2026-07-12

Codex Skill Router `v0.1.0` is the first stable release of the local Skill routing quality checker for Codex.

## What It Does

Codex Skill Router helps users inspect, audit, route, evaluate, and estimate local Codex Skills before relying on them in real work.

It answers practical questions:

- Which Skills are discoverable?
- Are Skill descriptions clear enough?
- Which Skills look suitable for this task?
- Did a routing change improve or regress behavior?
- How large is the local Skill metadata context?

## Install

Install the published npm package:

```bash
npm install -g codex-skill-router
csr --help
```

## Release Status

`v0.1.0` is published on npm as `codex-skill-router@0.1.0`.
The matching Git tag and GitHub Release are available at:

- https://www.npmjs.com/package/codex-skill-router
- https://github.com/zcccc-mxc/codex-skill-router/releases/tag/v0.1.0

Repository install:

```bash
git clone https://github.com/zcccc-mxc/codex-skill-router.git
cd codex-skill-router
npm install
npm link
csr --help
```

## Main Commands

```bash
csr scan
csr audit
csr route "check login authorization bypass"
csr eval ./examples/eval.yml --path ./examples/skills
csr budget
```

## Local-First Guarantees

- No API key required.
- No external AI service required.
- No cloud database.
- No Skill upload.
- No modification of user Skill files.
- Paths are hidden by default.

## RC1 Validation Result

`v0.1.0-rc.1` completed real validation before this stable release decision:

```text
30 real tasks reviewed
28 complete
2 failed
Required Skill Recall: 100.0%
No-Match Accuracy: 100.0%
Exclusion Accuracy: 91.7%
npm test: 21 tests passed
```

Known P2 issue:

```text
docs-authoring may be over-recommended in a small number of web/mobile tasks.
The correct primary Skills are still selected.
This does not block v0.1.0.
```

## Current Limitations

- Local prediction is not Codex actual Skill invocation.
- Routing is rule-based and has limited semantic understanding.
- `budget` is a rough estimate, not real Codex token accounting.
- The tool does not modify user Skills.
- The tool does not call external AI services.

## Reporting Routing Errors

When reporting a routing problem, include:

- command used;
- sanitized task prompt;
- expected `include`, `optional`, and `exclude`;
- actual recommendations;
- whether no-match was expected.

Remove private paths, secrets, customer names, and private Skill contents before posting.
