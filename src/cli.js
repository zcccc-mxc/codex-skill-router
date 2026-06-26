#!/usr/bin/env node

const { version } = require("../package.json");
const { auditSkills } = require("./audit");
const { evaluateRoutes, loadEvalCases } = require("./evaluate");
const { routeTask } = require("./route");
const { scanSkills } = require("./scan");

const COMMANDS = new Set(["scan", "audit", "route", "eval"]);

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
  -v, --version  显示版本号。

当前状态:
  scan、audit、route 和 eval 已有基础实现。
  所有真实功能都会坚持本地优先、默认只读。`);
}

function printPlaceholder(command, input) {
  const inputLine = input.length > 0 ? `\n输入: ${input.join(" ")}` : "";

  console.log(`csr ${command}

状态:
  这个命令属于 v0.1.0 计划范围，但还没有实现真实功能。${inputLine}

安全说明:
  本次没有扫描、修改、上传任何文件，也没有调用外部 AI。

下一步:
  后续会用一个独立开发步骤实现该命令，并补充测试。`);
}

function printScanResult(result, options = {}) {
  console.log("csr scan");
  console.log("");
  console.log("摘要:");
  console.log(`  扫描位置: ${result.summary.roots}`);
  console.log(`  缺失位置: ${result.summary.missingRoots}`);
  console.log(`  找到 Skills: ${result.summary.total}`);
  console.log(`  正常: ${result.summary.ok}`);
  console.log(`  格式错误: ${result.summary.formatErrors}`);
  console.log(`  读取失败: ${result.summary.readErrors}`);
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

function parseScanArgs(args) {
  const paths = [];
  let json = false;
  let hidePaths = false;
  let brief = false;

  for (const value of args) {
    if (value === "--json") {
      json = true;
      continue;
    }

    if (value === "--hide-paths") {
      hidePaths = true;
      continue;
    }

    if (value === "--brief") {
      brief = true;
      continue;
    }

    paths.push(value);
  }

  return { paths, json, hidePaths, brief };
}

function hideScanPaths(result) {
  return {
    ...result,
    roots: result.roots.map(() => "(已隐藏)"),
    missingRoots: result.missingRoots.map(() => "(已隐藏)"),
    skills: result.skills.map((skill) => ({
      ...skill,
      path: "(已隐藏)",
    })),
  };
}

const AUDIT_SEVERITIES = new Set(["error", "warning", "info"]);

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

function parseAuditArgs(args) {
  const paths = [];
  let severity = "";
  let error = "";

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

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

  return { paths, severity, error };
}

function printRouteInputError() {
  console.error(`csr route 需要一段任务描述。

示例:
  csr route "优化现有的 Next.js 页面，并检查移动端显示"`);
}

function parseRouteArgs(args) {
  const paths = [];
  const taskParts = [];

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

    taskParts.push(value);
  }

  return {
    task: taskParts.join(" ").trim(),
    paths,
  };
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

function printEvalInputError() {
  console.error(`csr eval 需要一个测试文件路径。

示例:
  csr eval ./examples/eval.yml --path ./skills`);
}

function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

function printEvalResult(result) {
  console.log("csr eval");
  console.log("");
  console.log(`总测试数: ${result.total}`);
  console.log(`完全正确: ${result.complete}`);
  console.log(`部分正确: ${result.partial}`);
  console.log(`错误: ${result.failed}`);
  console.log(`必须调用 Skill 命中率: ${formatPercent(result.includeHitRate)}`);
  console.log(`不应调用 Skill 正确排除率: ${formatPercent(result.excludeCorrectRate)}`);
  console.log(`误报: ${result.falsePositives.length}`);
  console.log(`漏报: ${result.missed.length}`);
  console.log(`平均推荐 Skill 数量: ${result.averageRecommended.toFixed(1)}`);
  console.log("");

  const failedCases = result.results.filter((item) => item.status !== "complete");

  if (failedCases.length === 0) {
    console.log("所有测试都符合预期。");
    return;
  }

  console.log("失败或部分正确案例:");
  for (const item of failedCases) {
    console.log(`- ${item.prompt}`);
    console.log(`  状态: ${item.status}`);
    console.log(`  推荐: ${item.recommended.length > 0 ? item.recommended.join(", ") : "(无)"}`);
    console.log(`  漏报: ${item.missed.length > 0 ? item.missed.join(", ") : "(无)"}`);
    console.log(`  误报: ${item.falsePositives.length > 0 ? item.falsePositives.join(", ") : "(无)"}`);
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

  if (command === "route" && rest.length === 0) {
    printRouteInputError();
    return 1;
  }

  if (command === "scan") {
    const scanArgs = parseScanArgs(rest);
    const rawResult = scanSkills({ paths: scanArgs.paths });
    const result = scanArgs.hidePaths ? hideScanPaths(rawResult) : rawResult;

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

    const result = auditSkills(scanSkills({ paths: auditArgs.paths }));
    printAuditResult(filterAuditResult(result, auditArgs.severity), { severity: auditArgs.severity });
    return 0;
  }

  if (command === "route") {
    const routeArgs = parseRouteArgs(rest);
    if (!routeArgs.task) {
      printRouteInputError();
      return 1;
    }

    printRouteResult(routeTask(routeArgs.task, scanSkills({ paths: routeArgs.paths })));
    return 0;
  }

  if (command === "eval") {
    const evalArgs = parsePathArgs(rest);
    const evalFile = evalArgs.rest[0];
    if (!evalFile) {
      printEvalInputError();
      return 1;
    }

    try {
      const cases = loadEvalCases(evalFile);
      printEvalResult(evaluateRoutes(cases, scanSkills({ paths: evalArgs.paths })));
      return 0;
    } catch (error) {
      console.error(`无法运行 eval: ${error.message}`);
      return 1;
    }
  }

  printPlaceholder(command, rest);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
};
