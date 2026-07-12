# Codex Skill Router

[中文说明](README.zh-CN.md)

> Scan, audit, route, and test Codex Skills locally, without API keys or uploading Skill content.

Codex Skill Router is a local-first CLI for checking whether Codex Skills are discoverable, clearly described, and likely to route to the right task.

It is built for people who maintain multiple Codex Skills and want a simple way to inspect, audit, predict, test, and explain local Skill routing behavior.

```text
scan local Skills
audit Skill metadata
predict likely Skills for a task
evaluate routing test cases
estimate local Skill metadata budget
```

Codex already has its own Skill selection behavior. This project does **not** replace Codex, control Codex internals, or claim to know exactly what Codex will invoke. It provides a local, explainable quality check around your Skills.

## Try It In 30 Seconds

```bash
npm install -g codex-skill-router
csr scan
csr audit
csr route "check login authorization bypass"
```

Use `csr scan` to inventory local Skills, `csr audit` to find metadata issues, and `csr route` to get an explainable local routing prediction. Paths stay hidden by default.

## Current Status

Version: `0.1.0`

Implemented commands:

- `csr scan`
- `csr audit`
- `csr route`
- `csr eval`
- `csr budget`

Local-first by default:

- no API key required;
- no external AI service;
- no cloud database;
- no Skill upload;
- no modification of user Skill files.

## Install

Install from npm:

```bash
npm install -g codex-skill-router
csr --help
```

Current local development install:

```bash
git clone https://github.com/zcccc-mxc/codex-skill-router.git
cd codex-skill-router
npm install
npm link
csr --help
```

To remove the linked command later:

```bash
npm unlink -g codex-skill-router
```

## 60-Second Tryout

Use the sample Skills included in this repository:

```bash
csr scan --path ./examples/skills
csr route "check browser rendering and mobile viewport behavior" --path ./examples/skills
csr eval ./examples/eval.yml --path ./examples/skills
```

Expected shape of the result:

```text
Found 10 Skills
Recommended: frontend-ui, browser-validation
Eval: 50 complete, 0 failed
```

If you have not linked `csr`, use the local Node entry:

```bash
node src/cli.js scan --path ./examples/skills
node src/cli.js route "check browser rendering and mobile viewport behavior" --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --path ./examples/skills
```

## Who This Is For

Use Codex Skill Router if you:

- write or maintain Codex Skills;
- have multiple local Skills and want to know which ones are discoverable;
- want to check whether Skill descriptions are clear enough;
- want to test routing behavior before changing Skill metadata;
- want public-safe evidence that routing quality is improving.

## Commands

### `csr scan`

Discover local `SKILL.md` files and read their YAML frontmatter.

```bash
csr scan
csr scan --path ./examples/skills
csr scan --json --path ./examples/skills
csr scan --brief --path ./examples/skills
csr scan --show-paths --path ./examples/skills
```

Default scan behavior:

- walks upward from the current working directory looking for `.agents/skills`;
- stops at the current Git repository root;
- scans `$HOME/.agents/skills`;
- on Linux/macOS, also checks `/etc/codex/skills` when it exists;
- keeps legacy `.codex/skills` and `skills` directories, marked as `legacy`;
- keeps `--path` for explicit custom directories.

Paths are hidden by default. Use `--show-paths` only for local debugging.

### `csr audit`

Check Skill metadata quality.

```bash
csr audit --path ./examples/skills
csr audit --severity warning --path ./examples/skills
```

It can detect missing names, missing descriptions, weak descriptions, missing use cases, missing exclusion conditions, duplicate names, and likely overlap.

### `csr route`

Predict which Skills may fit a task and explain why.

```bash
csr route "check login authorization bypass" --path ./examples/skills
csr route "only update README installation instructions" --path ./examples/skills
```

Routing uses local rule-based evidence:

