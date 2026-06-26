# Contributing to Codex Skill Router

Thanks for your interest in Codex Skill Router.

This project is currently in the planning stage. Before contributing code, please read:

- [README.md](README.md)
- [Product Requirements](docs/PRODUCT_REQUIREMENTS.md)
- [Project Collaboration Rules](AGENTS.md)

## Project Scope

The first version focuses only on four planned commands:

- `csr scan`
- `csr audit`
- `csr route`
- `csr eval`

Please do not add large features outside this scope for v0.1.0.

## Good First Contributions

Helpful contributions at this stage include:

- improving product wording;
- clarifying user scenarios;
- adding realistic routing test ideas;
- finding unclear or conflicting requirements;
- suggesting simple acceptance criteria;
- improving documentation structure.

## Please Avoid For Now

Please do not add these in early contributions unless they have been discussed first:

- SaaS features;
- login or account systems;
- databases;
- web admin dashboards;
- required external AI providers;
- automatic modification of user Skills;
- MCP server implementation;
- adapters for other coding agents;
- complex security scanners.

## Product Principles

Contributions should preserve these principles:

- local first;
- read-only by default;
- explainable results;
- honest limits about local prediction versus Codex internal behavior;
- no required external AI for the first version;
- simple and stable before broad feature coverage.

## Documentation Style

Documentation should be clear enough for non-programmers to understand.

Prefer:

- plain language;
- concrete examples;
- short sections;
- clear acceptance criteria;
- explicit risks and limitations.

Avoid:

- unexplained technical jargon;
- vague promises;
- claiming the tool can control Codex internal routing;
- adding implementation detail before product behavior is clear.

## Code Contributions

Code contributions are not the focus until the project planning documents are stable.

When code work begins, every core feature should include:

- focused tests;
- clear error messages;
- type checking;
- build verification;
- no hidden network dependency;
- no default writes to user Skill files.

## Pull Request Checklist

Before opening a pull request, check:

- The change matches the current project scope.
- No private paths, secrets, logs, cache files, or build outputs are included.
- Documentation uses clear language.
- New behavior has an acceptance path a non-programmer can follow.
- Out-of-scope ideas are marked as future roadmap, not v0.1.0 work.

## Communication

When proposing changes, explain:

1. what problem the change solves;
2. who benefits from it;
3. what changed;
4. how to review it;
5. any known risks or limits.

