# Release Checklist

Target: `0.1.0-rc.1`

## Code

- [x] P0 implemented
- [x] P1 implemented
- [x] P2 minimum implemented
- [x] `csr budget` implemented as a local estimate
- [x] All local tests pass
- [x] No known debug code
- [x] No intentional writes to user Skill files

## Package

- [x] Version is `0.1.0-rc.1`
- [x] `bin.csr` is configured
- [x] `engines.node` is `>=20`
- [x] npm `files` allowlist exists
- [x] `npm pack --dry-run --cache .\.npm-cache` verified after final changes
- [x] `npm pack --cache .\.npm-cache` verified after final changes
- [ ] tarball install simulation verified after final changes
  - 2026-06-29: local install simulation timed out in the restricted environment.
- [ ] tarball removed after simulation
  - 2026-06-29: cleanup was blocked by the execution approval system; generated files are ignored.

## Documentation

- [x] README updated
- [x] Chinese README added
- [x] CHANGELOG updated
- [x] LICENSE exists
- [x] CONTRIBUTING exists
- [x] SECURITY exists
- [x] CODE_OF_CONDUCT exists
- [x] Release notes draft exists

## Privacy

- [x] Default text output hides paths
- [x] JSON output hides paths by default
- [x] Markdown report avoids temp report path leakage in tests
- [x] No secrets intentionally added
- [x] Public examples are anonymous

## CI

- [x] Ubuntu configured
- [x] Windows configured
- [x] macOS configured
- [x] Node 20 configured
- [x] Node 22 configured
- [ ] Remote GitHub Actions passed after push

## Release

- [ ] npm name availability confirmed by project owner
- [x] Release notes draft prepared
- [x] No npm publish performed
- [x] No GitHub Release created
- [x] No Git tag created

## Final Decision

- [ ] Ready for `0.1.0-rc.1`
