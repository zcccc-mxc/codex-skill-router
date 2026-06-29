const fs = require("node:fs");
const path = require("node:path");
const YAML = require("./yaml");
const { routeTask } = require("./route");

const VALID_MODES = new Set(["strict", "permissive"]);
const EXPECTED_LISTS = ["include", "optional", "exclude"];

function parseEvalContent(content, filePath = "") {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".json") {
    return JSON.parse(content);
  }

  const document = YAML.parseDocument(content, { prettyErrors: false });
  if (document.errors.length > 0) {
    throw new Error(`Eval YAML 语法错误：${document.errors[0].message}`);
  }

  return document.toJS();
}

function normalizeCases(parsed) {
  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && Array.isArray(parsed.cases)) {
    return parsed.cases;
  }

  if (parsed && parsed.prompt) {
    return [parsed];
  }

  throw new Error("测试文件中没有可用测试任务；请使用顶层数组或 cases 数组。");
}

function caseLabel(item, index) {
  return item && item.id ? item.id : `第 ${index + 1} 条测试`;
}

function ensureStringArray(value, fieldName, label) {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error(`测试 ${label} 无效：expected.${fieldName} 必须是字符串数组。`);
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim() === "") {
      throw new Error(`测试 ${label} 无效：expected.${fieldName} 只能包含非空字符串。`);
    }
  }

  const trimmed = value.map((item) => item.trim());
  const duplicates = trimmed.filter((item, index) => trimmed.indexOf(item) !== index);
  if (duplicates.length > 0) {
    throw new Error(`测试 ${label} 无效：expected.${fieldName} 中有重复项 ${[...new Set(duplicates)].join(", ")}。`);
  }

  return trimmed;
}

function assertNoOverlap(left, leftName, right, rightName, label) {
  const overlap = left.filter((item) => right.includes(item));
  if (overlap.length > 0) {
    throw new Error(`测试 ${label} 无效：${overlap.join(", ")} 同时出现在 ${leftName} 和 ${rightName} 中。`);
  }
}

function validateEvalCases(cases) {
  const seenIds = new Set();

  return cases.map((item, index) => {
    const label = caseLabel(item, index);

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`测试 ${label} 无效：每条测试必须是对象。`);
    }

    if (item.id !== undefined && item.id !== "") {
      if (typeof item.id !== "string" || item.id.trim() === "") {
        throw new Error(`测试 ${label} 无效：id 必须是非空字符串。`);
      }

      if (seenIds.has(item.id)) {
        throw new Error(`测试 ${label} 无效：测试 ID 重复。`);
      }

      seenIds.add(item.id);
    }

    if (typeof item.prompt !== "string" || item.prompt.trim() === "") {
      throw new Error(`测试 ${label} 无效：prompt 必须是非空字符串。`);
    }

    const mode = item.mode || "permissive";
    if (!VALID_MODES.has(mode)) {
      throw new Error(`测试 ${label} 无效：mode 只能是 strict 或 permissive。`);
    }

    if (!item.expected || typeof item.expected !== "object" || Array.isArray(item.expected)) {
      throw new Error(`测试 ${label} 无效：缺少 expected 对象。`);
    }

    const expected = {
      include: ensureStringArray(item.expected.include, "include", label),
      optional: ensureStringArray(item.expected.optional, "optional", label),
      exclude: ensureStringArray(item.expected.exclude, "exclude", label),
    };

    assertNoOverlap(expected.include, "include", expected.exclude, "exclude", label);
    assertNoOverlap(expected.optional, "optional", expected.exclude, "exclude", label);

    return {
      id: item.id || "",
      prompt: item.prompt.trim(),
      mode,
      category: typeof item.category === "string" ? item.category : "",
      reason: typeof item.reason === "string" ? item.reason : "",
      expected,
    };
  });
}

function loadEvalCases(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const cases = normalizeCases(parseEvalContent(content, filePath));

  if (cases.length === 0) {
    throw new Error("测试文件中没有可用测试任务。");
  }

  return validateEvalCases(cases);
}

function unique(values) {
  return [...new Set(values)];
}

