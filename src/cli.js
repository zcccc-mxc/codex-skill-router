#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { version } = require("../package.json");
const { auditSkills } = require("./audit");
const { loadRouteContext } = require("./context");
const { evaluateRoutes, loadEvalCases, renderMarkdownReport } = require("./evaluate");
const { routeTask } = require("./route");
const { scanSkills } = require("./scan");

const COMMANDS = new Set(["scan", "audit", "route", "eval"]);
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

用法:
  csr <命令> [输入]

命令:
  scan     扫描本地 Codex Skills。
  audit    检查 Skill 配置质量。
  route    根据任务预测适合的 Skills。
  eval     使用测试集评估路由效果。

选项:
  -h, --help     显示帮助。
  -v, --version  显示版本号。`);
}

function printCommandHelp(command) {
  const helpText = {
    scan: `csr scan

用法:
  csr scan [路径]
  csr scan --path <路径>

选项:
  --json        输出 JSON。
  --brief       隐藏 description，输出更短。
  --show-paths  显示本地路径；默认隐藏。
  --hide-paths  兼容选项；默认已经隐藏路径。`,
    audit: `csr audit

用法:
  csr audit [路径]
  csr audit --path <路径>

选项:
  --severity <error|warning|info>  只显示指定级别的问题。
  --show-paths                    显示本地路径；默认隐藏。`,
    route: `csr route

用法:
  csr route "任务描述"
  csr route "任务描述" --path <路径>

选项:
  --show-paths  显示本地路径；默认隐藏。`,
    eval: `csr eval

用法:
  csr eval <测试文件>
  csr eval <测试文件> --path <路径>

选项:
  --json                         输出 JSON。
  --output <report.md>           写入 Markdown 报告。
  --min-complete-rate <0..1>     完全正确率门槛。
  --min-required-recall <0..1>   Required Recall 门槛。
  --min-exclusion-accuracy <0..1> Exclusion Accuracy 门槛。
  --min-exact-match <0..1>       Exact Set Match 门槛。
  --min-no-match-accuracy <0..1> No-Match Accuracy 门槛。
  --max-unexpected-rate <0..1>   Unexpected Recommendation Rate 上限。`,
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
    roots: result.roots.map(() => "(已隐藏)"),
    missingRoots: result.missingRoots.map(() => "(已隐藏)"),
    skills: result.skills.map((skill) => ({
      ...skill,
      path: "(已隐藏)",
      description: redactLocalPaths(skill.description),
      message: redactLocalPaths(skill.message),
    })),
  };
}

function printScanResult(result, options = {}) {
  const sources = result.summary.sources || {};

  console.log("csr scan");
  console.log("");
  console.log(`发现 ${result.summary.total} 个 Skills`);
  console.log("");
  console.log("Codex 标准位置:");
  console.log(`- 项目级：${sources.project || 0}`);
  console.log(`- 用户级：${sources.user || 0}`);
  console.log(`- 管理员级：${sources.admin || 0}`);
  console.log("");
  console.log("兼容位置:");
  console.log(`- legacy：${sources.legacy || 0}`);
  if (sources.custom > 0) {
    console.log(`- custom：${sources.custom}`);
  }
  if ((sources.legacy || 0) > 0) {
    console.log("");
    console.log("提示:");
    console.log("“项目/skills”不是当前 Codex 官方标准目录，");
    console.log("建议迁移到“.agents/skills”。");
  }
  console.log("");

  if (result.skills.length === 0) {
    console.log("没有找到可扫描的 Skills。请确认当前目录或用户 Skills 目录是否存在。");
    return;
  }

  for (const skill of result.skills) {
    console.log(`- ${skill.name || "(未命名 Skill)"}`);
    console.log(`  来源: ${skill.source}`);
    console.log(`  路径: ${skill.path}`);
    console.log(`  状态: ${skill.status === "ok" ? "正常" : "格式错误"}`);

    if (!options.brief) {
      console.log(`  描述: ${skill.description || "(缺少 description)"}`);
    }

    if (!options.brief && skill.message) {
      console.log(`  提示: ${skill.message}`);
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
  console.log(`检查 Skills: ${result.skillCount}`);
  console.log(`发现问题: ${result.issueCount}`);
  console.log(`严重问题: ${result.errorCount}`);
  console.log(`建议修复: ${result.warningCount}`);
  console.log(`提示信息: ${result.infoCount}`);
  if (options.severity) {
    console.log(`筛选级别: ${options.severity}`);
    console.log(`显示问题: ${result.visibleIssueCount}`);
  }
  console.log("");

  if (result.issueCount === 0) {
    console.log("没有发现明显问题。");
    return;
  }

  if (options.severity && result.issues.length === 0) {
    console.log("没有符合筛选条件的问题。");
    return;
  }

  for (const item of result.issues) {
    console.log(`- [${item.severity}] ${item.skill}`);
    console.log(`  类型: ${item.type}`);
    console.log(`  问题: ${item.message}`);
    console.log(`  建议: ${item.suggestion}`);
    console.log(`  路径: ${item.path}`);
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
  console.error(`csr route 需要一段任务描述。
