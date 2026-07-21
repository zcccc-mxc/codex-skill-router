# v0.2.0-rc.1 Installation Simulation

## Purpose

Test the packaged candidate in a temporary directory without changing the global `csr` command or publishing anything.

## Required checks

- Build a local `.tgz` file with `npm pack`.
- Install that file into a temporary directory.
- Confirm `csr --version` reports `0.2.0-rc.1`.
- Confirm `csr --help` and `csr plan --help` work.
- Run a representative plan in text and JSON mode.
- Confirm JSON parses and paths are hidden by default.
- Remove the temporary directory and tarball afterward.

## Actual result — 2026-07-20

The local `0.2.0-rc.1` tarball installed successfully in `.p7-install-temp/install` without changing the global npm installation.

- `csr --version`: passed and reported `0.2.0-rc.1`.
- `csr --help`: passed and listed `plan`.
- `csr plan --help`: passed and listed `--json`.
- A representative `csr plan` text command: passed and rendered the permission section.
- The matching JSON command: parsed successfully and reported a successful `plan` envelope.
- Privacy check: passed; JSON contained `(hidden path)` and no Windows absolute path.

The environment refused the separately verified recursive removal of `.p7-install-temp`. No release artifact was published, but this local temporary directory remains for manual cleanup.
