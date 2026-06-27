const fs = require("node:fs");
const path = require("node:path");
const { routeTask } = require("./route");

function stripQuotes(value) {
  return value.trim().replace(/^["']|["']$/g, "");
}

function parseYamlList(lines, startIndex) {
  const values = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];

    if (/^\s*-\s+/.test(line)) {
      values.push(stripQuotes(line.replace(/^\s*-\s+/, "")));
      index += 1;
      continue;
    }

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    break;
  }

  return { values, nextIndex: index };
}

function parseSimpleYaml(content) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const cases = [];
  let current = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const promptMatch = trimmed.match(/^-?\s*prompt:\s*(.*)$/);
    if (promptMatch) {
      if (current) {
        cases.push(current);
      }

      current = {
        prompt: stripQuotes(promptMatch[1]),
        expected: {
          include: [],
          exclude: [],
          optional: [],
        },
      };
      continue;
    }

    if (!current) {
      continue;
    }

    if (/^include:\s*$/.test(trimmed)) {
      const parsed = parseYamlList(lines, index + 1);
      current.expected.include = parsed.values;
      index = parsed.nextIndex - 1;
      continue;
    }

    if (/^exclude:\s*$/.test(trimmed)) {
      const parsed = parseYamlList(lines, index + 1);
      current.expected.exclude = parsed.values;
      index = parsed.nextIndex - 1;
      continue;
    }

    if (/^optional:\s*$/.test(trimmed)) {
      const parsed = parseYamlList(lines, index + 1);
      current.expected.optional = parsed.values;
      index = parsed.nextIndex - 1;
    }
  }

  if (current) {
    cases.push(current);
  }

  return cases;
}

function loadEvalCases(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const extension = path.extname(filePath).toLowerCase();
  const parsed = extension === ".json" ? JSON.parse(content) : parseSimpleYaml(content);
  const cases = Array.isArray(parsed) ? parsed : parsed.cases;

  if (!Array.isArray(cases) || cases.length === 0) {
    throw new Error("测试文件中没有可用测试任务。");
  }

  return cases.map((item, index) => {
    const prompt = String(item.prompt || "").trim();
    const expected = item.expected || {};

    if (!prompt) {
      throw new Error(`第 ${index + 1} 条测试任务缺少 prompt。`);
    }

    return {
      prompt,
      expected: {
        include: Array.isArray(expected.include) ? expected.include : [],
        exclude: Array.isArray(expected.exclude) ? expected.exclude : [],
        optional: Array.isArray(expected.optional) ? expected.optional : [],
      },
    };
  });
}

function evaluateRoutes(cases, scanResult) {
  const results = cases.map((testCase) => {
    const routeResult = routeTask(testCase.prompt, scanResult);
    const recommendedNames = routeResult.recommended.map((item) => item.skill.name);
    const includeHits = testCase.expected.include.filter((name) => recommendedNames.includes(name));
    const optionalHits = testCase.expected.optional.filter((name) => recommendedNames.includes(name));
    const missed = testCase.expected.include.filter((name) => !recommendedNames.includes(name));
    const falsePositives = testCase.expected.exclude.filter((name) => recommendedNames.includes(name));
    const correctExcludes = testCase.expected.exclude.filter((name) => !recommendedNames.includes(name));
    const complete = missed.length === 0 && falsePositives.length === 0;
    const partial = !complete && includeHits.length > 0 && falsePositives.length === 0;

    return {
      prompt: testCase.prompt,
      expected: testCase.expected,
      recommended: recommendedNames,
      includeHits,
      optionalHits,
      correctExcludes,
      missed,
      falsePositives,
      status: complete ? "complete" : partial ? "partial" : "failed",
    };
  });

  const totalInclude = results.reduce((sum, item) => sum + item.expected.include.length, 0);
  const totalExclude = results.reduce((sum, item) => sum + item.expected.exclude.length, 0);
  const includeHits = results.reduce((sum, item) => sum + item.includeHits.length, 0);
  const correctExcludes = results.reduce((sum, item) => sum + item.correctExcludes.length, 0);
  const recommendedTotal = results.reduce((sum, item) => sum + item.recommended.length, 0);

  return {
    total: results.length,
    complete: results.filter((item) => item.status === "complete").length,
    partial: results.filter((item) => item.status === "partial").length,
    failed: results.filter((item) => item.status === "failed").length,
    includeHitRate: totalInclude === 0 ? 1 : includeHits / totalInclude,
    excludeCorrectRate: totalExclude === 0 ? 1 : correctExcludes / totalExclude,
    averageRecommended: results.length === 0 ? 0 : recommendedTotal / results.length,
    falsePositives: results.flatMap((item) => item.falsePositives.map((skill) => ({ prompt: item.prompt, skill }))),
    missed: results.flatMap((item) => item.missed.map((skill) => ({ prompt: item.prompt, skill }))),
    results,
  };
}

module.exports = {
  evaluateRoutes,
  loadEvalCases,
  parseSimpleYaml,
};