示例:
  csr route "优化现有的 Next.js 页面，并检查移动端显示"`);
}

function printRouteResult(result) {
  console.log("csr route");
  console.log("");
  console.log(`任务: ${result.task}`);
  console.log(`可用 Skills: ${result.skillCount}`);
  console.log("");
  console.log(result.note);
  console.log("");

  if (result.recommended.length === 0) {
    console.log("推荐: 暂无");
    console.log("原因: 没有找到明显匹配的 Skill。可以尝试补充更具体的任务描述，或先运行 audit 检查 description。");
    return;
  }

  console.log("推荐:");
  for (const item of result.recommended) {
    console.log(`- ${item.skill.name}`);
    console.log(`  分数: ${item.score}`);
    console.log(`  原因: ${item.reasons.join(" ")}`);
    console.log(`  路径: ${item.skill.path}`);
  }

  console.log("");
  console.log("未推荐示例:");
  for (const item of result.notRecommended) {
    console.log(`- ${item.skill.name || "(未命名 Skill)"}`);
    console.log(`  原因: ${item.reasons.join(" ")}`);
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
  console.error(`csr eval 需要一个测试文件路径。
示例:
  csr eval ./examples/eval.yml --path ./skills`);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function printEvalResult(result) {
  console.log("Routing Eval");
  console.log("");
  console.log(`测试总数: ${result.summary.total}`);
  console.log(`strict: ${result.summary.strict}`);
  console.log(`permissive: ${result.summary.permissive}`);
  console.log(`no-match: ${result.summary.noMatch}`);
  console.log(`完全正确: ${result.summary.complete}`);
  console.log(`部分正确: ${result.summary.partial}`);
  console.log(`失败: ${result.summary.failed}`);
  console.log("");
  console.log(`Required Recall: ${formatPercent(result.metrics.requiredRecall)}`);
  console.log(`Exclusion Accuracy: ${formatPercent(result.metrics.exclusionAccuracy)}`);
  console.log(`Exact Set Match: ${formatPercent(result.metrics.exactSetMatch)}`);
  console.log(`Unexpected Recommendation Rate: ${formatPercent(result.metrics.unexpectedRecommendationRate)}`);
  console.log(`No-Match Accuracy: ${formatPercent(result.metrics.noMatchAccuracy)}`);
  console.log(`Average Selected Skills: ${result.metrics.averageSelectedSkills.toFixed(1)}`);
  console.log("");
  console.log("最常漏掉的 Skill:");
  if (result.mostMissed.length === 0) {
    console.log("- 无");
  } else {
    for (const item of result.mostMissed.slice(0, 5)) {
      console.log(`- ${item.skill}: ${item.count}`);
    }
  }
  console.log("");
  console.log("最常误触发的 Skill:");
  if (result.mostOverTriggered.length === 0) {
    console.log("- 无");
  } else {
    for (const item of result.mostOverTriggered.slice(0, 5)) {
      console.log(`- ${item.skill}: ${item.count}`);
    }
  }
  console.log("");

  if (result.failedCases.length === 0) {
    console.log("所有测试都符合预期。");
    return;
  }

  console.log("失败或部分正确案例:");
  for (const item of result.failedCases.slice(0, 10)) {
    console.log(`- ${item.id || item.prompt}`);
    console.log(`  状态: ${item.status}`);
    console.log(`  推荐: ${item.recommended.length > 0 ? item.recommended.join(", ") : "(无)"}`);
    console.log(`  原因: ${item.failureReasons.join("; ") || "(无)"}`);
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

  console.error("质量门槛未通过:");
  for (const item of failures) {
    const directionText = item.direction === "min" ? "至少" : "最多";
    console.error(`- ${item.label}: ${item.actual.toFixed(3)}，要求${directionText} ${item.value}`);
  }
}

function main(argv = process.argv.slice(2)) {
  const [command, ...rest] = argv;

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    return 0;
  }

  if (command === "-v" || command === "--version") {
    console.log(version);
    return 0;
  }

  if (!COMMANDS.has(command)) {
    console.error(`未知命令: ${command}

