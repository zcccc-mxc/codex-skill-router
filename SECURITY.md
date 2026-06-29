# Security Policy

## Reporting Security Issues

Please do not post secrets, tokens, private Skill contents, or private paths in public issues.

Use GitHub private vulnerability reporting when available for this repository. If that is not available, open a minimal public issue that says a security report is needed, without including sensitive details.

## Privacy Model

Codex Skill Router is local-first:

- it does not upload Skill contents;
- it does not upload task prompts;
- it does not upload Eval data;
- it does not call external AI services;
- it does not modify user Skill files.

CLI output hides local filesystem paths by default. Use `--show-paths` only for local debugging.

## Non-Goals

This project is not a malware scanner, dependency vulnerability scanner, or security review engine. Security-related Skill routing can be evaluated, but deep security scanning is outside the current scope.
