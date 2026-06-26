# Codex Skill Router

Codex Skill Router is a local-first tool concept for checking, testing, and improving how Codex Skills are selected for different tasks.

中文定位：

```text
帮助用户检查、测试和改进 Codex Skills 的自动选择效果。
```

## Current Status

This project is in the planning stage.

At this stage, the repository only contains product and collaboration documents. It does not contain executable program code yet.

## What It Will Do

The first version is planned around four commands:

- `csr scan`: scan project-level and user-level Skills.
- `csr audit`: check whether Skill metadata and descriptions are clear enough.
- `csr route`: predict which Skills are suitable for a user task.
- `csr eval`: run prepared test cases to evaluate routing quality.

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

- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Project Collaboration Rules](AGENTS.md)

## Planned v0.1.0 Release Criteria

The first release should only happen after:

- `scan` can discover real Skills;
- `audit` can find basic configuration problems;
- `route` can recommend Skills with explanations;
- `eval` can run a test set;
- core tests pass;
- type checks pass;
- build passes;
- README examples are executable;
- no secrets or private paths are committed;
- at least one demo sample exists;
- at least 30 routing test tasks exist.

## Maintainer Notes

The project owner provides product direction, value judgment, real usage feedback, and acceptance checks.

Codex handles technical planning, implementation, testing, fixes, and documentation maintenance.

All explanations for the project owner should use clear, plain Chinese.

