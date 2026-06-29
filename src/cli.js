#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { version } = require("../package.json");
const { auditSkills } = require("./audit");
const { budgetSkills } = require("./budget");
const { loadRouteContext } = require("./context");
const { evaluateRoutes, loadEvalCases, renderMarkdownReport } = require("./evaluate");
const { routeTask } = require("./route");
const { scanSkills } = require("./scan");

const EXIT = {
  OK: 0,
  RUNTIME_ERROR: 1,
  INPUT_ERROR: 2,
  QUALITY_GATE_FAILED: 3,
};

const COMMANDS = new Set(["scan", "audit", "route", "eval", "budget"]);
const AUDIT_SEVERITIES = new Set(["error", "warning", "info"]);
const EVAL_THRESHOLDS = {
  "--min-complete-rate": { key: "completeCaseRate", direction: "min", label: "Complete Case Rate" },
  "--min-required-recall": { key: "requiredRecall", direction: "min", label: "Required Recall" },
  "--min-exclusion-accuracy": { key: "exclusionAccuracy", direction: "min", label: "Exclusion Accuracy" },
  "--min-exact-match": { key: "exactSetMatch", direction: "min", label: "Exact Set Match" },
  "--min-no-match-accuracy": { key: "noMatchAccuracy", direction: "min", label: "No-Match Accuracy" },
  "--max-unexpected-rate": { key: "unexpectedRecommendationRate", direction: "max", label: "Unexpected Recommendation Rate" },
};

function printHelp() {
  console.log(`Codex Skill Router (csr)

Usage:
  csr <command> [input]

Commands:
  scan     Scan local Codex Skills.
  audit    Check Skill metadata quality.
  route    Predict suitable Skills for a task.
  eval     Evaluate routing quality with test cases.
  budget   Estimate local Skill metadata budget.

Options:
  -h, --help     Show help.
  -v, --version  Show version.

Exit codes:
  0 success
  1 runtime error
  2 user input or configuration error
  3 eval quality gate failed`);
}

function printCommandHelp(command) {
  const helpText = {
    scan: `csr scan

Usage:
  csr scan
  csr scan --path <path>

Options:
  --json        Output JSON.
  --brief       Hide descriptions in text output.
  --show-paths  Show local paths; hidden by default.
  --hide-paths  Compatibility option; paths are hidden by default.`,
    audit: `csr audit

Usage:
  csr audit
  csr audit --path <path>

Options:
  --severity <error|warning|info>  Show only one issue level.
  --show-paths                    Show local paths; hidden by default.`,
    route: `csr route

Usage:
  csr route "task description"
  csr route "task description" --path <path>

Options:
  --show-paths  Show local paths; hidden by default.`,
    eval: `csr eval

Usage:
  csr eval <eval-file>
  csr eval <eval-file> --path <path>

Options:
  --json                          Output JSON.
  --output <report.md>            Write a Markdown report.
  --min-complete-rate <0..1>      Complete Case Rate gate.
  --min-required-recall <0..1>    Required Recall gate.
  --min-exclusion-accuracy <0..1> Exclusion Accuracy gate.
  --min-exact-match <0..1>        Exact Set Match gate.
  --min-no-match-accuracy <0..1>  No-Match Accuracy gate.
  --max-unexpected-rate <0..1>    Unexpected Recommendation Rate ceiling.`,
    budget: `csr budget

Usage:
  csr budget
  csr budget --path <path>

Options:
  --json                 Output JSON.
  --show-paths           Show local paths; hidden by default.
  --max-tokens <number>  Set estimate threshold. Default: 8000.`,
  };

  console.log(helpText[command]);
}

function hasHelpArg(args) {
  return args.includes("-h") || args.includes("--help");
}

function parsePathArgs(args) {
  const paths = [];
  const rest = [];

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--path" || value === "-p") {
      const nextValue = args[index + 1];
      if (nextValue) {
        paths.push(nextValue);
        index += 1;
      }
      continue;
    }

    rest.push(value);
  }

  return { paths, rest };
}

function parseScanArgs(args) {
  const paths = [];
  let json = false;
  let showPaths = false;
  let brief = false;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--json") {
      json = true;
      continue;
    }

    if (value === "--hide-paths") {
      showPaths = false;
      continue;
    }

    if (value === "--show-paths") {
      showPaths = true;
      continue;
    }

    if (value === "--brief") {
      brief = true;
      continue;
    }

    if (value === "--path" || value === "-p") {
      const nextValue = args[index + 1];
      if (nextValue) {
        paths.push(nextValue);
        index += 1;
      }
      continue;
    }

    paths.push(value);
  }

  return { paths, json, showPaths, brief };
}

