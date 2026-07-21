# v0.2 Validation Plan

P6 validates the complete local `csr plan` output without running task instructions. The public-safe suite has 48 primary cases and 12 reserved regression cases. It checks JSON structure, path hiding, route consistency, action and confirmation expectations, acceptance safety, Agent Strategy enums, role Skill ownership, and dependency references.

Run `npm run validate:v0.2`. The script writes JSON and Markdown reports under `validation/reports/`. Reserved cases are not used to tune rules. Manual readability review remains a separate, uncompleted 20-case activity.
