# v0.2.0-rc.1 Release Checklist

## Candidate preparation

- [x] Local package version is `0.2.0-rc.1` in `package.json` and `package-lock.json`.
- [x] README files distinguish the stable `0.1.0` release from the `0.2.0-rc.1` candidate.
- [x] Changelog, roadmap, release notes, known issues, and human review material are prepared.
- [x] No tag, npm publication, GitHub Release, commit, push, or pull request was created by P7.

## Automated evidence

- [x] `npm test`: 34 passed, 0 failed.
- [x] `npm run validate:v0.2`: primary 47/48 complete; reserved 12/12 complete.
- [x] The one primary-suite failure and P7 wording variants are recorded as P2 known issues.
- [x] 30-case route Eval: 28 complete, 2 known P2 failures; no reported metric regression.
- [x] Help checks completed for `csr`, `csr route`, and `csr plan`.
- [x] JSON output remains versioned and hides paths by default.
- [x] `npm pack --dry-run` succeeded.
- [x] Candidate tarball installation simulation completed after final candidate packaging.
- [ ] Remove the verified local temporary directory `.p7-install-temp`; the environment refused its recursive removal, so P7 does not claim cleanup was completed.

## Before any external release action

- [x] The user approved **批准发布rc.1** on 2026-07-21.
- [ ] npm authentication is required before `npm publish --tag next`; `npm whoami` returned E401 on 2026-07-21.
- [ ] Re-run the candidate installation simulation and record its result in `docs/V0_2_RC1_INSTALL_TEST.md`.
- [ ] Confirm npm identity and public state: `npm whoami`, `npm view codex-skill-router version`, `npm view codex-skill-router dist-tags`.
- [ ] If explicitly approved, publish only with `npm publish --tag next`.
- [ ] If explicitly approved, create and push `v0.2.0-rc.1`, then create a GitHub **Pre-release** titled `Codex Skill Router v0.2.0-rc.1` using these release notes.