function redactLocalPaths(value) {
  return String(value || "")
    .replace(/[A-Za-z]:\\[^\s"',)]+/g, "(hidden path)")
    .replace(/\/(?:Users|home)\/[^\s"',)]+/g, "(hidden path)");
}

function hideScanPaths(result) {
  return {
    ...result,
    roots: result.roots.map(() => "(hidden path)"),
    missingRoots: result.missingRoots.map(() => "(hidden path)"),
    skills: result.skills.map((skill) => ({
      ...skill,
      path: "(hidden path)",
      description: redactLocalPaths(skill.description),
      message: redactLocalPaths(skill.message),
    })),
  };
}

function jsonEnvelope(command, data, options = {}) {
  return {
    schemaVersion: 1,
    command,
    success: options.success ?? true,
    summary: data.summary || {},
    data,
    warnings: options.warnings || [],
    errors: options.errors || [],

    // Backward-compatible top-level fields for existing callers.
    ...data,
  };
}

function printJson(command, data, options = {}) {
  console.log(JSON.stringify(jsonEnvelope(command, data, options), null, 2));
}

function printScanResult(result, options = {}) {
  const sources = result.summary.sources || {};

  console.log("csr scan");
  console.log("");
  console.log(`Found ${result.summary.total} Skills`);
  console.log("");
  console.log("Codex standard locations:");
  console.log(`- project: ${sources.project || 0}`);
  console.log(`- user: ${sources.user || 0}`);
  console.log(`- admin: ${sources.admin || 0}`);
  console.log("");
  console.log("Compatibility locations:");
  console.log(`- legacy: ${sources.legacy || 0}`);
  if (sources.custom > 0) {
    console.log(`- custom: ${sources.custom}`);
  }
  if ((sources.legacy || 0) > 0) {
    console.log("");
    console.log("Tip:");
    console.log('"project/skills" is not the current Codex standard directory.');
    console.log('Prefer ".agents/skills".');
  }
  console.log("");

  if (result.skills.length === 0) {
    console.log("No Skills found. Check the current directory, user Skill directory, or pass --path.");
    return;
  }

  for (const skill of result.skills) {
    console.log(`- ${skill.name || "(unnamed Skill)"}`);
    console.log(`  source: ${skill.source}`);
    console.log(`  path: ${skill.path}`);
    console.log(`  status: ${skill.status === "ok" ? "ok" : "format-error"}`);

    if (!options.brief) {
      console.log(`  description: ${skill.description || "(missing description)"}`);
    }

    if (!options.brief && skill.message) {
      console.log(`  note: ${skill.message}`);
    }

    console.log("");
  }
}

function parseAuditArgs(args) {
  const paths = [];
  let severity = "";
  let error = "";
  let showPaths = false;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--show-paths") {
      showPaths = true;
      continue;
    }

    if (value === "--severity") {
      const nextValue = args[index + 1];
      if (!nextValue) {
        error = "audit --severity needs one of: error, warning, info.";
        continue;
      }

      if (!AUDIT_SEVERITIES.has(nextValue)) {
        error = `Unknown audit severity: ${nextValue}. Use: error, warning, info.`;
        index += 1;
        continue;
      }

      severity = nextValue;
      index += 1;
      continue;
    }

    if (value === "--path" || value === "-p") {
      const nextValue = args[index + 1];
      if (nextValue) {
        paths.push(nextValue);
        index += 1;
      }
      continue;
    }

    paths.push(value);
  }

  return { paths, severity, error, showPaths };
}

function filterAuditResult(result, severity) {
  if (!severity) {
    return result;
  }

  const issues = result.issues.filter((item) => item.severity === severity);

  return {
    ...result,
    visibleIssueCount: issues.length,
    issues,
  };
}

function printAuditResult(result, options = {}) {
  console.log("csr audit");
  console.log("");
  console.log(`Skills checked: ${result.skillCount}`);
  console.log(`Issues found: ${result.issueCount}`);
  console.log(`Errors: ${result.errorCount}`);
  console.log(`Warnings: ${result.warningCount}`);
  console.log(`Info: ${result.infoCount}`);
  if (options.severity) {
    console.log(`Severity filter: ${options.severity}`);
    console.log(`Visible issues: ${result.visibleIssueCount}`);
  }
  console.log("");

  if (result.issueCount === 0) {
    console.log("No obvious issues found.");
    return;
  }

  if (options.severity && result.issues.length === 0) {
    console.log("No issues match the selected severity.");
    return;
  }

  for (const item of result.issues) {
    console.log(`- [${item.severity}] ${item.skill}`);
    console.log(`  type: ${item.type}`);
    console.log(`  issue: ${item.message}`);
    console.log(`  suggestion: ${item.suggestion}`);
    console.log(`  path: ${item.path}`);
    console.log("");
  }
}

function parseRouteArgs(args) {
  const paths = [];
  const taskParts = [];
  let showPaths = false;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--show-paths") {
      showPaths = true;
      continue;
    }

    if (value === "--path" || value === "-p") {
      const nextValue = args[index + 1];
      if (nextValue) {
        paths.push(nextValue);
        index += 1;
      }
      continue;
    }

    taskParts.push(value);
  }

  return {
    task: taskParts.join(" ").trim(),
    paths,
    showPaths,
  };
}

