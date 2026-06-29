# P0/P1/P2 Implementation Audit

Generated for `0.1.0-rc.1` preparation.

This audit is based on source code and tests, not only README claims.

| Capability | Status | Files | Tests | Notes |
| --- | --- | --- | --- | --- |
| `.agents/skills` project scan | Complete | `src/scan.js` | Yes | Walks upward to Git root. |
| User-level `$HOME/.agents/skills` scan | Complete | `src/scan.js` | Yes | Uses user source label. |
| Admin `/etc/codex/skills` scan | Complete | `src/scan.js` | Partial | Enabled on non-Windows when directory exists. |
| Legacy `.codex/skills` and `skills` | Complete | `src/scan.js` | Yes | Marked as `legacy`. |
| Custom `--path` | Complete | `src/scan.js`, `src/cli.js` | Yes | Uses `custom` source. |
| Standard YAML frontmatter | Complete | `src/scan.js` | Yes | Uses `yaml` package. |
| Missing and invalid YAML handling | Complete | `src/scan.js` | Yes | Does not crash scan. |
| Shared exclusion parsing | Complete | `src/exclusions.js` | Yes | Used by audit and route. |
| Chinese exclusion markers | Complete | `src/exclusions.js`, `src/audit.js`, `src/route.js` | Yes | Tested with Chinese text. |
| Strict/permissive Eval | Complete | `src/evaluate.js` | Yes | `mode` validates allowed values. |
| Include/optional/exclude | Complete | `src/evaluate.js` | Yes | Includes conflict validation. |
| No-match Eval | Complete | `examples/eval.yml`, `src/evaluate.js` | Yes | 10 sample no-match cases. |
| Required Recall | Complete | `src/evaluate.js` | Yes | Reported in text and JSON. |
| Exclusion Accuracy | Complete | `src/evaluate.js` | Yes | Reported in text and JSON. |
| Exact Set Match | Complete | `src/evaluate.js` | Yes | Used for strict cases. |
| Unexpected Recommendation Rate | Complete | `src/evaluate.js` | Yes | Used for strict recommendations. |
| No-Match Accuracy | Complete | `src/evaluate.js` | Yes | Reported in sample Eval. |
| Markdown Eval report | Complete | `src/evaluate.js`, `src/cli.js` | Yes | Report output path is not echoed with private temp path. |
| Multiple quality gates | Complete | `src/cli.js` | Yes | Exit code `3` on gate failure. |
| `agents/openai.yaml` hints | Complete | `src/context.js` | Yes | Local hints only. |
| `.agents/openai.yaml` hints | Complete | `src/context.js` | Yes | Same parser. |
| Dependency declaration terms | Partial | `src/context.js` | No direct CLI assertion | Reads `package.json` terms, does not verify availability. |
| Explicit local context match display | Complete | `src/route.js` | Yes | `contextMatches` in score details. |
| Project/user/source priority | Complete | `src/route.js` | Yes | Project wins close ties. |
| Similar Skill dedupe | Partial | `src/scan.js`, `src/audit.js` | Yes for duplicate names | Exact duplicate file paths are deduped; semantic dedupe is audit-only. |
| `csr budget` | Complete | `src/budget.js`, `src/cli.js` | Yes | Rough local estimate only. |

## Missing or Partial Items

- Dependency declarations are read as terms but are not validated as installed or usable dependencies.
- Similar Skill dedupe is limited to exact scan path dedupe and duplicate-name audit; it does not merge semantically similar Skills.
- Admin scan is platform-dependent and only active when `/etc/codex/skills` exists.

These limitations are documented and do not block the local release candidate.
