# P3 Release Candidate Hardening Report

Date: 2026-06-29

Target version: `0.1.0-rc.1`

## Conclusion

The repository is close to `0.1.0-rc.1`, but it is not fully release-ready yet because two installation checks could not be completed in the restricted local environment:

- `npm ci` could not complete because npm cache access and then dependency network access were blocked.
- Tarball install simulation timed out while resolving dependencies.

No npm publish, GitHub release, tag, commit, push, or package release was performed.

## P0/P1/P2 Status

- P0 correctness foundation: implemented.
- P1 standard YAML parsing and Eval quality gates: implemented.
- P2 known limitations: partially hardened and documented.
- `csr budget`: implemented as a local metadata token estimate, not as Codex internal token accounting.

Known remaining limitations are documented in:

- `docs/P0_P1_P2_IMPLEMENTATION_AUDIT.md`
- `docs/TEST_COVERAGE_AUDIT.md`
- `RELEASE_CHECKLIST.md`

## P3 Work Completed

- Updated package version to `0.1.0-rc.1`.
- Added npm package metadata, repository links, keywords, and `files` allowlist.
- Added `README.zh-CN.md`.
- Updated README, CHANGELOG, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, release notes, and release checklist.
- Added GitHub issue templates and pull request template.
- Replaced the single test workflow with a cross-platform CI matrix for Ubuntu, Windows, macOS, Node 20, and Node 22.
- Added `csr budget`.
- Added stable CLI help and documented exit codes.
- Added privacy-by-default CLI output behavior.
- Added a small fallback YAML parser so local CLI behavior remains testable when dependencies are unavailable.

## Local Verification

Passed:

- `npm test`
- CLI help for `--help`, `scan`, `audit`, `route`, `eval`, and `budget`
- `node src\cli.js --version`
- `scan` text and JSON with example Skills
- `audit` with example Skills
- `route` with example Skills
- `eval` text and JSON with `examples/eval.yml`
- `budget` text and JSON with example Skills
- `npm pack --dry-run --cache .\.npm-cache`
- `npm pack --cache .\.npm-cache`
- `git diff --check`
- privacy scan for common secret and private path patterns

Blocked or incomplete:

- `npm ci`
- tarball install simulation
- remote GitHub Actions verification after push
- npm package name availability confirmation

## Test Summary

- Test runner: Node built-in test runner.
- Test files: 1.
- Tests: 21.
- Passed: 21.
- Failed: 0.

## Package Summary

`npm pack` produced:

- Filename: `codex-skill-router-0.1.0-rc.1.tgz`
- Package size: 42.3 kB
- Unpacked size: 141.3 kB
- Total files: 35

The generated tarball and npm cache are ignored by Git. Cleanup was blocked by the execution approval system in the local environment.

## Release Blockers

1. Complete `npm ci` in an environment with npm cache access and dependency network access.
2. Complete tarball install simulation.
3. Push to GitHub and confirm the CI matrix passes.
4. Confirm npm package name availability before publishing.

## Recommended Next Step

Commit and push the current P3 hardening changes, then verify the remote GitHub Actions matrix before deciding whether to publish `0.1.0-rc.1`.