function printRouteInputError() {
  console.error('csr route needs a task description. Example: csr route "optimize frontend mobile layout"');
}

function printRouteResult(result) {
  console.log("csr route");
  console.log("");
  console.log(`Task: ${result.task}`);
  console.log(`Available Skills: ${result.skillCount}`);
  console.log("");
  console.log(result.note);
  console.log("");

  if (result.recommended.length === 0) {
    console.log("Recommended: none");
    console.log("Reason: no reliable Skill match was found. Try a more specific task or run audit.");
    return;
  }

  console.log("Recommended:");
  for (const item of result.recommended) {
    console.log(`- ${item.skill.name}`);
    console.log(`  score: ${item.score}`);
    console.log(`  reason: ${item.reasons.join(" ")}`);
    console.log(`  path: ${item.skill.path}`);
  }

  console.log("");
  console.log("Not recommended examples:");
  for (const item of result.notRecommended) {
    console.log(`- ${item.skill.name || "(unnamed Skill)"}`);
    console.log(`  reason: ${item.reasons.join(" ")}`);
  }
}

function parseEvalArgs(args) {
  const parsed = parsePathArgs(args);
  const rest = [];
  let json = false;
  let output = "";
  let error = "";
  const thresholds = {};

  function parseThreshold(option, index) {
    const nextValue = parsed.rest[index + 1];
    const parsedValue = Number(nextValue);

    if (!nextValue || Number.isNaN(parsedValue) || parsedValue < 0 || parsedValue > 1) {
      error = `${option} needs a number from 0 to 1.`;
      return index;
    }

    thresholds[EVAL_THRESHOLDS[option].key] = {
      ...EVAL_THRESHOLDS[option],
      value: parsedValue,
    };
    return index + 1;
  }

  for (let index = 0; index < parsed.rest.length; index += 1) {
    const value = parsed.rest[index];

    if (value === "--json") {
      json = true;
      continue;
    }

    if (value === "--output") {
      const nextValue = parsed.rest[index + 1];
      if (!nextValue) {
        error = "eval --output needs a Markdown file path.";
        continue;
      }

      output = nextValue;
      index += 1;
      continue;
    }

    if (EVAL_THRESHOLDS[value]) {
      index = parseThreshold(value, index);
      continue;
    }

    rest.push(value);
  }

  return {
    paths: parsed.paths,
    rest,
    json,
    output,
    thresholds,
    error,
  };
}

