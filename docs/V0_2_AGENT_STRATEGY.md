# v0.2 Agent Strategy

`csr plan` provides local delegation advice only. It never creates agents, worktrees, branches, or execution logs, and it does not control Codex scheduling.

- `single`: one main workstream, a small task, coupled changes, or an unclear request.
- `parallel`: explicitly independent, low-conflict workstreams, normally read-only.
- `sequential`: later work depends on implementation, validation, review, or a high-risk confirmation.

Suggested roles use only Skills already recommended by local routing. Parallel work may reduce elapsed time but can increase total Token use through duplicated context. File ownership is unknown unless the task states it; the strategy reports conflict risk instead of pretending to know paths.

High-risk operations are concentrated in a final sequential role and still require the P3 human-confirmation recommendation. This is an isolation recommendation only; no worktree or branch has been created.
