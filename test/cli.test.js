const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { auditSkills, similarity } = require("../src/audit");
const { extractSkillHints, loadRouteContext } = require("../src/context");
const { evaluateRoutes, loadEvalCases, parseEvalContent, validateEvalCases } = require("../src/evaluate");
const { isSmallLocalTask, routeTask } = require("../src/route");
const { defaultScanRoots, parseFrontmatter, scanSkills, sourceCounts } = require("../src/scan");

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

  assert.match(output, /发现 1 个 Skills/);
  assert.match(output, /custom：1/);
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

test("counts scan skill sources", () => {
  assert.deepEqual(
    sourceCounts([
      { source: "project" },
      { source: "project" },
      { source: "user" },
      { source: "admin" },
      { source: "legacy" },
      { source: "custom" },
    ]),
    {
      project: 2,
      user: 1,
      admin: 1,
      legacy: 1,
      custom: 1,
    },
  );
});

test("default scan roots walk .agents skills up to git root", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-roots-"));
  const nestedDir = path.join(tempRoot, "packages", "app");
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  fs.mkdirSync(nestedDir, { recursive: true });

  const roots = defaultScanRoots(nestedDir, homeDir);
  const rootPaths = roots.map((item) => item.root);

  assert.equal(rootPaths[0], path.join(nestedDir, ".agents", "skills"));
  assert.equal(rootPaths[1], path.join(tempRoot, "packages", ".agents", "skills"));
  assert.equal(rootPaths[2], path.join(tempRoot, ".agents", "skills"));
  assert.equal(rootPaths.includes(path.join(path.dirname(tempRoot), ".agents", "skills")), false);
  assert.ok(roots.some((item) => item.root === path.join(homeDir, ".agents", "skills") && item.source === "user"));
  assert.ok(roots.some((item) => item.root === path.join(nestedDir, ".codex", "skills") && item.source === "legacy"));
  assert.ok(roots.some((item) => item.root === path.join(nestedDir, "skills") && item.source === "legacy"));
  assert.ok(roots.some((item) => item.root === path.join(homeDir, ".codex", "skills") && item.source === "legacy"));
});

test("default scan does not walk above cwd when no git root exists", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-no-git-"));
  const nestedDir = path.join(tempRoot, "packages", "app");
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(nestedDir, { recursive: true });

  const roots = defaultScanRoots(nestedDir, homeDir);
  const projectRoots = roots.filter((item) => item.source === "project").map((item) => item.root);

  assert.deepEqual(projectRoots, [path.join(nestedDir, ".agents", "skills")]);
});

test("default scan reads project .agents skills up to git root", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-project-agents-"));
  const nestedDir = path.join(tempRoot, "packages", "app");
  const nestedSkills = path.join(nestedDir, ".agents", "skills");
  const rootSkills = path.join(tempRoot, ".agents", "skills");
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  writeSkill(nestedSkills, "nested-skill", "nested-skill", "Use when testing nested project standard Skills. Do not use for docs.");
  writeSkill(rootSkills, "root-skill", "root-skill", "Use when testing root project standard Skills. Do not use for docs.");

  const result = scanSkills({ cwd: nestedDir, home: path.join(tempRoot, "home") });

  assert.equal(result.summary.sources.project, 2);
  assert.deepEqual(
    result.skills.map((skill) => [skill.name, skill.source, skill.rootType]),
    [
      ["nested-skill", "project", "standard"],
      ["root-skill", "project", "standard"],
    ],
  );
});

test("default scan reads user .agents skills as user source", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-user-agents-"));
  const homeDir = path.join(tempRoot, "home");
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  writeSkill(
    path.join(homeDir, ".agents", "skills"),
    "user-skill",
    "user-skill",
    "Use when testing user-level standard Skills. Do not use for docs.",
  );

  const result = scanSkills({ cwd: tempRoot, home: homeDir });

  assert.equal(result.summary.sources.user, 1);
  assert.equal(result.skills[0].name, "user-skill");
  assert.equal(result.skills[0].source, "user");
  assert.equal(result.skills[0].rootType, "standard");
});

