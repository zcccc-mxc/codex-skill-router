# Codex Skill Router Product Vision

## Final Positioning

Codex Skill Router will gradually become a local execution governance layer for Codex.

Its long-term goal is:

```text
automatic Skill selection
+ Token cost control
+ permission safety reminders
+ execution logs
+ result verification
```

Before a task runs, it should help select the smallest useful Skill set, estimate Token cost, identify permission risks, and define acceptance criteria.
During execution, it should record a structured and privacy-safe trace.
After execution, it should help verify whether the result matches the original task.

The project does not replace Codex, control Codex internals, or guarantee which Skills Codex will actually invoke. It provides local, explainable preparation and validation around Codex workflows.

## Five Core Modules

1. Skill Routing

   Discover local Skills, read their metadata, and predict which Skills are likely to fit a user task.

2. Token Budget

   Estimate the local metadata size and expected routing context cost before execution. This is an estimate only, not Codex internal token accounting.

3. Permission Safety

   Warn when a task may need higher-risk actions such as writing files, running network commands, publishing packages, pushing Git changes, or touching private data.

4. Execution Trace

   Record structured, redacted logs of what was planned, what was recommended, what was executed, and what evidence was produced.

5. Result Verification

   Compare task outcomes with acceptance criteria so users can decide whether the work is complete, partial, or failed.

## Execution Loop

### Before Execution

- scan available Skills;
- audit Skill metadata quality;
- route the task to the smallest useful Skill combination;
- estimate Token cost;
- identify permission and privacy risks;
- define expected outputs and acceptance criteria.

### During Execution

- record structured events;
- keep sensitive data out of public logs;
- distinguish user-approved actions from automatic suggestions;
- preserve enough evidence for later review.

### After Execution

- verify whether expected files, commands, tests, or outputs exist;
- compare actual results with acceptance criteria;
- summarize unresolved risks;
- convert routing mistakes into Eval cases.

## Local-First Principle

The default product mode must remain local-first:

- no required external AI service;
- no required API key;
- no cloud database;
- no background upload of Skills, prompts, logs, paths, or project files;
- no modification of user Skills unless a future write feature is explicitly requested and confirmed.

## Human Final Control

Codex Skill Router may recommend, warn, estimate, and verify, but the user remains the final decision maker.

Future write or execution features must make risky actions visible before they happen. Publishing, deleting, pushing, installing, or touching private data should require explicit user approval.

## Token Estimate vs Actual Usage

`csr budget` and future budget features estimate Token cost from local text length and known metadata.

They do not know Codex internal prompt construction, hidden context, model-specific tokenization, or actual runtime usage. Documentation and CLI output must clearly distinguish:

- estimated local metadata cost;
- actual Codex token usage, which this project cannot currently measure.

## Permission Risk Levels

Future permission safety checks should use explainable levels:

- `low`: read-only inspection, local metadata parsing, help/version output;
- `medium`: local file writes, test execution, package installation in the current project;
- `high`: Git push, package publish, release creation, network calls, credential-sensitive commands;
- `critical`: destructive filesystem changes, secret exposure risk, actions outside the intended workspace, or irreversible public publishing.

Risk labels are reminders, not a full security sandbox.

## Log Redaction Principle

Execution logs should be useful without leaking private information.

Public-safe logs should avoid:

- API keys, tokens, cookies, and passwords;
- private absolute paths;
- customer or supplier names;
- private repository names;
- internal Skill contents;
- product costs or confidential business details;
- screenshots or raw prompts containing private data.

Sensitive validation notes belong in `validation/private/`, which is ignored by Git.

## Result Verification Principle

Result verification should be based on evidence, such as:

- command exit codes;
- changed file lists;
- test results;
- generated reports;
- expected CLI output;
- user-defined acceptance criteria.

The verifier should report `complete`, `partial`, or `failed` and explain why. It should not hide failures to make a release look better.

## Current Limits

The current release candidate only provides the foundation:

- `csr scan`;
- `csr audit`;
- `csr route`;
- `csr eval`;
- `csr budget`.

It does not control Codex internal Skill selection. It does not execute tasks on behalf of Codex. It does not enforce permissions, measure real token usage, record full execution traces, or verify final task results yet.

Those capabilities belong to later roadmap stages.
