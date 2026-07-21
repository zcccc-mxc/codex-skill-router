# Codex Skill Router v0.2.0-rc.1

## What is new

This candidate adds two ways to inspect work before it starts:

- `csr route "task" --json` gives local tools a stable, private-by-default routing result.
- `csr plan "task"` combines a suggested Skill list, a rough local metadata Token estimate, predicted actions, permission reminders, acceptance criteria, and a suggested work order.

The plan can recommend one worker, parallel work, or sequential work. It only suggests; it never creates agents or starts work.

## Try the candidate

Stable users keep using:

```bash
npm install -g codex-skill-router
```

Candidate testers can use:

```bash
npm install -g codex-skill-router@next
# or
npm install -g codex-skill-router@0.2.0-rc.1
```

Then try:

```bash
csr plan "Update a page and run tests without changing business logic"
csr plan "Install Playwright and add browser tests" --json
```

## What the tool does not do

- It does not execute Shell commands or user tasks.
- It does not modify files, install packages, publish npm packages, create GitHub Releases, or push Git commits.
- It does not control Codex internals or start subagents.
- It does not call an external AI service or upload Skill content.
- It does not measure actual Codex Token use or automatically decide that work is complete.

## Known limitations

The output is based on task wording. It is a local prediction, not a record of work that happened. Token estimates are rough metadata estimates. Some explicit negative phrasing, including `without publishing`, `不要访问网络`, and `不要 push`, can still produce an unnecessary permission reminder. Please review the plan before acting.

`docs-authoring` can also be over-recommended on a small number of web/mobile routing tasks.

## Feedback

If a suggested Skill, warning, or acceptance item looks wrong, open an issue with a short task description, the command used, and the redacted output. Do not include local paths, secrets, or private project content.
