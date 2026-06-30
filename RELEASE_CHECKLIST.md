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
- [x] `npm ci --cache .\.npm-cache` verified
- [x] `npm pack --dry-run --cache .\.npm-cache` verified after final changes
- [x] `npm pack --cache .\.npm-cache` verified after final changes
- [x] tarball install simulation verified after final changes
  - 2026-06-30: installed `codex-skill-router-0.1.0-rc.1.tgz` into `.tmp-package-test` and verified the installed `csr` entrypoint.
- [x] tarball removed after simulation
  - 2026-06-30: final cleanup removed the generated tarball, package-test directory, and temporary npm cache.

## Documentation

- [x] README updated
- [x] Chinese README added
- [x] CHANGELOG updated
- [x] LICENSE exists
- [x] CONTRIBUTING exists
- [x] SECURITY exists
- [x] CODE_OF_CONDUCT exists
- [x] Release notes draft exists
- [x] Manual RC verification guide exists

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
- [x] Remote GitHub Actions passed after push
  - 2026-06-30: confirmed GitHub Actions run `28381309705` succeeded for Ubuntu, Windows, and macOS on Node 20 and Node 22.

## Release

- [x] npm name availability checked
  - 2026-06-30: `npm view codex-skill-router` returned 404 and `npm search codex-skill-router --json` showed no exact package name match. Final ownership is still determined by `npm publish`.
- [x] npm login status checked
  - 2026-06-30: `npm whoami` returned `ENEEDAUTH`, so this machine is not logged in to npm.
- [x] Release notes draft prepared
- [x] No npm publish performed
- [x] No GitHub Release created
- [x] No Git tag created

## Final Decision

- [x] Ready for `0.1.0-rc.1`
  - 2026-06-30: release gates are closed for GitHub Prerelease. npm publishing still requires an authenticated npm account.
