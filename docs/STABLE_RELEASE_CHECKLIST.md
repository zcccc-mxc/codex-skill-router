# Stable Release Checklist

Target stable version: `v0.1.0`

This checklist starts after `v0.1.0-rc.1` real usage validation.

## Installation

- [x] Package install succeeds from a clean environment.
- [x] `csr --version` works during stable package simulation.
- [x] `csr --help` works during stable package simulation.
- [x] Windows validation completed.
- [ ] macOS install path verified.
- [ ] Linux install path verified.

Stable package simulation:

```text
2026-07-02:
npm pack --dry-run --cache .\.npm-cache passed for codex-skill-router@0.1.0.
npm pack --cache .\.npm-cache generated codex-skill-router-0.1.0.tgz.
Installed codex-skill-router-0.1.0.tgz into .tmp-stable-package-test.
Installed csr entrypoint returned version 0.1.0.
Installed scan, audit, route, eval, and budget commands ran successfully.
Temporary tarball, package-test directory, and npm cache were cleaned afterward.
```

## Core Commands

- [x] `csr scan` is stable on real Skill directories.
- [x] `csr audit` is stable on real Skill directories.
- [x] `csr route` is stable on real tasks.
- [x] `csr eval` is stable on real Eval files.
- [x] `csr budget` is stable on real Skill sets.
- [x] No command crashes during normal validation.

## Real Task Validation

- [x] At least 30 real tasks reviewed.
- [x] Correct / failed results recorded.
- [x] No-match validation completed.
- [x] False positives reviewed.
- [x] False negatives reviewed.
- [x] Repeated routing mistakes triaged.

Recorded RC1 result:

```text
Real tasks: 30
Complete: 28
Failed: 2
Required Skill Recall: 100.0%
No-Match Accuracy: 100.0%
Exclusion Accuracy: 91.7%
```

Known remaining issue:

```text
docs-authoring may be over-recommended in a small number of web/mobile tasks.
The correct primary Skills are still selected.
Severity: P2.
Blocks stable release: no.
```

## Privacy

- [x] Default output does not leak private paths during validation.
- [x] JSON output privacy rechecked for stable release.
- [x] No customer data committed.
- [x] No product cost or supplier data committed.
- [x] No private Skill content committed.
- [x] No API keys, tokens, or secrets committed.

## Tests and CI

- [x] `npm test` passes with 21 tests.
- [x] 2026-07-02 local retest passed with 21 tests.
- [x] GitHub Actions passes on Ubuntu Node 20.
- [x] GitHub Actions passes on Ubuntu Node 22.
- [x] GitHub Actions passes on Windows Node 20.
- [x] GitHub Actions passes on Windows Node 22.
- [x] GitHub Actions passes on macOS Node 20.
- [x] GitHub Actions passes on macOS Node 22.

GitHub Actions evidence:

```text
2026-07-02:
Run 28596931478 completed successfully for commit 419413897de20d468967c75372104f9dd6786041.
Matrix jobs passed:
- ubuntu-latest / Node 20
- ubuntu-latest / Node 22
- windows-latest / Node 20
- windows-latest / Node 22
- macos-latest / Node 20
- macos-latest / Node 22
```

## Documentation

- [x] README prepared for stable release behavior.
- [x] README.zh-CN prepared for stable release behavior.
- [x] CHANGELOG updated with stable release preparation notes.
- [x] Release notes prepared for stable release.
- [x] Known limitations are still accurate.

Documentation note:

```text
The README and README.zh-CN describe the npm install command as available after publication.
The package version has not been changed to 0.1.0 yet, and no npm publish has been performed.
```

## Release Decision

- [x] Choose stable `v0.1.0`.
- [ ] Choose `v0.1.0-rc.2`.
- [x] Decision reason recorded.
- [x] npm package name rechecked before stable release.
- [ ] npm login confirmed.
- [ ] npm publish completed.
- [ ] Git tag `v0.1.0` created.
- [ ] GitHub Release `v0.1.0` created.

Decision reason:

```text
RC1 real validation passed.
The current version has practical usage value.
30 real tasks were reviewed.
28 were completely correct.
The remaining 2 failures are minor docs-authoring over-recommendations on web/mobile tasks.
Required Skill Recall and No-Match Accuracy are both 100.0%.
The known P2 issue does not block stable v0.1.0.
```

2026-07-02 retest:

```text
The stable pre-release retest matched the RC1 validation summary.
real-world Eval: 30 total, 28 complete, 2 failed.
The two failures are the known docs-authoring over-recommendations on web/mobile tasks.
No new P0 or P1 issue was found.
JSON scan output hides local paths by default.
npm.cmd test passed with 21 tests.
Stable package install simulation passed for codex-skill-router@0.1.0.
```

Stable `v0.1.0` is appropriate when final release packaging, CI, README, CHANGELOG, and release notes are checked immediately before release.

npm package name evidence:

```text
2026-07-02:
`npm view codex-skill-router version` returned 404 Not Found.
No published package named codex-skill-router was found at the time of this check.
Final availability remains subject to npm publish acceptance.
```

Remaining external gate:

```text
`npm whoami` returned ENEEDAUTH.
This machine must be logged in to npm before `npm publish` can run.
```
