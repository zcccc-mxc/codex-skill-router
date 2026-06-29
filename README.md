# Codex Skill Router

[中文说明](README.zh-CN.md)

Codex Skill Router is a local-first CLI for inspecting, auditing, predicting, testing, and explaining Codex Skill routing quality.

Codex already has its own Skill selection behavior. This project does **not** replace it, control it, or claim to know Codex internal decisions. It helps users answer a different question:

> Are my local Skills discoverable, clearly described, and likely to route the way I expect?

## Current Status

Version: `0.1.0-rc.1`

Implemented commands:

- `csr scan`
- `csr audit`
- `csr route`
- `csr eval`
- `csr budget`

The tool is local-only, read-only by default, and does not call external AI services or APIs.

## Installation

For local development:

```bash
npm install
npm test
```

To test the package-style command locally:

```bash
npm link
csr --help
```

To remove the linked command later:

```bash
npm unlink -g codex-skill-router
```

## Five-Minute Quick Start

Use the public sample Skills:

```bash
node src/cli.js scan --path ./examples/skills
node src/cli.js audit --path ./examples/skills
node src/cli.js route "optimize existing page and check mobile display" --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --path ./examples/skills
node src/cli.js budget --path ./examples/skills
```

Expected sample Eval status:

```text
Total cases: 50
complete: 50
failed: 0
```

## scan

`scan` discovers local `SKILL.md` files and reads their YAML frontmatter.

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

## audit

`audit` checks Skill metadata quality.

```bash
csr audit --path ./examples/skills
csr audit --severity warning --path ./examples/skills
```

It detects issues such as missing `name`, missing `description`, short or vague descriptions, missing use conditions, missing exclusion conditions, duplicate names, and likely overlap.

## route

`route` predicts which Skills may fit a task and explains why.

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

It is still a local prediction, not Codex internal execution.

## eval

`eval` runs route test cases.

```bash
csr eval ./examples/eval.yml --path ./examples/skills
csr eval ./examples/eval.yml --json --path ./examples/skills
csr eval ./examples/eval.yml --output ./tmp-eval-report.md --path ./examples/skills
```

Supported formats:

- `.yml`
- `.yaml`
- `.json`

YAML uses the `yaml` package and supports standard YAML features such as arrays, quoted strings, folded text, and nested metadata.

Eval supports:

- `strict` and `permissive` modes;
- `include`;
- `optional`;
- `exclude`;
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

## budget

`budget` estimates local Skill metadata size. It is only an estimate.

```bash
csr budget --path ./examples/skills
csr budget --json --path ./examples/skills
csr budget --max-tokens 12000 --path ./examples/skills
```

Important limits:

- it does not use Codex internal token accounting;
- it does not call a model;
- it does not verify whether dependencies are installed or usable;
- it estimates from local Skill metadata length.

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

Dependency names from `package.json` are treated as declarations only. The router does not verify that a dependency works at runtime.

## JSON Output

Commands with `--json` return parseable JSON without ANSI color codes. JSON includes:

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

Backward-compatible top-level fields may also be present. The schema may evolve by `schemaVersion`.

## Exit Codes

```text
0 = success
1 = runtime error
2 = user input or configuration error
3 = eval quality gate failed
```

Audit findings do not fail the process by default.

## Privacy

By default, CLI output hides local paths, including common absolute path fragments in Skill descriptions.

The tool does not upload:

- Skill contents;
- local paths;
- task prompts;
- Eval data;
- project code.

Use `--show-paths` only when you intentionally need local paths for debugging.

## Development Commands

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

Future ideas, not part of this release candidate:

- richer route comparison reports;
- optional AI-assisted analysis;
- Skill description rewrite suggestions with dry-run;
- HTML reports;
- team registries;
- integrations with other agent systems.
