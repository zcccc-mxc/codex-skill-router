# RC1 Manual Verification

This guide is for checking whether `codex-skill-router` is ready to publish as `0.1.0-rc.1`.

You do not need to read source code.

## 1. Check GitHub Actions

Open:

```text
https://github.com/zcccc-mxc/codex-skill-router/actions
```

Click the latest workflow named `CI` on the `main` branch.

The latest checked run during release-gate closure was:

```text
https://github.com/zcccc-mxc/codex-skill-router/actions/runs/28381309705
```

## 2. Confirm All 6 CI Jobs

The CI page should show these six jobs as successful:

```text
test (ubuntu-latest, 20)
test (ubuntu-latest, 22)
test (windows-latest, 20)
test (windows-latest, 22)
test (macos-latest, 20)
test (macos-latest, 22)
```

Each job should be green.

## 3. Check Failure Logs

If any job is red:

1. Click the failed job.
2. Open the failed step.
3. Look for the first red error block.
4. Do not publish until the failure is understood and fixed.

The most important steps are:

```text
Install dependencies
Run tests
Verify CLI help
Verify sample commands
Verify package contents
```

## 4. Confirm npm Package Name

Run:

```bash
npm view codex-skill-router
```

If npm returns `404 Not Found`, no published package with this exact name was found.

You can also run:

```bash
npm search codex-skill-router
```

If there is no exact `codex-skill-router` result, the name appears available. The final truth is still the result of `npm publish`.

## 5. Confirm Tarball Install Result

From the repository root, run:

```bash
npm ci
npm pack
npm install --prefix ./.tmp-package-test ./codex-skill-router-0.1.0-rc.1.tgz
```

Then run the installed CLI.

On Windows:

```bash
.\.tmp-package-test\node_modules\.bin\csr.cmd --version
.\.tmp-package-test\node_modules\.bin\csr.cmd --help
.\.tmp-package-test\node_modules\.bin\csr.cmd scan --path ./examples/skills
.\.tmp-package-test\node_modules\.bin\csr.cmd audit --path ./examples/skills
.\.tmp-package-test\node_modules\.bin\csr.cmd route "optimize existing page and check mobile display" --path ./examples/skills
.\.tmp-package-test\node_modules\.bin\csr.cmd eval ./examples/eval.yml --path ./examples/skills
.\.tmp-package-test\node_modules\.bin\csr.cmd budget --path ./examples/skills
```

On Linux or macOS:

```bash
./.tmp-package-test/node_modules/.bin/csr --version
./.tmp-package-test/node_modules/.bin/csr --help
./.tmp-package-test/node_modules/.bin/csr scan --path ./examples/skills
./.tmp-package-test/node_modules/.bin/csr audit --path ./examples/skills
./.tmp-package-test/node_modules/.bin/csr route "optimize existing page and check mobile display" --path ./examples/skills
./.tmp-package-test/node_modules/.bin/csr eval ./examples/eval.yml --path ./examples/skills
./.tmp-package-test/node_modules/.bin/csr budget --path ./examples/skills
```

The version must be:

```text
0.1.0-rc.1
```

## 6. Confirm Temporary Files Are Removed

After testing, remove temporary files:

```bash
rm -rf .tmp-package-test .npm-cache codex-skill-router-0.1.0-rc.1.tgz
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .tmp-package-test, .npm-cache, codex-skill-router-0.1.0-rc.1.tgz
```

Then run:

```bash
git status
```

It should not show untracked tarballs, npm cache folders, or temporary package-test folders.

## 7. Decide Whether RC Can Be Published

The RC can move to GitHub Prerelease only when all of these are true:

```text
local npm test passed
GitHub Actions CI passed on all 6 jobs
npm pack succeeded
tarball install simulation succeeded
installed csr command worked
temporary files were removed
npm package name was checked
RELEASE_CHECKLIST.md is up to date
```

## 8. Do Not Do These Accidentally

Do not run:

```bash
npm publish
git tag
git push --tags
gh release create
```

Only publish, tag, or create a GitHub Release when you intentionally decide to release `0.1.0-rc.1`.
