# v0.2 JSON Schema

## Envelope

All v0.2 JSON commands use this stable outer object:

```json
{
  "schemaVersion": 1,
  "command": "plan",
  "success": true,
  "summary": {},
  "data": {},
  "warnings": [],
  "errors": []
}
```

`schemaVersion` remains `1` throughout v0.2. Required field names and their meanings must not change during the release line. Additive optional fields are allowed only when they do not change existing semantics. Command/input errors set `success` to `false` and use `errors`; a successful no-match plan is still `success: true`.

## `route --json`

`command` is `"route"`. `summary` contains `skillCount`, `recommendedCount`, `notRecommendedCount`, `noMatch`, and `smallTaskSuppressed`. `data` contains:

```json
{
  "task": "task text supplied to csr route",
  "recommendedSkills": [
    {
      "name": "frontend-ui",
      "source": "project",
      "path": "(hidden path)",
      "score": 8,
      "status": "ok",
      "matchedTerms": [],
      "reasons": [],
      "scoreDetails": {}
    }
  ],
  "notRecommendedSkills": [],
  "contextSummary": { "files": 0, "skillHints": 0, "packageTerms": 0 }
}
```

The task field contains the text deliberately supplied to this local command. It is not sent to an external service or written to a file. A successful no-match has `recommendedSkills: []` and `summary.noMatch: true`. Skill paths remain `"(hidden path)"` unless `--show-paths` is supplied. `score`, `matchedTerms`, `reasons`, and `scoreDetails` are explainable local prediction evidence, not Codex internal invocation records.

## `plan --json`

`command` is `"plan"`. P5 adds `agentMode`, `delegationRecommended`, `suggestedAgentCount`, and `agentStrategyConfidence` to the P4 summary. `data` also includes `agentStrategy`, containing only recommendations, not runtime state or real agent IDs.

```json
{
  "task": "task text supplied to csr plan",
  "recommendedSkills": [],
  "tokenEstimate": {
    "method": "rough-local-estimate",
    "allSkills": { "estimatedTokens": 0, "threshold": 8000, "overBudget": false },
    "recommendedSkills": { "estimatedTokens": 0 },
    "actualCodexUsageKnown": false
  },
  "expectedActions": [],
  "permissionRisks": [],
  "requiredConfirmations": [],
  "acceptanceCriteria": [],
  "acceptanceSummary": {
    "generatedFromTaskText": true,
    "usesExecutionResults": false,
    "verificationPerformed": false
  },
  "unknowns": []
}
```

### `recommendedSkills`

Each item reuses the `route --json` structure: `name`, `score`, `source`, `status`, `path`, `matchedTerms`, `reasons`, and `scoreDetails`. `path` is `"(hidden path)"` unless `--show-paths` is requested.

### `tokenEstimate`

The object is always a rough local estimate. P2 shows both all available valid Skill metadata and recommended Skill metadata. It never represents actual model use, internal prompt construction, billing, or a runtime limit. `--max-tokens` applies to the all-Skill estimate and adds a warning when it is exceeded without failing the command.

### `expectedActions` and `permissionRisks`

P3 predicts these fields from task text only. An action has `type`, `status`, `description`, and sanitized `evidence`. A permission risk has `type`, `status`, `risk`, `reason`, `requiresConfirmation`, and sanitized `evidence`. `status` is one of `required`, `possible`, `unknown`, or `not-required`; unrelated categories are omitted to avoid noise. These are predictions, not execution records or grants.

### `requiredConfirmations`

Each confirmation has `permissionType`, `risk`, `message`, and `reason`. P3 only recommends confirmation; it never records approval or enforces a decision.

### `acceptanceCriteria` and `unknowns`

Each acceptance criterion has stable `id`, `category`, `statement`, `priority`, `source`, `verificationMethod`, and `evidence` fields. `category` is one of `deliverable`, `scope`, `constraint`, `quality`, `test`, `safety`, `documentation`, or `release`; `priority` is `required` or `recommended`; `source` is `explicit` or `derived`. `acceptanceSummary.verificationPerformed` is always `false` in P4. `unknowns` is an array of plain-language limits, including that exact commands, files, and network targets are unknown because the analysis uses only task text.

## Privacy contract

Default JSON must not contain absolute paths, Skill bodies, secret or environment-variable values. `route --json` may include the task text deliberately supplied to that local command in `data.task`; it must not write that text to a file or send it to an external service. Future commands must define their own task-redaction behavior before adding task fields. `--show-paths` changes only the visibility of local path fields. Callers are responsible for reviewing any JSON before sharing it outside the workspace.
