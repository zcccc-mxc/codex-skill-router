# Decisions

- P6 freezes routing, permission, acceptance, and Agent Strategy rules until the first full validation report exists.
- A single P2 wording failure is recorded rather than tuned during the first validation round.
- Validation reports are public-safe and must not contain paths, secret values, environment values, or task execution output.
- P7 prepares `0.2.0-rc.1` locally but does not publish it. P2 wording limitations are disclosed rather than changed during release preparation.
- The candidate cannot be externally released until the user explicitly chooses **批准发布rc.1** after the simple human review.
- On 2026-07-21, the user changed the decision to **批准发布rc.1** for `v0.2.0-rc.1`. npm authentication remains a required release gate.