function printEvalInputError() {
  console.error("csr eval needs an eval file. Example: csr eval ./examples/eval.yml --path ./examples/skills");
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function printEvalResult(result) {
  console.log("Routing Eval");
  console.log("");
  console.log(`Total cases: ${result.summary.total}`);
  console.log(`strict: ${result.summary.strict}`);
  console.log(`permissive: ${result.summary.permissive}`);
  console.log(`no-match: ${result.summary.noMatch}`);
  console.log(`complete: ${result.summary.complete}`);
  console.log(`partial: ${result.summary.partial}`);
  console.log(`failed: ${result.summary.failed}`);
  console.log("");
  console.log(`Required Recall: ${formatPercent(result.metrics.requiredRecall)}`);
  console.log(`Exclusion Accuracy: ${formatPercent(result.metrics.exclusionAccuracy)}`);
  console.log(`Exact Set Match: ${formatPercent(result.metrics.exactSetMatch)}`);
  console.log(`Unexpected Recommendation Rate: ${formatPercent(result.metrics.unexpectedRecommendationRate)}`);
  console.log(`No-Match Accuracy: ${formatPercent(result.metrics.noMatchAccuracy)}`);
  console.log(`Average Selected Skills: ${result.metrics.averageSelectedSkills.toFixed(1)}`);
  console.log("");
  console.log("Most missed Skills:");
  if (result.mostMissed.length === 0) {
    console.log("- none");
  } else {
    for (const item of result.mostMissed.slice(0, 5)) {
      console.log(`- ${item.skill}: ${item.count}`);
    }
  }
  console.log("");
  console.log("Most over-triggered Skills:");
  if (result.mostOverTriggered.length === 0) {
    console.log("- none");
  } else {
    for (const item of result.mostOverTriggered.slice(0, 5)) {
      console.log(`- ${item.skill}: ${item.count}`);
    }
  }
  console.log("");

  if (result.failedCases.length === 0) {
    console.log("All cases matched expectations.");
    return;
  }

  console.log("Failed or partial cases:");
  for (const item of result.failedCases.slice(0, 10)) {
    console.log(`- ${item.id || item.prompt}`);
    console.log(`  status: ${item.status}`);
    console.log(`  recommended: ${item.recommended.length > 0 ? item.recommended.join(", ") : "(none)"}`);
    console.log(`  reason: ${item.failureReasons.join("; ") || "(none)"}`);
  }
}

function checkThresholds(result, thresholds) {
  const failures = [];

  for (const threshold of Object.values(thresholds)) {
    const actual = result.metrics[threshold.key];
    const failed = threshold.direction === "min" ? actual < threshold.value : actual > threshold.value;
    if (failed) {
      failures.push({ ...threshold, actual });
    }
  }

  return failures;
}

function printThresholdFailures(failures) {
  if (failures.length === 0) {
    return;
  }

  console.error("Quality gates failed:");
  for (const item of failures) {
    const directionText = item.direction === "min" ? "at least" : "at most";
    console.error(`- ${item.label}: ${item.actual.toFixed(3)}, expected ${directionText} ${item.value}`);
  }
}

function parseBudgetArgs(args) {
  const paths = [];
  let json = false;
  let showPaths = false;
  let maxRecommendedTokens = 8000;
  let error = "";

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--json") {
      json = true;
      continue;
    }

    if (value === "--show-paths") {
      showPaths = true;
      continue;
    }

    if (value === "--max-tokens") {
      const nextValue = args[index + 1];
      const parsedValue = Number(nextValue);
      if (!nextValue || !Number.isFinite(parsedValue) || parsedValue <= 0) {
        error = "budget --max-tokens needs a positive number.";
        continue;
      }

      maxRecommendedTokens = parsedValue;
      index += 1;
      continue;
    }

    if (value === "--path" || value === "-p") {
      const nextValue = args[index + 1];
      if (nextValue) {
        paths.push(nextValue);
        index += 1;
      }
      continue;
    }

    paths.push(value);
  }

  return { paths, json, showPaths, maxRecommendedTokens, error };
}

function printBudgetResult(result) {
  console.log("csr budget");
  console.log("");
  console.log(result.note);
  console.log("");
  console.log(`Skills estimated: ${result.summary.includedSkills}/${result.summary.totalSkills}`);
  console.log(`Estimated tokens: ${result.summary.estimatedTokens}`);
  console.log(`Threshold: ${result.summary.maxRecommendedTokens}`);
  console.log(`Utilization: ${formatPercent(result.summary.utilization)}`);
  console.log(`Risk: ${result.summary.risk}`);
  console.log("");

  for (const skill of result.skills) {
    console.log(`- ${skill.name}`);
    console.log(`  source: ${skill.source}`);
    console.log(`  estimated tokens: ${skill.estimatedTokens}`);
    console.log(`  included: ${skill.included ? "yes" : "no"}`);
    console.log(`  reason: ${skill.reason}`);
    console.log(`  path: ${skill.path}`);
  }
}

