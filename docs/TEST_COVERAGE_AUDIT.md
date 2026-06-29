# Test Coverage Audit

This project uses Node.js built-in tests. No coverage percentage tool is used.

Current test file:

- `test/cli.test.js`

Current test count after P3 update:

- 21 tests

| Feature | Happy Path | Error Path | Privacy | CLI | Status |
| --- | --- | --- | --- | --- | --- |
| scan | Yes | Yes | Yes | Yes | Covered |
| audit | Yes | Yes | Yes | Yes | Covered |
| route | Yes | Yes | Yes | Yes | Covered |
| eval | Yes | Yes | Yes | Yes | Covered |
| budget | Yes | Yes | Yes | Yes | Covered |
| openai.yaml context | Yes | Invalid YAML ignored safely | Not directly path-focused | Indirect | Covered |
| JSON output | Yes | Partial | Yes | Yes | Covered |
| path hiding | Yes | Partial | Yes | Yes | Covered |
| YAML frontmatter | Yes | Yes | N/A | Indirect | Covered |
| Eval YAML/JSON | Yes | Yes | Report path checked | Yes | Covered |
| exit codes | Yes | Yes | N/A | Yes | Covered |
| package commands | Help tested locally and in CI | N/A | N/A | Yes | Covered |

## Notes

- Tests execute real CLI commands with `node src/cli.js`.
- Tests use temporary directories and public sample fixtures.
- Tests do not rely on a real user home Skill directory.
- Tests do not call external AI services or network APIs.
- Cross-platform execution is configured in GitHub Actions for Ubuntu, Windows, and macOS on Node 20 and 22.

## Known Gaps

- Permission-denied filesystem behavior is not deeply simulated.
- `/etc/codex/skills` is not asserted on Windows because it is platform-specific.
- The router is rule-based; semantic quality is validated through sample Eval cases, not through a model-based oracle.
