# v0.2.0-rc.1 Known Issues

## P2: negative wording is not always understood

`csr plan` reads task text; it does not understand every natural-language variation. For example, `without publishing`, `不要访问网络`, and `不要 push` can be shown as possible or required actions instead of exclusions. The tool does not execute those actions, but the reminder may be noisier than needed.

## P2: extra documentation suggestion on some web/mobile tasks

In two of the 30 existing route Eval cases, `docs-authoring` is additionally recommended for a web/mobile task. The expected primary Skills remain selected. This is tracked as an existing P2 issue.

## General limits

- A plan is a local suggestion based on task text, not Codex's actual internal decision.
- Token numbers are rough local metadata estimates, not real usage.
- Acceptance criteria are prepared before work; they are not evidence that work was completed.