function evaluateCase(testCase, scanResult, options = {}) {
  const routeResult = routeTask(testCase.prompt, scanResult, { context: options.context });
  const recommendedNames = routeResult.recommended.map((item) => item.skill.name);
  const includeHits = testCase.expected.include.filter((name) => recommendedNames.includes(name));
  const optionalHits = testCase.expected.optional.filter((name) => recommendedNames.includes(name));
  const missed = testCase.expected.include.filter((name) => !recommendedNames.includes(name));
  const falsePositives = testCase.expected.exclude.filter((name) => recommendedNames.includes(name));
  const correctExcludes = testCase.expected.exclude.filter((name) => !recommendedNames.includes(name));
  const allowedStrict = new Set([...testCase.expected.include, ...optionalHits]);
  const unexpectedRecommendations =
    testCase.mode === "strict" ? recommendedNames.filter((name) => !allowedStrict.has(name)) : [];
  const noMatch = testCase.mode === "strict" && testCase.expected.include.length === 0 && testCase.expected.optional.length === 0;
  const exactSetMatch =
    testCase.mode === "strict" &&
    missed.length === 0 &&
    falsePositives.length === 0 &&
    unexpectedRecommendations.length === 0;

  let status = "failed";
  const failureReasons = [];

  if (missed.length > 0) {
    failureReasons.push(`漏掉 include：${missed.join(", ")}`);
  }

  if (falsePositives.length > 0) {
    failureReasons.push(`命中 exclude：${falsePositives.join(", ")}`);
  }

  if (unexpectedRecommendations.length > 0) {
    failureReasons.push(`意外推荐：${unexpectedRecommendations.join(", ")}`);
  }

  if (noMatch && recommendedNames.length > 0) {
    failureReasons.push("no-match 测试出现推荐结果");
  }

  if (testCase.mode === "strict") {
    if (exactSetMatch) {
      status = "complete";
    } else if (includeHits.length > 0 && falsePositives.length === 0) {
      status = "partial";
    }
  } else if (missed.length === 0 && falsePositives.length === 0) {
    status = "complete";
  } else if (includeHits.length > 0 && falsePositives.length === 0) {
    status = "partial";
  }

  return {
    id: testCase.id,
    prompt: testCase.prompt,
    mode: testCase.mode,
    category: testCase.category,
    reason: testCase.reason,
    expected: testCase.expected,
    recommended: recommendedNames,
    includeHits,
    optionalHits,
    correctExcludes,
    missed,
    falsePositives,
    unexpectedRecommendations,
    exactSetMatch,
    noMatch,
    failureReasons,
    status,
  };
}

function buildSkillMetrics(results) {
  const metrics = {};

  function entry(name) {
    metrics[name] ||= {
      required: 0,
      requiredHits: 0,
      missed: 0,
      unexpected: 0,
      excluded: 0,
      excludeHits: 0,
    };
    return metrics[name];
  }

  for (const result of results) {
    for (const name of result.expected.include) {
      const item = entry(name);
      item.required += 1;
      if (result.includeHits.includes(name)) {
        item.requiredHits += 1;
      } else {
        item.missed += 1;
      }
    }

    for (const name of result.expected.exclude) {
      const item = entry(name);
      item.excluded += 1;
      if (result.falsePositives.includes(name)) {
        item.excludeHits += 1;
      }
    }

    for (const name of result.unexpectedRecommendations) {
      entry(name).unexpected += 1;
    }
  }

  return metrics;
}

function topSkillMetric(skillMetrics, field) {
  return Object.entries(skillMetrics)
    .filter(([, value]) => value[field] > 0)
    .sort((left, right) => right[1][field] - left[1][field] || left[0].localeCompare(right[0]))
    .map(([skill, value]) => ({ skill, count: value[field] }));
}

