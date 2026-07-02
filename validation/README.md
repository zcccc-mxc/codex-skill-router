# RC1 Real-World Validation

This directory stores public-safe validation materials for `v0.1.0-rc.1`.

## Files

- `real-world.eval.yml`: reviewed real routing tasks that are safe to commit.
- `private/`: private notes, raw prompts, internal Skill details, customer names, screenshots, and sensitive business context. This directory is ignored by Git.

## Privacy Rules

Do not commit:

- customer names;
- private repository names;
- local absolute paths;
- private Skill contents;
- product costs, supplier names, or internal business data;
- API keys, tokens, cookies, passwords, or secrets;
- screenshots containing private data.

Before adding a task to `real-world.eval.yml`, rewrite it into a sanitized prompt that preserves routing intent without revealing private details.

## How to Add a Real Task

1. Record the raw task privately in `validation/private/` if needed.
2. Remove private names, paths, and business details.
3. Add a sanitized case to `real-world.eval.yml`.
4. Run `csr eval validation/real-world.eval.yml --path <your-skill-path>`.
5. Record the result in `docs/RC1_VALIDATION_LOG.md`.

Do not invent tasks just to reach 30 cases.
