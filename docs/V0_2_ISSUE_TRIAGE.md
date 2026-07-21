# v0.2 Issue Triage

## P2 — P6-026: “without publishing” is not recognized as package-publish exclusion

- Evidence: primary validation case P6-026 failed because `Prepare release notes without publishing.` did not emit `package-publish: not-required`.
- Impact: one explicit negation wording is missed; no action was executed and no path or secret was exposed.
- Decision: recorded after the first full validation. It is a single P2 wording variant, so P6 does not tune a rule solely to improve this result.

No P0 or P1 issue was found in the first validation run.

## P2 — explicit negative wording can be interpreted as a positive action

- Evidence: the P7 representative checks classified `不要访问网络` as network required and `不要 push` as git-push required.
- Impact: the plan can show an unnecessary high-risk warning for these wording variants. It performs no action, exposes no path or secret, and remains a reminder system rather than enforcement.
- Decision: record this as a bounded P2/P3 text-understanding limitation. P7 does not alter routing or permission rules for isolated phrasing examples.