请运行 "csr --help" 查看可用命令。`);
    return 1;
  }

  if (hasHelpArg(rest)) {
    printCommandHelp(command);
    return 0;
  }

  if (command === "route" && rest.length === 0) {
    printRouteInputError();
    return 1;
  }

  if (command === "scan") {
    const scanArgs = parseScanArgs(rest);
    const rawResult = scanSkills({ paths: scanArgs.paths });
    const result = scanArgs.showPaths ? rawResult : hideScanPaths(rawResult);

    if (scanArgs.json) {
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    printScanResult(result, { brief: scanArgs.brief });
    return 0;
  }

  if (command === "audit") {
    const auditArgs = parseAuditArgs(rest);
    if (auditArgs.error) {
      console.error(auditArgs.error);
      return 1;
    }

    const scanResult = scanSkills({ paths: auditArgs.paths });
    const result = auditSkills(auditArgs.showPaths ? scanResult : hideScanPaths(scanResult));
    printAuditResult(filterAuditResult(result, auditArgs.severity), { severity: auditArgs.severity });
    return 0;
  }

  if (command === "route") {
    const routeArgs = parseRouteArgs(rest);
    if (!routeArgs.task) {
      printRouteInputError();
      return 1;
    }

    const scanResult = scanSkills({ paths: routeArgs.paths });
    const context = loadRouteContext({ skills: scanResult.skills });
    printRouteResult(routeTask(routeArgs.task, routeArgs.showPaths ? scanResult : hideScanPaths(scanResult), { context }));
    return 0;
  }

  if (command === "eval") {
    const evalArgs = parseEvalArgs(rest);
    if (evalArgs.error) {
      console.error(evalArgs.error);
      return 1;
    }

    const evalFile = evalArgs.rest[0];
    if (!evalFile) {
      printEvalInputError();
      return 1;
    }

    try {
      const cases = loadEvalCases(evalFile);
      const scanResult = scanSkills({ paths: evalArgs.paths });
      const context = loadRouteContext({ skills: scanResult.skills });
      const result = evaluateRoutes(cases, scanResult, { context });
      const thresholdFailures = checkThresholds(result, evalArgs.thresholds);

      if (evalArgs.output) {
        if (path.resolve(evalArgs.output) === path.resolve(evalFile)) {
          console.error("eval --output 不能覆盖 Eval 文件本身。");
          return 1;
        }

        fs.writeFileSync(evalArgs.output, renderMarkdownReport(result, { evalFile }), "utf8");
        console.error(`已写入 Markdown 报告: ${evalArgs.output}`);
      }

      if (evalArgs.json) {
        console.log(JSON.stringify(result, null, 2));
        printThresholdFailures(thresholdFailures);
        return thresholdFailures.length === 0 ? 0 : 1;
      }

      printEvalResult(result);
      printThresholdFailures(thresholdFailures);
      return thresholdFailures.length === 0 ? 0 : 1;
    } catch (error) {
      console.error(`无法运行 eval: ${error.message}`);
      return 1;
    }
  }

  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
};