- Skill name matches;
- Skill description matches;
- exclusion text penalties;
- broad-description penalties;
- simple word-form handling;
- phrase-level concepts;
- optional local context hints;
- project/user/source priority.

This is a local prediction, not Codex internal execution.

### `csr eval`

Run routing test cases.

```bash
csr eval ./examples/eval.yml --path ./examples/skills
csr eval ./examples/eval.yml --json --path ./examples/skills
csr eval ./examples/eval.yml --output ./tmp-eval-report.md --path ./examples/skills
```

Eval supports:

- `.yml`, `.yaml`, and `.json` files;
- `strict` and `permissive` modes;
- `include`, `optional`, and `exclude`;
- strict no-match cases;
- Required Recall;
- Exclusion Accuracy;
- Exact Set Match;
- Unexpected Recommendation Rate;
- No-Match Accuracy;
- Markdown reports;
- quality gates.

Quality gate examples:

```bash
csr eval ./examples/eval.yml --path ./examples/skills --min-complete-rate 1
csr eval ./examples/eval.yml --path ./examples/skills --min-required-recall 1
csr eval ./examples/eval.yml --path ./examples/skills --min-exclusion-accuracy 1
csr eval ./examples/eval.yml --path ./examples/skills --min-no-match-accuracy 1
```

### `csr budget`

Estimate local Skill metadata size. This is a rough estimate, not Codex internal token accounting.

```bash
csr budget --path ./examples/skills
csr budget --json --path ./examples/skills
csr budget --max-tokens 12000 --path ./examples/skills
```

## Local Route Context

`route` can read optional local context hints:

- `agents/openai.yaml`
- `.agents/openai.yaml`
- `package.json` dependency and script terms

Example:

```yaml
routing:
  - skill: docs-authoring
    when:
      - manual pages
      - usage guide
```

These hints are only used as explainable evidence when task terms match. They do not modify Skills and do not replace the Skill `description`.

## JSON Output

Commands that support `--json` return parseable JSON without ANSI color codes. JSON includes:

```json
{
  "schemaVersion": 1,
  "command": "scan",
  "success": true,
  "summary": {},
  "data": {},
  "warnings": [],
  "errors": []
}
```

Paths are hidden by default in JSON output.

## Exit Codes

```text
0 = success
1 = runtime error
2 = user input or configuration error
3 = eval quality gate failed
```

Audit findings do not fail the process by default.

## Privacy

The tool does not upload:

- Skill contents;
- local paths;
- task prompts;
- Eval data;
- project code.

Use `--show-paths` only when you intentionally need local paths for debugging.

## Validation Status

`v0.1.0-rc.1` completed RC validation before the stable `v0.1.0` release decision:

```text
30 real tasks reviewed
28 complete
2 failed
Required Skill Recall: 100.0%
No-Match Accuracy: 100.0%
Exclusion Accuracy: 91.7%
```

Known P2 issue:

```text
docs-authoring may be over-recommended in a small number of web/mobile tasks.
The correct primary Skills are still selected.
This does not block v0.1.0.
```

See:

- [RC1 Validation Log](docs/RC1_VALIDATION_LOG.md)
- [RC1 Issue Triage](docs/RC1_ISSUE_TRIAGE.md)
- [Stable Release Checklist](docs/STABLE_RELEASE_CHECKLIST.md)

## Development

```bash
npm ci
npm test
node src/cli.js --help
node src/cli.js scan --help
node src/cli.js audit --help
node src/cli.js route --help
node src/cli.js eval --help
node src/cli.js budget --help
npm pack --dry-run
```

There is no build step and no TypeScript typecheck in this JavaScript project.

## Current Limitations

- Local prediction is not Codex actual Skill invocation.
- The router is rule-based and has limited semantic understanding.
- Dependency declarations are not dependency availability checks.
- `budget` is a rough estimate, not real token accounting.
- The tool does not modify user Skills.
- The tool does not connect to external AI services.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Routing mistakes are especially useful when converted into Eval cases.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md).