test("default scan keeps standard roots before legacy roots", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-standard-legacy-"));
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  writeSkill(path.join(tempRoot, ".agents", "skills"), "standard-skill", "standard-skill", "Use when testing standard scan priority. Do not use for docs.");
  writeSkill(path.join(tempRoot, "skills"), "legacy-skill", "legacy-skill", "Use when testing legacy scan priority. Do not use for docs.");

  const result = scanSkills({ cwd: tempRoot, home: path.join(tempRoot, "home") });

  assert.deepEqual(
    result.skills.map((skill) => [skill.name, skill.source, skill.rootType]),
    [
      ["standard-skill", "project", "standard"],
      ["legacy-skill", "legacy", "legacy"],
    ],
  );
});

test("custom scan paths are deduplicated and do not mix default roots", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-custom-dedupe-"));
  const customRoot = path.join(tempRoot, "custom-skills");
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  writeSkill(customRoot, "custom-skill", "custom-skill", "Use when testing custom path scans. Do not use for docs.");
  writeSkill(path.join(tempRoot, ".agents", "skills"), "project-skill", "project-skill", "Use when testing default path scans. Do not use for docs.");

  const result = scanSkills({ cwd: tempRoot, home: path.join(tempRoot, "home"), paths: [customRoot, customRoot] });

  assert.equal(result.summary.roots, 1);
  assert.equal(result.summary.total, 1);
  assert.equal(result.skills[0].name, "custom-skill");
  assert.equal(result.skills[0].source, "custom");
  assert.equal(result.skills[0].rootType, "custom");
});

test("git worktree .git file stops project root walk", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-git-file-"));
  const nestedDir = path.join(tempRoot, "packages", "app");
  fs.mkdirSync(nestedDir, { recursive: true });
  fs.writeFileSync(path.join(tempRoot, ".git"), "gitdir: ../real-git-dir\n", "utf8");

  const roots = defaultScanRoots(nestedDir, path.join(tempRoot, "home"));
  const projectRoots = roots.filter((item) => item.source === "project").map((item) => item.root);

  assert.deepEqual(projectRoots, [
    path.join(nestedDir, ".agents", "skills"),
    path.join(tempRoot, "packages", ".agents", "skills"),
    path.join(tempRoot, ".agents", "skills"),
  ]);
});

test("default scan marks legacy skill directories", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-legacy-"));
  const legacyDir = path.join(tempRoot, "skills", "legacy-skill");
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  fs.mkdirSync(legacyDir, { recursive: true });
  fs.writeFileSync(
    path.join(legacyDir, "SKILL.md"),
    `---
name: legacy-skill
description: Use when testing legacy scan compatibility.
---

# Legacy Skill
`,
    "utf8",
  );

  const result = scanSkills({ cwd: tempRoot, home: path.join(tempRoot, "home") });

  assert.equal(result.summary.total, 1);
  assert.equal(result.skills[0].name, "legacy-skill");
  assert.equal(result.skills[0].source, "legacy");
});

test("marks malformed skill files", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-scan-bad-"));
  const skillDir = path.join(tempRoot, "bad-skill");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, "SKILL.md"), "# Bad Skill\n", "utf8");

  const output = run(["scan", tempRoot]);

  assert.match(output, /发现 1 个 Skills/);
  assert.match(output, /格式错误/);
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