function evaluateRoutes(cases, scanResult, options = {}) {
  const normalizedCases = cases.every((item) => item && item.expected && item.mode)
    ? cases
    : validateEvalCases(cases);
  const results = normalizedCases.map((testCase) => evaluateCase(testCase, scanResult, options));
  const totalInclude = results.reduce((sum, item) => sum + item.expected.include.length, 0);
  const totalExclude = results.reduce((sum, item) => sum + item.expected.exclude.length, 0);
  const includeHits = results.reduce((sum, item) => sum + item.includeHits.length, 0);
  const correctExcludes = results.reduce((sum, item) => sum + item.correctExcludes.length, 0);
  const recommendedTotal = results.reduce((sum, item) => sum + item.recommended.length, 0);
  const strictResults = results.filter((item) => item.mode === "strict");
  const permissiveResults = results.filter((item) => item.mode === "permissive");
  const noMatchResults = results.filter((item) => item.noMatch);
  const strictRecommendationTotal = strictResults.reduce((sum, item) => sum + item.recommended.length, 0);
  const unexpectedTotal = strictResults.reduce((sum, item) => sum + item.unexpectedRecommendations.length, 0);
  const skillMetrics = buildSkillMetrics(results);

  const metrics = {
    requiredRecall: totalInclude === 0 ? 1 : includeHits / totalInclude,
    exclusionAccuracy: totalExclude === 0 ? 1 : correctExcludes / totalExclude,
    exactSetMatch: strictResults.length === 0 ? 1 : strictResults.filter((item) => item.exactSetMatch).length / strictResults.length,
    unexpectedRecommendationRate: strictRecommendationTotal === 0 ? 0 : unexpectedTotal / strictRecommendationTotal,
    noMatchAccuracy:
      noMatchResults.length === 0 ? 1 : noMatchResults.filter((item) => item.recommended.length === 0).length / noMatchResults.length,
    averageSelectedSkills: results.length === 0 ? 0 : recommendedTotal / results.length,
    completeCaseRate: results.length === 0 ? 0 : results.filter((item) => item.status === "complete").length / results.length,
  };

  return {
    summary: {
      total: results.length,
      strict: strictResults.length,
      permissive: permissiveResults.length,
      noMatch: noMatchResults.length,
      complete: results.filter((item) => item.status === "complete").length,
      partial: results.filter((item) => item.status === "partial").length,
      failed: results.filter((item) => item.status === "failed").length,
      skillCount: scanResult.skills?.length || 0,
    },
    metrics,
    skillMetrics,
    failedCases: results.filter((item) => item.status !== "complete"),
    mostMissed: topSkillMetric(skillMetrics, "missed"),
    mostOverTriggered: topSkillMetric(skillMetrics, "unexpected"),
    configuration: {
      modeDefault: "permissive",
      minScore: options.minScore || 2,
    },
    results,

    // Backward-compatible fields kept for existing callers.
    total: results.length,
    complete: results.filter((item) => item.status === "complete").length,
    partial: results.filter((item) => item.status === "partial").length,
    failed: results.filter((item) => item.status === "failed").length,
    includeHitRate: metrics.requiredRecall,
    excludeCorrectRate: metrics.exclusionAccuracy,
    averageRecommended: metrics.averageSelectedSkills,
    falsePositives: results.flatMap((item) => item.falsePositives.map((skill) => ({ prompt: item.prompt, skill }))),
    missed: results.flatMap((item) => item.missed.map((skill) => ({ prompt: item.prompt, skill }))),
  };
}

function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function renderMarkdownReport(result, options = {}) {
  const lines = [
    "# Codex Skill Router Eval Report",
    "",
    `- 执行时间: ${new Date().toISOString()}`,
    `- 测试文件: ${options.evalFile || "(unknown)"}`,
    `- Skill 数量: ${result.summary.skillCount}`,
    "",
    "## 总体指标",
    "",
    `- 测试总数: ${result.summary.total}`,
    `- strict: ${result.summary.strict}`,
    `- permissive: ${result.summary.permissive}`,
    `- no-match: ${result.summary.noMatch}`,
    `- 完全正确: ${result.summary.complete}`,
    `- 部分正确: ${result.summary.partial}`,
    `- 失败: ${result.summary.failed}`,
    `- Required Recall: ${formatPercent(result.metrics.requiredRecall)}`,
    `- Exclusion Accuracy: ${formatPercent(result.metrics.exclusionAccuracy)}`,
    `- Exact Set Match: ${formatPercent(result.metrics.exactSetMatch)}`,
    `- Unexpected Recommendation Rate: ${formatPercent(result.metrics.unexpectedRecommendationRate)}`,
    `- No-Match Accuracy: ${formatPercent(result.metrics.noMatchAccuracy)}`,
    `- Average Selected Skills: ${result.metrics.averageSelectedSkills.toFixed(1)}`,
    "",
    "## 最常漏掉的 Skill",
    "",
    ...(result.mostMissed.length === 0 ? ["- 无"] : result.mostMissed.map((item) => `- ${item.skill}: ${item.count}`)),
    "",
    "## 最常误触发的 Skill",
    "",
    ...(result.mostOverTriggered.length === 0 ? ["- 无"] : result.mostOverTriggered.map((item) => `- ${item.skill}: ${item.count}`)),
    "",
    "## 失败案例",
    "",
  ];

  if (result.failedCases.length === 0) {
    lines.push("- 无");
  } else {
    for (const item of result.failedCases) {
      lines.push(`### ${item.id || item.prompt}`);
      lines.push("");
      lines.push(`- 模式: ${item.mode}`);
      lines.push(`- 任务: ${item.prompt}`);
      lines.push(`- 期望 include: ${item.expected.include.join(", ") || "(空)"}`);
      lines.push(`- 期望 optional: ${item.expected.optional.join(", ") || "(空)"}`);
      lines.push(`- 期望 exclude: ${item.expected.exclude.join(", ") || "(空)"}`);
      lines.push(`- 实际推荐: ${item.recommended.join(", ") || "(空)"}`);
      lines.push(`- 原因: ${item.failureReasons.join("; ") || "(无)"}`);
      lines.push("");
    }
  }

  return `${lines.join("\n")}\n`;
}

module.exports = {
  evaluateRoutes,
  loadEvalCases,
  parseEvalContent,
  renderMarkdownReport,
  validateEvalCases,
};
