# RC1 Validation Plan

Version under validation: `v0.1.0-rc.1`

Validation window: 14 days after the GitHub prerelease.

This plan is for real usage validation only. It must not change routing logic, scoring weights, Eval answers, or product features.

## Goals

- Confirm that a non-programmer can install and run Codex Skill Router.
- Confirm that `scan`, `audit`, `route`, `eval`, and `budget` work on real local Skill layouts.
- Collect at least 30 real routing tasks from actual project work.
- Identify routing mistakes without immediately changing the algorithm.
- Confirm that default output does not expose private local paths or sensitive business details.
- Decide whether the next release should be stable `v0.1.0` or another release candidate `v0.1.0-rc.2`.

## 14-Day Schedule

| Days | Focus | Evidence to collect |
| --- | --- | --- |
| 1-2 | Installation and first-run checks | Install command, `csr --help`, version output, OS, Node version |
| 3-4 | Skill discovery | `csr scan`, `csr scan --json`, missing or unexpected Skills |
| 5-6 | Metadata quality | `csr audit`, unclear descriptions, false warnings |
| 7-9 | Real routing tasks | At least 15 real `csr route` prompts with expected and actual results |
| 10-11 | Eval conversion | Add reviewed real tasks to `validation/real-world.eval.yml` |
| 12 | Privacy checks | Confirm outputs hide paths and do not include customer or business secrets |
| 13 | Stability checks | Re-run tests, sample commands, and real-world Eval |
| 14 | Release decision | Choose stable `v0.1.0`, `v0.1.0-rc.2`, or delay |

## Installation Checks

Record:

- OS and version.
- Node.js version.
- Install method used.
- `csr --version` output.
- Whether `csr --help` works.
- Any permission, PATH, or dependency problem.

## Scan Checks

Run:

```bash
csr scan
csr scan --json
csr scan --show-paths
```

Confirm:

- Project-level Skills are discovered.
- User-level Skills are discovered.
- Legacy directories are marked as legacy.
- JSON output is parseable.
- Default output hides paths.
- No Skill files are modified.

## Route Checks

For each real task, record:

- The exact prompt after removing private details.
- Expected Skill or no-match result.
- Actual recommended Skill list.
- Recommended reasons.
- Excluded Skills and reasons.
- Whether the result is correct, partially correct, or wrong.

Do not edit the route algorithm during the validation window. Convert repeated mistakes into issue records first.

## Eval Checks

Use `validation/real-world.eval.yml` only for reviewed real tasks.

Do not fill the file with fake tasks just to reach a target count. The stable release gate requires real usage tasks.

## When There Are Not Enough Real Tasks

If fewer than 30 real tasks are available during the validation window:

- do not invent tasks and count them as real validation;
- do not promote the release candidate to stable `v0.1.0`;
- continue validating `v0.1.0-rc.1` during normal project use;
- keep a separate backlog of future scenario types if useful, but do not include those scenarios in real-world Eval metrics until they are confirmed by the project owner as real tasks;
- add a task to `validation/real-world.eval.yml` only after the project owner confirms the sanitized prompt, expected includes, optional Skills, excludes, and no-match allowance.

This rule keeps the validation evidence honest. A small real dataset is better than a large artificial one.

Run:

```bash
csr eval validation/real-world.eval.yml --path ./examples/skills
csr eval validation/real-world.eval.yml --json --path ./examples/skills
```

Use the actual local Skill path when validating private Skills, but do not commit private Skill contents or paths.

## Privacy Checks

Never commit:

- customer names;
- private repository names;
- product cost or supplier data;
- internal Skill text;
- screenshots with private data;
- local absolute paths;
- API keys, tokens, or secrets.

Use `validation/private/` for sensitive notes. That directory is ignored by Git.

## Stable vs rc.2 Rules

Move toward stable `v0.1.0` only if:

- at least 30 real tasks are reviewed;
- no P0 issue is open;
- no unresolved P1 issue blocks normal use;
- the five CLI commands are stable;
- no privacy leak is found;
- tests and GitHub CI pass;
- documentation matches actual behavior.

Create `v0.1.0-rc.2` instead if:

- a P0 issue was fixed after rc.1;
- a P1 routing, install, scan, Eval, or privacy issue needs another public candidate;
- README, package, or CLI behavior materially changed;
- real-world Eval shows frequent false positives or false negatives.

Delay release if:

- install fails for project users;
- local output leaks sensitive data;
- fewer than 30 real tasks have been reviewed;
- CI or local tests are failing.
