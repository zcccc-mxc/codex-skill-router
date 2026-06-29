# Codex Skill Router

Codex Skill Router is a local-first tool concept for checking, testing, and improving how Codex Skills are selected for different tasks.

中文定位：

```text
帮助用户检查、测试和改进 Codex Skills 的自动选择效果。
```

## Current Status

This project is in the early implementation stage.

At this stage, the repository contains product documents and a minimal CLI. The four core commands have basic local-first implementations.

## What It Will Do

The first version is planned around four commands:

- `csr scan`: scan project-level and user-level Skills.
- `csr audit`: check whether Skill metadata and descriptions are clear enough.
- `csr route`: predict which Skills are suitable for a user task.
- `csr eval`: run prepared test cases to evaluate routing quality.

Current implementation status:

- `scan`: implemented for local `SKILL.md` discovery and frontmatter reading.
- `audit`: implemented for basic configuration checks.
- `route`: implemented for local recommendations with explainable scoring, basic description understanding, phrase-level matching, local context hints, and project/user/source priority.
- `eval`: implemented for JSON and simple YAML test files, including include, exclude, optional, and threshold checks.

## Try The Current CLI Shell

No dependencies are required for the current CLI.

```bash
node src/cli.js --help
node src/cli.js scan
node src/cli.js scan ./examples/skills
node src/cli.js scan --path ./examples/skills
node src/cli.js scan --json ./examples/skills
node src/cli.js scan --show-paths ./examples/skills
node src/cli.js scan --json --show-paths ./examples/skills
node src/cli.js scan --brief ./examples/skills
node src/cli.js audit ./examples/skills
node src/cli.js audit --severity warning --path ./examples/skills
node src/cli.js route "优化现有的 Next.js 页面，并检查移动端显示"
node src/cli.js route "optimize frontend mobile layout" --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --json --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --output ./tmp-eval-report.md --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --min-required-recall 1 --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --min-complete-rate 1 --path ./examples/skills
```

Path privacy: CLI output hides local filesystem paths by default, including common local path fragments inside Skill descriptions. Use `--show-paths` only when you intentionally need full paths for local debugging.

Default scan behavior:

- walks upward from the current working directory looking for `.agents/skills`;
- stops at the current Git repository root;
- scans the user-level `$HOME/.agents/skills`;
- on Linux/macOS, also checks `/etc/codex/skills` when that directory exists;
- keeps legacy `.codex/skills` and `skills` directories, but marks their Skills as `legacy`;
- keeps `--path` for explicit custom directories.

The repository sample Eval file contains 50 routing tasks and uses only the public sample Skills under `examples/skills`.

## Local Route Context

`csr route` remains local-only and does not call Codex internals, AI services, MCP servers, or external APIs.

When available, it can use small local context hints to improve recommendations:

- `agents/openai.yaml`
- `.agents/openai.yaml`
- `package.json` dependency and script terms

Example context file:

```yaml
routing:
  - skill: docs-authoring
    when:
      - manual pages
      - usage guide
```

These hints are only used as explainable evidence when the user task contains matching terms. They do not modify Skills and do not replace the Skill `description`.

## Eval Files

`csr eval` supports `.yml`, `.yaml`, and `.json`. YAML files use standard YAML parsing, so folded text, literal text, arrays, nested metadata, and quoted strings are supported.

Recommended format:

```yaml
version: 1

cases:
  - id: frontend-mobile
    prompt: optimize frontend mobile layout
    mode: permissive
    category: frontend
    expected:
      include:
        - frontend-ui
      optional:
        - browser-validation
      exclude:
        - database-migration
    reason: Existing page layout work should use frontend UI support.
```

For compatibility, the top level may also be a YAML or JSON array of cases.

Eval modes:

- `permissive`: `include` must be recommended, `exclude` must not be recommended, `optional` may appear, and other recommendations are allowed.
- `strict`: `include` must be recommended, `exclude` must not be recommended, `optional` may appear, and any recommendation outside `include + optional` is counted as unexpected.
- no-match tests use `mode: strict` with empty `include`, `optional`, and `exclude`; they pass only when no Skill is recommended.

Eval metrics:

- Required Recall: included Skills that were recommended divided by all listed `include` Skills.
- Exclusion Accuracy: listed `exclude` Skills that were correctly not recommended.
- Exact Set Match: strict cases where recommendations match only required plus hit optional Skills.
- Unexpected Recommendation Rate: unexpected strict recommendations divided by all strict recommendations.
- No-Match Accuracy: no-match cases that returned no recommendations.
- Average Selected Skills: average number of recommended Skills per case.
- Complete Case Rate: complete cases divided by all cases.

Quality gates:

```bash
node src/cli.js eval ./examples/eval.yml --path ./examples/skills --min-required-recall 1
node src/cli.js eval ./examples/eval.yml --path ./examples/skills --min-exclusion-accuracy 1
node src/cli.js eval ./examples/eval.yml --path ./examples/skills --min-exact-match 0.8
node src/cli.js eval ./examples/eval.yml --path ./examples/skills --min-no-match-accuracy 0.8
node src/cli.js eval ./examples/eval.yml --path ./examples/skills --max-unexpected-rate 1
```

Markdown report:

```bash
node src/cli.js eval ./examples/eval.yml --output ./tmp-eval-report.md --path ./examples/skills
```

The sample Eval file currently contains 50 routing tasks, including 10 strict no-match cases.

To test the package-style `csr` command locally:

```bash
npm link
csr --help
csr eval ./examples/eval.yml --path ./examples/skills --min-complete-rate 1
```

Use `npm unlink -g codex-skill-router` when you no longer need the linked command.

Run tests:

```bash
npm test
```

On Windows PowerShell, if `npm test` is blocked by script policy, use:

```bash
npm.cmd test
```

## What It Will Not Do In v0.1.0

The first version will not include:

- user login;
- cloud server;
- database;
- SaaS dashboard;
- web admin UI;
- Skill marketplace;
- automatic control of Codex internal decisions;
- required external AI or API keys;
- automatic modification of user Skills.

## Product Principles

- Local first: user Skill content, paths, prompts, test data, and project code should not be uploaded by default.
- Read-only by default: the first version must not modify user Skills.
- Explainable: results must explain why a Skill is recommended or excluded.
- Honest limits: local routing prediction is not the same as Codex internal execution.
- Simple first: v0.1.0 should focus on reliable `scan`, `audit`, `route`, and `eval`.

## Documents

- [Contributing Guide](CONTRIBUTING.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Codex Skill Router 使用说明](docs/Codex%20Skill%20Router%20使用说明.md)
- [Project Collaboration Rules](AGENTS.md)

## Planned v0.1.0 Release Criteria

The first release should only happen after:

- `scan` can discover real Skills;
- `audit` can find basic configuration problems;
- `route` can recommend Skills with explanations;
- `eval` can run a test set;
- core tests pass;
- CI runs on GitHub Actions;
- package-style `csr` command works through `npm link`;
- README examples are executable;
- no secrets or private paths are committed;
- at least one demo sample exists;
- at least 30 routing test tasks exist.

## Maintainer Notes

The project owner provides product direction, value judgment, real usage feedback, and acceptance checks.

Codex handles technical planning, implementation, testing, fixes, and documentation maintenance.

All explanations for the project owner should use clear, plain Chinese.
