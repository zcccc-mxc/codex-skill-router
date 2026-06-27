const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { similarity } = require("../src/audit");
const { routeTask } = require("../src/route");

const cliPath = path.join(__dirname, "..", "src", "cli.js");

function run(args) {
  return execFileSync(process.execPath, [cliPath, ...args], {
    cwd: path.join(__dirname, ".."),
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

test("prints help", () => {
  const output = run(["--help"]);
  assert.match(output, /Codex Skill Router/);
  assert.match(output, /scan/);
  assert.match(output, /audit/);
  assert.match(output, /route/);
  assert.match(output, /eval/);
});

test("prints command help", () => {
  const output = run(["scan", "--help"]);

  assert.match(output, /csr scan/);
  assert.match(output, /--path/);
  assert.match(output, /--show-paths/);
  assert.doesNotMatch(output, /找到 Skills:/);
});

test("prints version", () => {
  const output = run(["--version"]);
  assert.equal(output.trim(), "0.0.0");
});

test("scans skill files from a custom path", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-"));
  const skillDir = path.join(tempRoot, "sample-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: sample-skill
description: Use when testing the scan command.
---

# Sample Skill
`,
    "utf8",
  );

  const output = run(["scan", tempRoot]);

  assert.match(output, /找到 Skills: 1/);
  assert.match(output, /正常: 1/);
  assert.match(output, /格式错误: 0/);
  assert.match(output, /sample-skill/);
  assert.match(output, /Use when testing the scan command/);
  assert.match(output, /来源: custom/);
  assert.match(output, /状态: 正常/);
});

test("shows paths from scan text output when requested", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-show-"));
  const skillDir = path.join(tempRoot, "shown-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: shown-skill
description: Use when testing explicit path output.
---

# Shown Skill
`,
    "utf8",
  );

  const output = run(["scan", "--show-paths", tempRoot]);

  assert.match(output, /shown-skill/);
  assert.match(output, new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("scans skill files with --path option", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-path-option-"));
  const skillDir = path.join(tempRoot, "path-option-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: path-option-skill
description: Use when testing scan path option support.
---

# Path Option Skill
`,
    "utf8",
  );

  const output = run(["scan", "--json", "--show-paths", "--path", tempRoot]);
  const parsed = JSON.parse(output);

  assert.equal(parsed.summary.roots, 1);
  assert.equal(parsed.summary.missingRoots, 0);
  assert.equal(parsed.summary.total, 1);
  assert.equal(parsed.skills[0].name, "path-option-skill");
});

test("marks malformed skill files", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-bad-"));
  const skillDir = path.join(tempRoot, "bad-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Bad Skill\n", "utf8");

  const output = run(["scan", tempRoot]);

  assert.match(output, /找到 Skills: 1/);
  assert.match(output, /格式错误: 1/);
  assert.match(output, /格式错误/);
  assert.match(output, /缺少 YAML frontmatter/);
});

test("prints scan results as json", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-json-"));
  const skillDir = path.join(tempRoot, "json-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: json-skill
description: Use when testing json scan output.
---

# JSON Skill
`,
    "utf8",
  );

  const output = run(["scan", "--json", "--show-paths", tempRoot]);
  const parsed = JSON.parse(output);

  assert.equal(parsed.summary.total, 1);
  assert.equal(parsed.summary.ok, 1);
  assert.equal(parsed.skills[0].name, "json-skill");
});

test("hides paths from scan text output", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-hide-"));
  const skillDir = path.join(tempRoot, "hidden-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: hidden-skill
description: Use when testing hidden path output.
---

# Hidden Skill
`,
    "utf8",
  );

  const output = run(["scan", "--hide-paths", tempRoot]);

  assert.match(output, /路径: \(已隐藏\)/);
  assert.doesNotMatch(output, new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("redacts local paths inside scan descriptions by default", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-redact-description-"));
  const skillDir = path.join(tempRoot, "path-description-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: path-description-skill
description: Use when reading files from C:\\Users\\Someone\\private\\tool.
---

# Path Description Skill
`,
    "utf8",
  );

  const output = run(["scan", tempRoot]);

  assert.match(output, /path-description-skill/);
  assert.match(output, /\(hidden path\)/);
  assert.doesNotMatch(output, /C:\\Users\\Someone/);
});

test("hides paths from scan json output", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-json-hide-"));
  const skillDir = path.join(tempRoot, "hidden-json-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: hidden-json-skill
description: Use when testing hidden json path output.
---

# Hidden JSON Skill
`,
    "utf8",
  );

  const output = run(["scan", "--json", tempRoot]);
  const parsed = JSON.parse(output);

  assert.equal(parsed.roots[0], "(已隐藏)");
  assert.equal(parsed.skills[0].path, "(已隐藏)");
});

test("prints brief scan output without descriptions", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-brief-"));
  const skillDir = path.join(tempRoot, "brief-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: brief-skill
description: Use when testing brief output.
---

# Brief Skill
`,
    "utf8",
  );

  const output = run(["scan", "--brief", tempRoot]);

  assert.match(output, /brief-skill/);
  assert.match(output, /状态: 正常/);
  assert.doesNotMatch(output, /描述:/);
  assert.doesNotMatch(output, /Use when testing brief output/);
});

test("reads folded multiline descriptions", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-folded-"));
  const skillDir = path.join(tempRoot, "folded-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: folded-skill
description: >-
  Use when the user needs
  multiline metadata support.
---

# Folded Skill
`,
    "utf8",
  );

  const output = run(["scan", tempRoot]);

  assert.match(output, /folded-skill/);
  assert.match(output, /Use when the user needs multiline metadata support/);
});

test("audits missing and weak descriptions", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-audit-"));
  const missingDir = path.join(tempRoot, "missing-description");
  const shortDir = path.join(tempRoot, "short-description");
  fs.mkdirSync(missingDir, { recursive: true });
  fs.mkdirSync(shortDir, { recursive: true });
  fs.writeFileSync(
    path.join(missingDir, "SKILL.md"),
    `---
name: missing-description
---

# Missing Description
`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(shortDir, "SKILL.md"),
    `---
name: short-description
description: Helper.
---

# Short Description
`,
    "utf8",
  );

  const output = run(["audit", tempRoot]);

  assert.match(output, /csr audit/);
  assert.match(output, /发现问题:/);
  assert.match(output, /缺少 description/);
  assert.match(output, /description 太短/);
});

test("audits duplicate skill names", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-audit-duplicate-"));
  for (const dirName of ["one", "two"]) {
    const skillDir = path.join(tempRoot, dirName);
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(
      path.join(skillDir, "SKILL.md"),
      `---
name: duplicate-skill
description: Use when testing duplicate skill names with enough detail.
---

# Duplicate Skill
`,
      "utf8",
    );
  }

  const output = run(["audit", tempRoot]);

  assert.match(output, /Skill 名称重复/);
});

test("audit overlap ignores exclusion text", () => {
  const score = similarity(
    "Use when editing README documentation. Do not use for browser rendering checks.",
    "Use when changing database schema. Do not use for browser rendering checks.",
  );

  assert.ok(score < 0.45);
});

test("filters audit issues by severity", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-audit-severity-"));
  const missingDir = path.join(tempRoot, "missing-description");
  const shortDir = path.join(tempRoot, "short-description");
  fs.mkdirSync(missingDir, { recursive: true });
  fs.mkdirSync(shortDir, { recursive: true });
  fs.writeFileSync(
    path.join(missingDir, "SKILL.md"),
    `---
name: missing-description
---

# Missing Description
`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(shortDir, "SKILL.md"),
    `---
name: short-description
description: Helper.
---

# Short Description
`,
    "utf8",
  );

  const errorOutput = run(["audit", "--severity", "error", "--path", tempRoot]);
  const warningOutput = run(["audit", "--severity", "warning", tempRoot]);

  assert.match(errorOutput, /\[error\]/);
  assert.match(errorOutput, /missing-description/);
  assert.doesNotMatch(errorOutput, /\[warning\]/);
  assert.doesNotMatch(errorOutput, /short-description/);
  assert.match(warningOutput, /\[warning\]/);
  assert.match(warningOutput, /short-description/);
  assert.doesNotMatch(warningOutput, /\[error\]/);
  assert.doesNotMatch(warningOutput, /missing-description/);
});

test("rejects invalid audit severity", () => {
  const result = runFailure(["audit", "--severity", "critical"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /Unknown audit severity: critical/);
});

test("routes a task to matching skills", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-"));
  const uiDir = path.join(tempRoot, "ui-review");
  const dbDir = path.join(tempRoot, "database-migration");
  fs.mkdirSync(uiDir, { recursive: true });
  fs.mkdirSync(dbDir, { recursive: true });
  fs.writeFileSync(
    path.join(uiDir, "SKILL.md"),
    `---
name: ui-review
description: Use when optimizing frontend page layout and mobile display.
---

# UI Review
`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(dbDir, "SKILL.md"),
    `---
name: database-migration
description: Use when changing database schema and migration files.
---

# Database Migration
`,
    "utf8",
  );

  const output = run(["route", "optimize frontend mobile layout", "--path", tempRoot]);

  assert.match(output, /csr route/);
  assert.match(output, /本地路由预测/);
  assert.match(output, /ui-review/);
  assert.match(output, /frontend/);
});

test("routes a Chinese task with known keywords", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-zh-"));
  const browserDir = path.join(tempRoot, "browser-validation");
  fs.mkdirSync(browserDir, { recursive: true });
  fs.writeFileSync(
    path.join(browserDir, "SKILL.md"),
    `---
name: browser-validation
description: 用于检查页面、浏览器显示和移动端布局。
---

# Browser Validation
`,
    "utf8",
  );

  const output = run(["route", "优化页面并检查移动端", "--path", tempRoot]);

  assert.match(output, /browser-validation/);
  assert.match(output, /页面/);
  assert.match(output, /frontend|mobile|validation/);
  assert.match(output, /移动端/);
});

test("routes prefer specific skills over broad skills", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-specific-"));
  const specificDir = path.join(tempRoot, "frontend-ui");
  const broadDir = path.join(tempRoot, "general-helper");
  fs.mkdirSync(specificDir, { recursive: true });
  fs.mkdirSync(broadDir, { recursive: true });
  fs.writeFileSync(
    path.join(specificDir, "SKILL.md"),
    `---
name: frontend-ui
description: Use when optimizing frontend page layout and mobile display.
---

# Frontend UI
`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(broadDir, "SKILL.md"),
    `---
name: general-helper
description: Use when needed for frontend mobile layout or any task.
---

# General Helper
`,
    "utf8",
  );

  const output = run(["route", "optimize frontend mobile layout", "--path", tempRoot]);

  assert.ok(output.indexOf("frontend-ui") < output.indexOf("general-helper"));
  assert.match(output, /description .*frontend/);
});

test("routes lower skills when task matches exclusion text", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-exclusion-"));
  const frontendDir = path.join(tempRoot, "frontend-ui");
  const databaseDir = path.join(tempRoot, "database-migration");
  fs.mkdirSync(frontendDir, { recursive: true });
  fs.mkdirSync(databaseDir, { recursive: true });
  fs.writeFileSync(
    path.join(frontendDir, "SKILL.md"),
    `---
name: frontend-ui
description: Use when optimizing frontend page layout and mobile display.
---

# Frontend UI
`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(databaseDir, "SKILL.md"),
    `---
name: database-migration
description: Use when changing database schema. Do not use for frontend page layout.
---

# Database Migration
`,
    "utf8",
  );

  const output = run(["route", "optimize frontend page layout", "--path", tempRoot]);

  assert.ok(output.indexOf("frontend-ui") < output.indexOf("database-migration"));
  assert.match(output, /命中不适用条件/);
});

test("routes understands documentation synonyms in descriptions", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-docs-"));
  const docsDir = path.join(tempRoot, "docs-authoring");
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(
    path.join(docsDir, "SKILL.md"),
    `---
name: docs-authoring
description: Use when writing documentation pages and editing guides.
---

# Docs Authoring
`,
    "utf8",
  );

  const output = run(["route", "make docs clearer", "--path", tempRoot]);

  assert.match(output, /docs-authoring/);
  assert.match(output, /语义理解/);
});

test("routes understands browser validation descriptions", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-browser-"));
  const browserDir = path.join(tempRoot, "browser-validation");
  fs.mkdirSync(browserDir, { recursive: true });
  fs.writeFileSync(
    path.join(browserDir, "SKILL.md"),
    `---
name: browser-validation
description: Use when running Playwright checks for UI rendering.
---

# Browser Validation
`,
    "utf8",
  );

  const output = run(["route", "validate page rendering in browser", "--path", tempRoot]);

  assert.match(output, /browser-validation/);
  assert.match(output, /语义理解/);
});

test("routes understands simple english word forms", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-word-forms-"));
  const deployDir = path.join(tempRoot, "deploy-skill");
  fs.mkdirSync(deployDir, { recursive: true });
  fs.writeFileSync(
    path.join(deployDir, "SKILL.md"),
    `---
name: deploy-skill
description: Use when deploying apps and publishing releases.
---

# Deploy Skill
`,
    "utf8",
  );

  const output = run(["route", "deploy app release", "--path", tempRoot]);

  assert.match(output, /deploy-skill/);
  assert.match(output, /deploy/);
});

test("routes understands phrase-level concepts", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-route-phrases-"));
  const browserDir = path.join(tempRoot, "browser-validation");
  fs.mkdirSync(browserDir, { recursive: true });
  fs.writeFileSync(
    path.join(browserDir, "SKILL.md"),
    `---
name: browser-validation
description: Use when checking page rendering and browser validation results.
---

# Browser Validation
`,
    "utf8",
  );

  const output = run(["route", "verify browser rendering", "--path", tempRoot]);

  assert.match(output, /browser-validation/);
  assert.match(output, /短语理解/);
});

test("routes do not recommend skills from generic check words only", () => {
  const result = routeTask("check login authorization bypass", {
    skills: [
      {
        name: "ci-debug",
        description: "Use when debugging failing GitHub Actions checks and test runs.",
        path: "ci-debug/SKILL.md",
        source: "custom",
        status: "ok",
      },
    ],
  });

  assert.deepEqual(result.recommended, []);
  assert.equal(result.notRecommended[0].skill.name, "ci-debug");
});

test("routes do not count exclusion text as positive evidence", () => {
  const result = routeTask("create illustration images", {
    skills: [
      {
        name: "database-migration",
        description: "Use when changing database schema and SQL indexes. Do not use for image generation or illustration tasks.",
        path: "database-migration/SKILL.md",
        source: "custom",
        status: "ok",
      },
    ],
  });

  assert.deepEqual(result.recommended, []);
  assert.equal(result.notRecommended[0].skill.name, "database-migration");
});

test("evaluates route cases from json", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-eval-"));
  const skillDir = path.join(tempRoot, "deploy-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: deploy-skill
description: Use when deploying an app and creating a deployment link.
---

# Deploy Skill
`,
    "utf8",
  );

  const evalFile = path.join(tempRoot, "eval.json");
  fs.writeFileSync(
    evalFile,
    JSON.stringify([
      {
        prompt: "deploy app link",
        expected: {
          include: ["deploy-skill"],
          exclude: ["database-skill"],
          optional: ["docs-skill"],
        },
      },
    ]),
    "utf8",
  );

  const output = run(["eval", evalFile, "--path", tempRoot]);

  assert.match(output, /csr eval/);
  assert.match(output, /总测试数: 1/);
  assert.match(output, /完全正确: 1/);
  assert.match(output, /必须调用 Skill 命中率: 100%/);
});

test("evaluates route cases as json output", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-eval-json-output-"));
  const skillDir = path.join(tempRoot, "deploy-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: deploy-skill
description: Use when deploying an app and creating a deployment link.
---

# Deploy Skill
`,
    "utf8",
  );

  const evalFile = path.join(tempRoot, "eval.json");
  fs.writeFileSync(
    evalFile,
    JSON.stringify([
      {
        prompt: "deploy app link",
        expected: {
          include: ["deploy-skill"],
          exclude: ["database-skill"],
        },
      },
    ]),
    "utf8",
  );

  const output = run(["eval", evalFile, "--json", "--path", tempRoot]);
  const parsed = JSON.parse(output);

  assert.equal(parsed.total, 1);
  assert.equal(parsed.complete, 1);
  assert.equal(parsed.includeHitRate, 1);
  assert.equal(parsed.excludeCorrectRate, 1);
  assert.deepEqual(parsed.results[0].optionalHits, []);
  assert.deepEqual(parsed.results[0].recommended, ["deploy-skill"]);
});

test("eval fails when complete rate is below threshold", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-eval-threshold-"));
  const skillDir = path.join(tempRoot, "deploy-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: deploy-skill
description: Use when deploying an app and creating a deployment link.
---

# Deploy Skill
`,
    "utf8",
  );

  const evalFile = path.join(tempRoot, "eval.json");
  fs.writeFileSync(
    evalFile,
    JSON.stringify([
      {
        prompt: "deploy app link",
        expected: {
          include: ["missing-skill"],
          exclude: [],
        },
      },
    ]),
    "utf8",
  );

  const result = runFailure(["eval", evalFile, "--path", tempRoot, "--min-complete-rate", "1"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /below required/);
});

test("eval rejects invalid complete rate threshold", () => {
  const result = runFailure(["eval", "examples/eval.yml", "--min-complete-rate", "2"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /min-complete-rate/);
});

test("example eval file has thirty reproducible cases", () => {
  const output = run(["eval", "examples/eval.yml", "--json", "--path", "examples/skills"]);
  const parsed = JSON.parse(output);

  assert.equal(parsed.total, 30);
  assert.equal(parsed.complete, 30);
  assert.equal(parsed.includeHitRate, 1);
  assert.equal(parsed.excludeCorrectRate, 1);
});

test("evaluates route cases from simple yaml", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-eval-yaml-"));
  const skillDir = path.join(tempRoot, "browser-validation");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    `---
name: browser-validation
description: Use when checking browser page rendering and mobile layout.
---

# Browser Validation
`,
    "utf8",
  );

  const evalFile = path.join(tempRoot, "eval.yml");
  fs.writeFileSync(
    evalFile,
    `prompt: "check mobile page"
expected:
  include:
    - browser-validation
  exclude:
    - database-migration
`,
    "utf8",
  );

  const output = run(["eval", evalFile, "--path", tempRoot]);

  assert.match(output, /总测试数: 1/);
  assert.match(output, /完全正确: 1/);
});
