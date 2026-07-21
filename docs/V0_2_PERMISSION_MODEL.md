# v0.2 Permission Model

## Purpose and boundary

The permission model is a local planning reminder. It tells a user what a task may need before work begins. It neither grants permissions nor prevents tools from running, and it is not a security sandbox.

Every permission result has this stable shape:

```json
{
  "type": "file-read",
  "status": "required",
  "risk": "low",
  "reason": "The task asks to inspect an existing page.",
  "requiresConfirmation": false,
  "evidence": ["task: existing page"]
}
```

`status` is exactly one of `required`, `possible`, `unknown`, or `not-required`.

- `required`: the stated task cannot reasonably be completed without this action category.
- `possible`: the task may use the category, but a safe alternative exists or details are absent.
- `unknown`: evidence is too weak to decide.
- `not-required`: the task explicitly excludes the category or the task clearly does not call for it.

`risk` is one of `low`, `medium`, `high`, or `critical`. The fields `reason` and `evidence` must explain the classification without exposing sensitive task content; `evidence` is a list of sanitized short facts, not raw Skill content or secret values.

## Categories and default risks

| Category | Default risk | Planning meaning |
| --- | --- | --- |
| `file-read` | low | Inspect files inside the intended workspace. |
| `file-write` | medium | Create or change project files. |
| `file-delete` | high | Delete project files; large or irreversible deletion is critical. |
| `shell` | medium | Run local commands, tests, or development servers. |
| `network` | high | Contact a remote service or download/upload data. |
| `package-install` | high | Install or change dependency packages. |
| `git-read` | low | Inspect Git status, history, or differences. |
| `git-commit` | medium | Create a local Git commit. |
| `git-push` | high | Send commits to a remote repository; force push is critical. |
| `release-create` | high | Create a public or shared release. |
| `package-publish` | high | Publish a package; irreversible public distribution may be critical. |
| `secret-access` | critical | Read, expose, transmit, or use credentials/secrets. |
| `outside-workspace` | critical | Read, write, delete, or execute outside the intended workspace. |

The common defaults are therefore: read-only inspection is low; project writing and local Shell testing are medium; network actions and installs are high; Git push, Release creation, and package publishing are high; large deletion, force push, secret exposure, and outside-workspace activity are critical.

## Confirmation rule

`requiresConfirmation` is `true` for critical predictions and for explicitly required high-risk actions with concrete, sanitized evidence. P3 also recommends confirmation for `package-install`, `git-push`, `release-create`, `package-publish`, `file-delete`, `outside-workspace`, and sensitive credential access. It is `false` for `not-required` items. A `csr plan` result never grants or records approval.

Before any future execution feature, confirmation must name the proposed action, explain the risk, show the evidence, and ask for an explicit human choice. A `csr plan` result never counts as consent.

## Classification precedence

1. Explicit user constraint wins (for example, “do not publish” produces `package-publish: not-required`).
2. Necessary task action becomes `required`.
3. A concrete likely implementation/verification path becomes `possible`.
4. Missing information becomes `unknown`.
5. Unrelated categories are `not-required` only when that conclusion follows directly; otherwise leave them out of the concise text view and retain an `unknown` only when it matters to safe planning.

## Anti-noise rules

- Do not infer network, installation, publishing, secret access, or outside-workspace use solely because a project is software.
- Do not emit a confirmation for generic words such as “improve” without category-specific evidence.
- Prefer one well-explained category over duplicate warnings.
- Preserve `unknown` instead of guessing from a large industry keyword table.
- Never include raw secrets, absolute private paths, full task prompts, or Skill text as evidence.
