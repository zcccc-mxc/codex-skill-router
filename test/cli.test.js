const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { auditSkills, similarity } = require("../src/audit");
const { budgetSkills, estimateTextTokens } = require("../src/budget");
const { extractSkillHints, loadRouteContext } = require("../src/context");
const { evaluateRoutes, parseEvalContent, validateEvalCases } = require("../src/evaluate");
const { isSmallLocalTask, routeTask } = require("../src/route");
const { defaultScanRoots, parseFrontmatter, scanSkills, sourceCounts } = require("../src/scan");

const repoRoot = path.join(__dirname, "..");
const cliPath = path.join(repoRoot, "src", "cli.js");

function run(args, options = {}) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
  });
}

function runFailure(args) {
  try {
    run(args);
  } catch (error) {
    return {
      status: error.status,
      output: `${error.stdout || ""}${error.stderr || ""}`,
    };
  }

  throw new Error("Expected command to fail.");
}

function writeSkill(root, dirName, name, description) {
  const skillDir = path.join(root, dirName);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: ${name}
description: ${description}
---

# ${name}
`,
    "utf8",
  );
}

test("prints top-level and command help", () => {
  const output = run(["--help"]);
  assert.match(output, /Codex Skill Router/);
  for (const command of ["scan", "audit", "route", "eval", "budget"]) {
    assert.match(output, new RegExp(command));
    assert.match(run([command, "--help"]), new RegExp(`csr ${command}`));
  }
});

test("prints stable version", () => {
  assert.equal(run(["--version"]).trim(), "0.1.0");
});

test("default scan roots follow Codex standard locations and legacy compatibility", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-roots-"));
  const nestedDir = path.join(tempRoot, "packages", "app");
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  fs.mkdirSync(nestedDir, { recursive: true });

  const roots = defaultScanRoots(nestedDir, homeDir);
  const rootPaths = roots.map((item) => item.root);

  assert.equal(rootPaths[0], path.join(nestedDir, ".agents", "skills"));
  assert.equal(rootPaths[1], path.join(tempRoot, "packages", ".agents", "skills"));
  assert.equal(rootPaths[2], path.join(tempRoot, ".agents", "skills"));
  assert.ok(roots.some((item) => item.root === path.join(homeDir, ".agents", "skills") && item.source === "user"));
  assert.ok(roots.some((item) => item.root === path.join(nestedDir, ".codex", "skills") && item.source === "legacy"));
  assert.ok(roots.some((item) => item.root === path.join(nestedDir, "skills") && item.source === "legacy"));
});

test("default scan stops at cwd when no git root exists", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-no-git-"));
  const nestedDir = path.join(tempRoot, "packages", "app");
  fs.mkdirSync(nestedDir, { recursive: true });

  const projectRoots = defaultScanRoots(nestedDir, path.join(tempRoot, "home"))
    .filter((item) => item.source === "project")
    .map((item) => item.root);

  assert.deepEqual(projectRoots, [path.join(nestedDir, ".agents", "skills")]);
});

test("scan reads standard project, user, custom, and legacy skills", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-"));
  const nestedDir = path.join(tempRoot, "app");
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  writeSkill(path.join(nestedDir, ".agents", "skills"), "nested", "nested-skill", "Use when testing nested project Skills. Do not use for docs.");
  writeSkill(path.join(tempRoot, ".agents", "skills"), "root", "root-skill", "Use when testing root project Skills. Do not use for docs.");
  writeSkill(path.join(homeDir, ".agents", "skills"), "user", "user-skill", "Use when testing user Skills. Do not use for docs.");
  writeSkill(path.join(nestedDir, "skills"), "legacy", "legacy-skill", "Use when testing legacy Skills. Do not use for docs.");

  const result = scanSkills({ cwd: nestedDir, home: homeDir });
  assert.equal(result.summary.sources.project, 2);
  assert.equal(result.summary.sources.user, 1);
  assert.equal(result.summary.sources.legacy, 1);

  const custom = scanSkills({ cwd: nestedDir, home: homeDir, paths: [path.join(homeDir, ".agents", "skills")] });
  assert.equal(custom.summary.sources.custom, 1);
});

test("source counts are stable", () => {
  assert.deepEqual(
    sourceCounts([{ source: "project" }, { source: "user" }, { source: "admin" }, { source: "legacy" }, { source: "custom" }]),
    { project: 1, user: 1, admin: 1, legacy: 1, custom: 1 },
  );
});

test("scan CLI hides paths by default and can show paths explicitly", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-cli-"));
  writeSkill(tempRoot, "sample", "sample-skill", "Use when reading C:\\Users\\Someone\\secret.");

  const hidden = run(["scan", "--path", tempRoot]);
  assert.match(hidden, /Found 1 Skills/);
  assert.match(hidden, /sample-skill/);
  assert.match(hidden, /\(hidden path\)/);
  assert.doesNotMatch(hidden, /C:\\Users\\Someone/);
  assert.doesNotMatch(hidden, new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const shown = run(["scan", "--show-paths", "--path", tempRoot]);
  assert.match(shown, new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("scan JSON is parseable, versioned, and private by default", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-json-"));
  writeSkill(tempRoot, "json", "json-skill", "Use when testing json scan output.");

  const parsed = JSON.parse(run(["scan", "--json", "--path", tempRoot]));
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.command, "scan");
  assert.equal(parsed.summary.total, 1);
  assert.equal(parsed.skills[0].path, "(hidden path)");
});

test("frontmatter parser supports standard YAML and errors", () => {
  const folded = parseFrontmatter(`---
name: "frontend-review"
description: >
  Review existing pages,
  responsive layout, and interaction clarity.
metadata:
  category: frontend
---
# Skill
`);

  assert.equal(folded.status, "ok");
  assert.equal(folded.name, "frontend-review");
  assert.match(folded.description, /responsive layout/);
  assert.equal(parseFrontmatter("# Missing\n").errorType, "missing-frontmatter-start");
  assert.equal(parseFrontmatter("---\nname: broken\n").errorType, "missing-frontmatter-end");
  assert.equal(parseFrontmatter("---\nname: [\n---\n").errorType, "yaml-syntax");
  assert.equal(parseFrontmatter("---\nname: 123\ndescription: ok\n---\n").errorType, "invalid-name-type");
  assert.equal(parseFrontmatter("---\nname: ok\ndescription:\n  nested: true\n---\n").errorType, "invalid-description-type");
});

test("scan marks malformed skill files without crashing", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-bad-skill-"));
  fs.mkdirSync(path.join(tempRoot, "bad"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "bad", "SKILL.md"), "# Bad Skill\n", "utf8");

  const output = run(["scan", "--path", tempRoot]);
  assert.match(output, /Found 1 Skills/);
  assert.match(output, /format-error/);
  assert.match(output, /YAML frontmatter/);
});

test("audit detects missing, weak, duplicate, overlap, and Chinese exclusion markers", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-audit-"));
  fs.mkdirSync(path.join(tempRoot, "missing"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "missing", "SKILL.md"), "---\nname: missing-description\n---\n", "utf8");
  writeSkill(tempRoot, "short", "short-description", "Helper.");
  writeSkill(tempRoot, "dup-a", "duplicate-skill", "Use when testing duplicate skill names with enough detail.");
  writeSkill(tempRoot, "dup-b", "duplicate-skill", "Use when testing duplicate skill names with enough detail.");

  const output = run(["audit", "--path", tempRoot]);
  assert.match(output, /Issues found:/);
  assert.match(output, /missing-description/);
  assert.match(output, /short-description/);
  assert.match(output, /duplicate-name/);

  assert.ok(
    similarity(
      "Use when editing README documentation. Do not use for browser rendering checks.",
      "Use when changing database schema. Do not use for browser rendering checks.",
    ) < 0.45,
  );

  for (const marker of ["不要", "不适用", "避免", "不要用于"]) {
    const result = auditSkills({
      skills: [{
        name: `zh-${marker}`,
        description: `用于优化网页布局和移动端显示。${marker} 数据库结构设计或权限检查。`,
        path: "zh/SKILL.md",
        source: "custom",
        status: "ok",
      }],
    });
    assert.equal(result.issues.some((item) => item.type === "missing-exclusion"), false);
  }
});

test("audit severity errors return input exit code", () => {
  const result = runFailure(["audit", "--severity", "critical"]);
  assert.equal(result.status, 2);
  assert.match(result.output, /Unknown audit severity/);
});

test("route recommends, explains, excludes, and suppresses small tasks", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-"));
  writeSkill(tempRoot, "frontend-ui", "frontend-ui", "Use when optimizing frontend page layout and mobile display.");
  writeSkill(tempRoot, "database-migration", "database-migration", "Use when changing database schema. Do not use for frontend page layout.");

  const output = run(["route", "optimize frontend page layout", "--path", tempRoot]);
  assert.match(output, /本地路由预测/);
  assert.ok(output.indexOf("frontend-ui") < output.indexOf("database-migration"));
  assert.match(output, /不适用条件/);

  assert.equal(isSmallLocalTask("explain this one line of code"), true);
  assert.deepEqual(routeTask("change one README sentence", {
    skills: [{
      name: "docs-authoring",
      description: "Use when writing documentation pages and README files.",
      path: "docs/SKILL.md",
      source: "custom",
      status: "ok",
    }],
  }).recommended, []);
});

test("route understands concepts, phrases, context hints, and source priority", () => {
  const docsResult = routeTask("make docs clearer", {
    skills: [{
      name: "docs-authoring",
      description: "Use when writing documentation pages and editing guides.",
      path: "docs/SKILL.md",
      source: "custom",
      status: "ok",
    }],
  });
  assert.equal(docsResult.recommended[0].skill.name, "docs-authoring");
  assert.ok(docsResult.recommended[0].scoreDetails.semanticMatches.length > 0);

  const browserOutput = run(["route", "verify browser rendering", "--path", path.join(repoRoot, "examples", "skills")]);
  assert.match(browserOutput, /browser-validation/);
  assert.match(browserOutput, /短语理解/);

  const contextResult = routeTask("update the manual pages", {
    skills: [{
      name: "docs-authoring",
      description: "Use when writing documentation pages and editing guides.",
      path: "docs/SKILL.md",
      source: "custom",
      status: "ok",
    }],
  }, { context: { skillHints: [{ skill: "docs-authoring", terms: ["manual"] }] } });
  assert.deepEqual(contextResult.recommended[0].scoreDetails.contextMatches, ["manual"]);

  const priorityResult = routeTask("optimize frontend mobile layout", {
    skills: [
      { name: "legacy-ui", description: "Use when optimizing frontend mobile layout.", path: "legacy/SKILL.md", source: "legacy", status: "ok" },
      { name: "project-ui", description: "Use when optimizing frontend mobile layout.", path: "project/SKILL.md", source: "project", status: "ok" },
    ],
  });
  assert.equal(priorityResult.recommended[0].skill.name, "project-ui");
});

test("route avoids generic and exclusion-only false positives", () => {
  assert.deepEqual(routeTask("check login authorization bypass", {
    skills: [{
      name: "ci-debug",
      description: "Use when debugging failing GitHub Actions checks and test runs.",
      path: "ci/SKILL.md",
      source: "custom",
      status: "ok",
    }],
  }).recommended, []);

  assert.deepEqual(routeTask("create illustration images", {
    skills: [{
      name: "database-migration",
      description: "Use when changing database schema. Do not use for image generation or illustration tasks.",
      path: "db/SKILL.md",
      source: "custom",
      status: "ok",
    }],
  }).recommended, []);
});

test("route handles Chinese exclusion markers", () => {
  const result = routeTask("修改数据库结构", {
    skills: [{
      name: "frontend-ui",
      description: "用于优化网页布局和移动端显示。不要用于数据库结构、后端接口或权限检查。",
      path: "frontend/SKILL.md",
      source: "custom",
      status: "ok",
    }],
  });
  assert.deepEqual(result.recommended, []);
  assert.ok(result.notRecommended[0].scoreDetails.exclusionMatches.includes("database"));
});

test("local route context loads agents/openai.yaml hints", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-context-"));
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "agents"), { recursive: true });
  fs.writeFileSync(path.join(tempRoot, "agents", "openai.yaml"), "routing:\n  - skill: docs-authoring\n    when:\n      - manual pages\n", "utf8");

  const hints = extractSkillHints({ routing: [{ skill: "docs-authoring", when: ["manual pages"] }] }, ["docs-authoring"]);
  assert.equal(hints[0].skill, "docs-authoring");
  assert.ok(hints[0].terms.includes("manual"));

  const context = loadRouteContext({ cwd: tempRoot, skills: [{ name: "docs-authoring" }] });
  assert.equal(context.contextFiles.length, 1);
  assert.equal(context.skillHints[0].skill, "docs-authoring");
});

test("eval parses YAML and JSON, validates cases, and computes metrics", () => {
  const yamlCases = validateEvalCases(parseEvalContent("version: 1\ncases:\n  - id: no-match\n    prompt: rename one variable\n    mode: strict\n    expected:\n      include: []\n      optional: []\n      exclude: []\n", "eval.yml").cases);
  assert.equal(yamlCases[0].mode, "strict");

  const jsonCases = validateEvalCases(parseEvalContent(JSON.stringify([{ prompt: "deploy app", expected: { include: ["deploy-skill"], exclude: [] } }]), "eval.json"));
  assert.equal(jsonCases[0].mode, "permissive");

  assert.throws(() => validateEvalCases([{ prompt: "", expected: { include: [] } }]), /prompt/);
  assert.throws(() => validateEvalCases([{ prompt: "task", mode: "bad", expected: { include: [] } }]), /mode/);
  assert.throws(() => validateEvalCases([{ prompt: "task", expected: { include: "skill" } }]), /expected\.include/);
  assert.throws(() => validateEvalCases([{ id: "x", prompt: "task", expected: { include: ["a"], exclude: ["a"] } }]), /include 和 exclude/);

  const result = evaluateRoutes([{
    prompt: "deploy app link",
    expected: { include: ["deploy-skill"], optional: [], exclude: ["docs-authoring"] },
  }], {
    skills: [
      { name: "deploy-skill", description: "Use when deploying an app and creating a deployment link.", path: "deploy/SKILL.md", source: "custom", status: "ok" },
      { name: "docs-authoring", description: "Use when writing documentation pages.", path: "docs/SKILL.md", source: "custom", status: "ok" },
    ],
  });
  assert.equal(result.metrics.requiredRecall, 1);
  assert.equal(result.metrics.exclusionAccuracy, 1);
});

test("eval CLI supports text, JSON, reports, no-match, and quality gates", () => {
  const evalText = run(["eval", "examples/eval.yml", "--path", "examples/skills"]);
  assert.match(evalText, /Total cases: 50/);
  assert.match(evalText, /complete: 50/);
  assert.match(evalText, /No-Match Accuracy: 100.0%/);

  const parsed = JSON.parse(run(["eval", "examples/eval.yml", "--json", "--path", "examples/skills"]));
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.command, "eval");
  assert.equal(parsed.summary.total, 50);
  assert.equal(parsed.metrics.requiredRecall, 1);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-eval-report-"));
  const reportPath = path.join(tempRoot, "report.md");
  run(["eval", "examples/eval.yml", "--output", reportPath, "--path", "examples/skills"]);
  const report = fs.readFileSync(reportPath, "utf8");
  assert.match(report, /# Codex Skill Router Eval Report/);
  assert.doesNotMatch(report, new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const failingEval = path.join(tempRoot, "failing-eval.json");
  fs.writeFileSync(
    failingEval,
    JSON.stringify([{ prompt: "deploy app link", expected: { include: ["missing-skill"], exclude: [] } }]),
    "utf8",
  );
  const failedGate = runFailure(["eval", failingEval, "--path", "examples/skills", "--min-complete-rate", "1"]);
  assert.equal(failedGate.status, 3);
  assert.match(failedGate.output, /Quality gates failed/);

  const invalidGate = runFailure(["eval", "examples/eval.yml", "--min-complete-rate", "2"]);
  assert.equal(invalidGate.status, 2);
});

test("budget estimates local metadata and hides paths", () => {
  assert.equal(estimateTextTokens("12345"), 2);
  const result = budgetSkills({
    skills: [
      { name: "docs-authoring", description: "Use when writing documentation pages.", path: "docs/SKILL.md", source: "custom", status: "ok" },
      { name: "broken", description: "", path: "broken/SKILL.md", source: "custom", status: "format-error" },
    ],
  }, { maxRecommendedTokens: 10 });
  assert.equal(result.summary.totalSkills, 2);
  assert.equal(result.summary.includedSkills, 1);
  assert.equal(result.skills[1].included, false);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-budget-"));
  writeSkill(tempRoot, "docs", "docs-authoring", "Use when writing documentation pages.");
  const textOutput = run(["budget", "--path", tempRoot]);
  assert.match(textOutput, /csr budget/);
  assert.match(textOutput, /Estimated tokens:/);
  assert.doesNotMatch(textOutput, new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  const parsed = JSON.parse(run(["budget", "--json", "--path", tempRoot]));
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.command, "budget");
  assert.equal(parsed.summary.totalSkills, 1);
  assert.equal(parsed.skills[0].path, "(hidden path)");
});

test("CLI input errors use documented exit codes", () => {
  assert.equal(runFailure(["unknown"]).status, 2);
  assert.equal(runFailure(["route"]).status, 2);
  assert.equal(runFailure(["eval"]).status, 2);
  assert.equal(runFailure(["budget", "--max-tokens", "0"]).status, 2);
});
