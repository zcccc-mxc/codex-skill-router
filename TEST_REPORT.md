# Test Report

- P7 automated tests: `npm test` – 34 passed, 0 failed after the candidate-version test was made version-aware.
- P6 validator: `npm run validate:v0.2` – primary 47/48 complete, 1 recorded P2 failure; reserved 12/12 complete. Its exit code is 1 because the suite intentionally reports that failed case.
- Route regression: 30 cases; 28 complete, 2 known failed due to `docs-authoring` extra recommendations; metrics did not regress.
- `npm pack --dry-run` passed. Local tarball installation simulation passed for version, help, plan text, plan JSON, and hidden paths.
- Residual process issue: the environment blocked recursive removal of the verified `.p7-install-temp` directory. It is a local cleanup item, not a product-test failure.
- Release decision: the user approved rc.1 publication on 2026-07-21. The release is currently blocked by npm E401 authentication; no external release action has yet been performed.

## Daily Audit - 2026-07-21

- `npm test`: 34 passed, 0 failed.
- `npm run validate:v0.2`: primary 47/48 complete with the recorded P2 failure; reserved 12/12 complete. Exit code 3 is expected while that known case remains recorded.
- `npm pack --dry-run` passed for the local `0.2.0-rc.1` candidate. The verified temporary installation directory was not included in the package file list.
- GitHub currently has no open Code Scanning alerts and no open pull requests. Recent remote CI and CodeQL runs are green.
- Important scope note: the local `v0.2.0-rc.1` candidate is still uncommitted and unpublished. Remote CI results do not validate this exact working tree. Before any later release decision, commit the intentional candidate changes and wait for CI on that commit.
