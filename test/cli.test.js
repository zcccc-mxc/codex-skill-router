const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");

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

  const output = run(["scan", "--json", tempRoot]);
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

  const output = run(["scan", "--json", "--hide-paths", tempRoot]);
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
