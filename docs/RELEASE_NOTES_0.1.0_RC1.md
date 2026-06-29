# Release Notes Draft: 0.1.0-rc.1

Date: 2026-06-29

This is a release candidate, not a final stable release.

## What This Version Solves

`0.1.0-rc.1` makes Codex Skill Router usable as a local CLI for checking whether Skills are discoverable, well-described, and likely to route as expected.

## Main Commands

- `csr scan`: discover local Skills.
- `csr audit`: check Skill metadata quality.
- `csr route`: predict likely Skills for a task.
- `csr eval`: run routing regression tests.
- `csr budget`: estimate local Skill metadata budget.

## Installation

Local development:

```bash
npm ci
npm test
```

Local command simulation:

```bash
npm link
csr --help
```

## Quick Start

```bash
csr scan --path ./examples/skills
csr audit --path ./examples/skills
csr route "optimize existing page and check mobile display" --path ./examples/skills
csr eval ./examples/eval.yml --path ./examples/skills
csr budget --path ./examples/skills
```

## Local-First and Privacy

The tool does not upload Skill contents, task prompts, Eval data, local paths, or project code. Paths are hidden by default.

## Known Limitations

- Local prediction is not Codex actual Skill invocation.
- Routing is rule-based and has limited semantic understanding.
- Dependency declarations are not dependency availability checks.
- `budget` is a rough estimate, not real token accounting.
- The tool does not modify user Skills.
- The tool does not call external AI services.

## Reporting Routing Errors

Use the GitHub "Routing error" issue template. Include:

- command;
- task prompt;
- expected include/optional/exclude;
- actual recommendations;
- whether strict behavior is expected.

Remove private paths, secrets, and private Skill contents before submitting.

## Why This Is an RC

This version needs real user testing across different local Skill layouts before a stable `v0.1.0` release.

## What Users Should Test

- `csr scan` on real Skill directories;
- `csr audit` suggestions;
- `csr route` recommendations for real tasks;
- `csr eval` using a small custom Eval file;
- `csr budget` output on a real Skill set;
- path hiding behavior before sharing output publicly.
