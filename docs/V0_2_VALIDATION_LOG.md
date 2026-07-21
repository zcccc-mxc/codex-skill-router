# v0.2 Validation Log

## First full run — 2026-07-20

- Primary suite: 47 complete, 0 partial, 1 failed (P6-026).
- Reserved suite: 12 complete, 0 partial, 0 failed.
- JSON/privacy structural checks passed for all 60 cases.
- No virtual Skill, runtime agent status, self-dependency, or verification result was found by the validator.
- No product rule was changed after this first result.

## P7 automatic rerun — 2026-07-20

- `npm test`: 34 passed, 0 failed.
- `npm run validate:v0.2`: primary 47 complete, 1 P2 failed; reserved 12 complete.
- 30-case route Eval: 28 complete, 2 known P2 failures; the metrics did not regress.
- `npm pack --dry-run` completed successfully before candidate-version preparation.
- Help checks for `csr`, `csr route`, and `csr plan` completed successfully.

## Remaining work

- Complete the six-item, non-technical RC1 human review in `docs/V0_2_RC1_HUMAN_REVIEW.md`.
- Decide whether the recorded P2/P3 wording variants merit a later general fix.