test("parses standard YAML frontmatter shapes", () => {
  const folded = parseFrontmatter(`---
name: "frontend-review"
description: >
  Review existing pages, visual hierarchy,
  responsive layout, and interaction clarity.
metadata:
  category: frontend
allowed-tools:
  - browser
  - shell
---

# Skill
`);

  assert.equal(folded.status, "ok");
  assert.equal(folded.name, "frontend-review");
  assert.match(folded.description, /Review existing pages/);
  assert.match(folded.description, /interaction clarity/);

  const literal = parseFrontmatter(`---\r
name: literal-skill\r
description: |\r
  Line one.\r
  Line two.\r
metadata:\r
  enabled: true\r
---\r
# Skill\r
`);

  assert.equal(literal.status, "ok");
  assert.match(literal.description, /Line one\.\nLine two\./);
});

test("reports frontmatter YAML and type errors", () => {
  assert.equal(parseFrontmatter("# Missing\n").errorType, "missing-frontmatter-start");
  assert.equal(parseFrontmatter("---\nname: broken\n").errorType, "missing-frontmatter-end");
  assert.equal(parseFrontmatter("---\nname: [\n---\n").errorType, "yaml-syntax");
  assert.equal(parseFrontmatter("---\nname: 123\ndescription: ok\n---\n").errorType, "invalid-name-type");
  assert.equal(parseFrontmatter("---\nname: ok\ndescription:\n  nested: true\n---\n").errorType, "invalid-description-type");
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

test("audit recognizes Chinese exclusion markers", () => {
  for (const marker of ["不要", "不适用", "避免", "不要用于"]) {
    const result = auditSkills({
      skills: [
        {
          name: `zh-exclusion-${marker}`,
          description: `用于优化网页布局和移动端显示。${marker} 数据库结构设计或后端接口权限检查。`,
          path: `zh-exclusion-${marker}/SKILL.md`,
          source: "custom",
          status: "ok",
        },
      ],
    });

    assert.equal(result.issues.some((item) => item.type === "missing-exclusion"), false);
  }
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

test("routes suppress obvious small local tasks", () => {
  assert.equal(isSmallLocalTask("explain this one line of code"), true);
  assert.equal(isSmallLocalTask("change one README sentence"), true);
  assert.equal(isSmallLocalTask("write usage guide documentation"), false);

  const result = routeTask("change one README sentence", {
    skills: [
      {
        name: "docs-authoring",
        description: "Use when writing documentation pages and README files.",
        path: "docs-authoring/SKILL.md",
        source: "custom",
        status: "ok",
      },
    ],
  });

  assert.equal(result.suppressSmallTask, true);
  assert.deepEqual(result.recommended, []);
});

test("extracts local route hints from openai yaml style objects", () => {
  const hints = extractSkillHints(
    {
      routing: [
        {
          skill: "docs-authoring",
          when: ["manual pages", "usage guide"],
        },
      ],
    },
    ["docs-authoring", "frontend-ui"],
  );

  assert.equal(hints.length, 1);
  assert.equal(hints[0].skill, "docs-authoring");
  assert.ok(hints[0].terms.includes("manual"));
  assert.ok(hints[0].terms.includes("usage"));
});

test("loads route context from agents openai yaml", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-context-"));
  fs.mkdirSync(path.join(tempRoot, ".git"), { recursive: true });
  fs.mkdirSync(path.join(tempRoot, "agents"), { recursive: true });
  fs.writeFileSync(
    path.join(tempRoot, "agents", "openai.yaml"),
    `routing:
  - skill: docs-authoring
    when:
      - manual pages
      - usage guide
`,
    "utf8",
  );

  const context = loadRouteContext({
    cwd: tempRoot,
    skills: [{ name: "docs-authoring" }],
  });

  assert.equal(context.contextFiles.length, 1);
  assert.equal(context.skillHints.length, 1);
  assert.equal(context.skillHints[0].skill, "docs-authoring");
  assert.ok(context.skillHints[0].terms.includes("manual"));
});

test("routes use local context hints as explainable evidence", () => {
  const result = routeTask(
    "update the manual pages",
    {
      skills: [
        {
          name: "docs-authoring",
          description: "Use when writing documentation pages and editing guides.",
          path: "docs-authoring/SKILL.md",
          source: "custom",
          status: "ok",
        },
      ],
    },
    {
      context: {
        skillHints: [{ skill: "docs-authoring", terms: ["manual"] }],
      },
    },
  );

  assert.equal(result.recommended[0].skill.name, "docs-authoring");
  assert.deepEqual(result.recommended[0].scoreDetails.contextMatches, ["manual"]);
  assert.match(result.recommended[0].reasons.join(" "), /Local context matched: manual/);
});

test("routes prefer project skills over legacy skills when evidence ties", () => {
  const result = routeTask("optimize frontend mobile layout", {
    skills: [
      {
        name: "legacy-ui",
        description: "Use when optimizing frontend mobile layout.",
        path: "legacy-ui/SKILL.md",
        source: "legacy",
        status: "ok",
      },
      {
        name: "project-ui",
        description: "Use when optimizing frontend mobile layout.",
        path: "project-ui/SKILL.md",
        source: "project",
        status: "ok",
      },
    ],
  });

  assert.equal(result.recommended[0].skill.name, "project-ui");
  assert.ok(result.recommended[0].score > result.recommended[1].score);
});

test("routes understand Chinese exclusion markers", () => {
  const result = routeTask("修改数据库结构", {
    skills: [
      {
        name: "frontend-ui",
        description: "用于优化网页布局和移动端显示。不要用于数据库结构、后端接口或权限检查。",
        path: "frontend-ui/SKILL.md",
        source: "custom",
        status: "ok",
      },
    ],
  });

  assert.deepEqual(result.recommended, []);
  assert.equal(result.notRecommended[0].scoreDetails.exclusionMatches.includes("database"), true);
});

test("loads eval cases from top-level cases yaml and json", () => {
  const yamlCases = validateEvalCases(
    parseEvalContent(`version: 1
cases:
  - id: strict-no-match
    prompt: rename one variable
    mode: strict
    expected:
      include: []
      optional: []
      exclude: []
`, "eval.yml").cases,
  );

  assert.equal(yamlCases[0].id, "strict-no-match");
  assert.equal(yamlCases[0].mode, "strict");

  const jsonCases = validateEvalCases(
    parseEvalContent(
      JSON.stringify([
        {
          prompt: "deploy app",
          expected: { include: ["deploy-skill"], exclude: [] },
        },
      ]),
      "eval.json",
    ),
  );

  assert.equal(jsonCases[0].mode, "permissive");
  assert.deepEqual(jsonCases[0].expected.include, ["deploy-skill"]);
});

test("validates eval case errors", () => {
  assert.throws(
    () => validateEvalCases([{ id: "x", prompt: "", expected: { include: [] } }]),
    /prompt/,
  );
  assert.throws(
    () => validateEvalCases([{ id: "x", prompt: "task", mode: "exact", expected: { include: [] } }]),
    /mode/,
  );
  assert.throws(
    () => validateEvalCases([{ id: "x", prompt: "task", expected: { include: "skill" } }]),
    /expected\.include/,
  );
  assert.throws(
    () => validateEvalCases([{ id: "x", prompt: "task", expected: { include: ["a"], exclude: ["a"] } }]),
    /include 和 exclude/,
  );
  assert.throws(
    () =>
      validateEvalCases([
        { id: "x", prompt: "one", expected: { include: [] } },
        { id: "x", prompt: "two", expected: { include: [] } },
      ]),
    /ID 重复/,
  );
});

test("computes reliable eval metrics from fixed cases", () => {
  const scanResult = {
    skills: [
      {
        name: "deploy-skill",
        description: "Use when deploying an app and creating a deployment link.",
        path: "deploy-skill/SKILL.md",
        source: "custom",
        status: "ok",
      },
      {
        name: "docs-authoring",
        description: "Use when writing documentation pages and README files.",
        path: "docs-authoring/SKILL.md",
        source: "custom",
        status: "ok",
      },
    ],
  };
  const result = evaluateRoutes(
    [
      {
        id: "deploy",
        prompt: "deploy app link",
        mode: "permissive",
        expected: { include: ["deploy-skill"], optional: [], exclude: ["docs-authoring"] },
      },
      {
        id: "no-match",
        prompt: "rename local variable",
        mode: "strict",
        expected: { include: [], optional: [], exclude: [] },
      },
    ],
    scanResult,
  );

  assert.equal(result.summary.total, 2);
  assert.equal(result.metrics.requiredRecall, 1);
  assert.equal(result.metrics.exclusionAccuracy, 1);
  assert.equal(result.metrics.noMatchAccuracy, 1);
  assert.equal(result.skillMetrics["deploy-skill"].requiredHits, 1);
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

  assert.match(output, /Routing Eval/);
  assert.match(output, /测试总数: 1/);
  assert.match(output, /完全正确: 1/);
  assert.match(output, /Required Recall: 100\.0%/);
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
  assert.equal(parsed.metrics.requiredRecall, 1);
  assert.equal(parsed.metrics.exclusionAccuracy, 1);
  assert.equal(parsed.summary.total, 1);
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
  assert.match(result.output, /质量门槛未通过/);
  assert.match(result.output, /Complete Case Rate/);
});

test("eval rejects invalid complete rate threshold", () => {
  const result = runFailure(["eval", "examples/eval.yml", "--min-complete-rate", "2"]);

  assert.equal(result.status, 1);
  assert.match(result.output, /min-complete-rate/);
});

test("eval writes markdown report", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-eval-report-"));
  const reportPath = path.join(tempRoot, "report.md");

  const output = run(["eval", "examples/eval.yml", "--output", reportPath, "--path", "examples/skills"]);
  const report = fs.readFileSync(reportPath, "utf8");

  assert.match(output, /Routing Eval/);
  assert.match(report, /# Codex Skill Router Eval Report/);
  assert.match(report, /Required Recall/);
  assert.doesNotMatch(report, new RegExp(tempRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("eval supports new threshold options", () => {
  const output = run([
    "eval",
    "examples/eval.yml",
    "--path",
    "examples/skills",
    "--min-required-recall",
    "1",
    "--min-exclusion-accuracy",
    "1",
  ]);

  assert.match(output, /Required Recall: 100\.0%/);
});

test("eval fails when multiple thresholds are not met", () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "csr-eval-multi-threshold-"));
  writeSkill(
    tempRoot,
    "deploy-skill",
    "deploy-skill",
    "Use when deploying an app and creating a deployment link.",
  );
  const evalFile = path.join(tempRoot, "eval.json");
  fs.writeFileSync(
    evalFile,
    JSON.stringify([
      {
        prompt: "deploy app link",
        expected: {
          include: ["missing-skill"],
          exclude: ["deploy-skill"],
        },
      },
    ]),
    "utf8",
  );

  const result = runFailure([
    "eval",
    evalFile,
    "--path",
    tempRoot,
    "--min-required-recall",
    "1",
    "--min-exclusion-accuracy",
    "1",
  ]);

  assert.equal(result.status, 1);
  assert.match(result.output, /质量门槛未通过/);
  assert.match(result.output, /Required Recall/);
  assert.match(result.output, /Exclusion Accuracy/);
});

test("example eval file has fifty reproducible cases", () => {
  const output = run(["eval", "examples/eval.yml", "--json", "--path", "examples/skills"]);
  const parsed = JSON.parse(output);

  assert.equal(parsed.summary.total, 50);
  assert.equal(parsed.summary.noMatch, 10);
  assert.equal(parsed.metrics.requiredRecall, 1);
  assert.equal(parsed.metrics.exclusionAccuracy, 1);
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

  assert.match(output, /测试总数: 1/);
  assert.match(output, /完全正确: 1/);
});
