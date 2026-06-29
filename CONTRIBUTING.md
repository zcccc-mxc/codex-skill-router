# Contributing to Codex Skill Router

Thanks for helping improve Codex Skill Router.

## Scope

The `0.1.0-rc.1` scope is limited to:

- `csr scan`
- `csr audit`
- `csr route`
- `csr eval`
- `csr budget`

Please do not add SaaS features, login, databases, web dashboards, required external AI, MCP servers, or automatic Skill rewriting in this release line.

## Development Setup

```bash
npm ci
npm test
node src/cli.js --help
```

There is no build step and no TypeScript typecheck in the current JavaScript implementation.

## Testing

Run:

```bash
npm test
node src/cli.js eval ./examples/eval.yml --path ./examples/skills --min-complete-rate 1
```

New core behavior should include focused tests in `test/cli.test.js`.

## Turning a Routing Mistake into an Eval Case

If `csr route` recommends the wrong Skill:

1. Save the user task as `prompt`.
2. Put required Skills in `expected.include`.
3. Put acceptable extra Skills in `expected.optional`.
4. Put wrong Skills in `expected.exclude`.
5. Choose `strict` when no unexpected Skills should appear.
6. Add the case to `examples/eval.yml` only when it is a general, non-private example.

Do not submit private Skill contents, private paths, company internals, secrets, logs, or local cache files.

## Pull Requests

Before opening a PR:

- run `npm test`;
- verify README command examples still work;
- verify no private paths or secrets are included;
- update docs for user-facing behavior changes;
- keep local-first and read-only behavior intact.

## Communication

Explain:

- what problem changed;
- how to test it;
- which files changed;
- known limits or risks.