function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return EXIT.OK;
  }

  if (command === "-v" || command === "--version") {
    console.log(version);
    return EXIT.OK;
  }

  if (!COMMANDS.has(command)) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "csr --help" to see available commands.');
    return EXIT.INPUT_ERROR;
  }

  if (hasHelpArg(rest)) {
    printCommandHelp(command);
    return EXIT.OK;
  }

  if (command === "route" && rest.length === 0) {
    printRouteInputError();
    return EXIT.INPUT_ERROR;
  }

  if (command === "scan") {
    const scanArgs = parseScanArgs(rest);
    const rawResult = scanSkills({ paths: scanArgs.paths });
    const result = scanArgs.showPaths ? rawResult : hideScanPaths(rawResult);

    if (scanArgs.json) {
      printJson("scan", result);
      return EXIT.OK;
    }

    printScanResult(result, { brief: scanArgs.brief });
    return EXIT.OK;
  }

  if (command === "audit") {
    const auditArgs = parseAuditArgs(rest);
    if (auditArgs.error) {
      console.error(auditArgs.error);
      return EXIT.INPUT_ERROR;
    }

    const scanResult = scanSkills({ paths: auditArgs.paths });
    const result = auditSkills(auditArgs.showPaths ? scanResult : hideScanPaths(scanResult));
    printAuditResult(filterAuditResult(result, auditArgs.severity), { severity: auditArgs.severity });
    return EXIT.OK;
  }

  if (command === "route") {
    const routeArgs = parseRouteArgs(rest);
    if (!routeArgs.task) {
      printRouteInputError();
      return EXIT.INPUT_ERROR;
    }

    const scanResult = scanSkills({ paths: routeArgs.paths });
    const context = loadRouteContext({ skills: scanResult.skills });
    printRouteResult(routeTask(routeArgs.task, routeArgs.showPaths ? scanResult : hideScanPaths(scanResult), { context }));
    return EXIT.OK;
  }

  if (command === "eval") {
    const evalArgs = parseEvalArgs(rest);
    if (evalArgs.error) {
      console.error(evalArgs.error);
      return EXIT.INPUT_ERROR;
    }

    const evalFile = evalArgs.rest[0];
    if (!evalFile) {
      printEvalInputError();
      return EXIT.INPUT_ERROR;
    }

    try {
      const cases = loadEvalCases(evalFile);
      const scanResult = scanSkills({ paths: evalArgs.paths });
      const context = loadRouteContext({ skills: scanResult.skills });
      const result = evaluateRoutes(cases, scanResult, { context });
      const thresholdFailures = checkThresholds(result, evalArgs.thresholds);

      if (evalArgs.output) {
        if (path.resolve(evalArgs.output) === path.resolve(evalFile)) {
          console.error("eval --output cannot overwrite the eval file itself.");
          return EXIT.INPUT_ERROR;
        }

        fs.writeFileSync(evalArgs.output, renderMarkdownReport(result, { evalFile: redactLocalPaths(evalFile) }), "utf8");
        console.error("Markdown report written.");
      }

      if (evalArgs.json) {
        printJson("eval", result);
        printThresholdFailures(thresholdFailures);
        return thresholdFailures.length === 0 ? EXIT.OK : EXIT.QUALITY_GATE_FAILED;
      }

      printEvalResult(result);
      printThresholdFailures(thresholdFailures);
      return thresholdFailures.length === 0 ? EXIT.OK : EXIT.QUALITY_GATE_FAILED;
    } catch (error) {
      console.error(`Cannot run eval: ${redactLocalPaths(error.message)}`);
      return EXIT.INPUT_ERROR;
    }
  }

  if (command === "budget") {
    const budgetArgs = parseBudgetArgs(rest);
    if (budgetArgs.error) {
      console.error(budgetArgs.error);
      return EXIT.INPUT_ERROR;
    }

    const rawScanResult = scanSkills({ paths: budgetArgs.paths });
    const scanResult = budgetArgs.showPaths ? rawScanResult : hideScanPaths(rawScanResult);
    const result = budgetSkills(scanResult, { maxRecommendedTokens: budgetArgs.maxRecommendedTokens });

    if (budgetArgs.json) {
      printJson("budget", result);
      return EXIT.OK;
    }

    printBudgetResult(result);
    return EXIT.OK;
  }

  return EXIT.OK;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  EXIT,
  hideScanPaths,
  main,
  redactLocalPaths,
};
