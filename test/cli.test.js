const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { auditSkills, similarity } = require("../src/audit");
const { buildAcceptanceCriteria } = require("../src/acceptance");
const { buildAgentStrategy } = require("../src/agents");
const { budgetSkills, estimateTextTokens } = require("../src/budget");
const { extractSkillHints, loadRouteContext } = require("../src/context");
const { evaluateRoutes, parseEvalContent, validateEvalCases } = require("../src/evaluate");
const { analyzeTaskPermissions } = require("../src/permissions");
const { isSmallLocalTask, routeTask } = require("../src/route");
const { defaultScanRoots, parseFrontmatter, scanSkills, sourceCounts } = require("../src/scan");

const repoRoot = path.join(__dirname, "..");
const cliPath = path.join(repoRoot, "src", "cli.js");
const packageVersion = require("../package.json").version;

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
  for (const command of ["scan", "audit", "route", "eval", "budget", "plan"]) {
    assert.match(output, new RegExp(command));
    assert.match(run([command, "--help"]), new RegExp(`csr ${command}`));
  }
});

test("prints the package version", () => {
  assert.equal(run(["--version"]).trim(), packageVersion);
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

test("route JSON is parseable, stable, private by default, and consistent with text routing", () => {
  const task = "check login authorization bypass";
  const jsonOutput = run(["route", task, "--json", "--path", "examples/skills"]);
  const parsed = JSON.parse(jsonOutput);
  const textOutput = run(["route", task, "--path", "examples/skills"]);

  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.command, "route");
  assert.equal(parsed.success, true);
  assert.equal(parsed.summary.skillCount, 10);
  assert.equal(parsed.summary.noMatch, false);
  assert.equal(parsed.summary.smallTaskSuppressed, false);
  assert.equal(parsed.data.task, task);
  assert.ok(Array.isArray(parsed.data.recommendedSkills));
  assert.ok(Array.isArray(parsed.data.notRecommendedSkills));
  assert.ok(Array.isArray(parsed.warnings));
  assert.ok(Array.isArray(parsed.errors));
  assert.equal(parsed.data.recommendedSkills[0].name, "security-review");
  assert.deepEqual(Object.keys(parsed.data.recommendedSkills[0]).sort(), ["matchedTerms", "name", "path", "reasons", "score", "scoreDetails", "source", "status"]);
  assert.equal(parsed.data.recommendedSkills[0].path, "(hidden path)");
  assert.doesNotMatch(jsonOutput, /[A-Za-z]:\\/);
  assert.match(textOutput, /security-review/);

  const noMatch = JSON.parse(run(["route", "fix one typo", "--json", "--path", "examples/skills"]));
  assert.equal(noMatch.success, true);
  assert.deepEqual(noMatch.data.recommendedSkills, []);
  assert.equal(noMatch.summary.noMatch, true);
  assert.equal(noMatch.summary.smallTaskSuppressed, true);

  const chinese = JSON.parse(run(["route", "检查登录接口是否存在权限绕过", "--json", "--path", "examples/skills"]));
  assert.equal(chinese.success, true);
  assert.equal(chinese.data.recommendedSkills[0].name, "security-review");

  const shown = JSON.parse(run(["route", task, "--json", "--show-paths", "--path", "examples/skills"]));
  assert.notEqual(shown.data.recommendedSkills[0].path, "(hidden path)");
});

test("route JSON returns a parseable input error with exit code 2", () => {
  const result = runFailure(["route", "--json"]);
  const parsed = JSON.parse(result.output);

  assert.equal(result.status, 2);
  assert.equal(parsed.schemaVersion, 1);
  assert.equal(parsed.command, "route");
  assert.equal(parsed.success, false);
  assert.deepEqual(parsed.summary, {});
  assert.deepEqual(parsed.data, {});
  assert.deepEqual(parsed.errors, [{ code: "MISSING_TASK", message: "A task description is required." }]);
});

test("plan combines route results, local budget estimates, and P3 permission predictions", () => {
  const task = "check login authorization bypass";
  const route = JSON.parse(run(["route", task, "--json", "--path", "examples/skills"]));
  const text = run(["plan", task, "--path", "examples/skills"]);
  const plan = JSON.parse(run(["plan", "--json", "--path", "examples/skills", task]));

  assert.match(text, /Task Plan/);
  assert.match(text, /Recommended Skills/);
  assert.match(text, /Token Estimate/);
  assert.match(text, /Expected Actions/);
  assert.match(text, /Permission Risks/);
  assert.match(text, /Required Confirmations/);
  assert.match(text, /Warnings/);
  assert.match(text, /Unknowns/);
  assert.match(text, /security-review/);
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.command, "plan");
  assert.equal(plan.success, true);
  assert.deepEqual(plan.data.recommendedSkills.map((skill) => skill.name), route.data.recommendedSkills.map((skill) => skill.name));
  assert.equal(plan.summary.noMatch, false);
  assert.ok(plan.summary.recommendedSkillsEstimatedTokens <= plan.summary.allSkillsEstimatedTokens);
  assert.equal(plan.data.tokenEstimate.actualCodexUsageKnown, false);
  assert.ok(plan.data.permissionRisks.length > 0);
  assert.deepEqual(plan.data.requiredConfirmations, []);
  assert.ok(plan.data.acceptanceCriteria.length > 0);
  assert.equal(plan.data.acceptanceSummary.verificationPerformed, false);
  assert.ok(plan.data.unknowns.some((item) => item.includes("analysis is limited")));
  assert.equal(plan.data.recommendedSkills[0].path, "(hidden path)");

  const overBudget = JSON.parse(run(["plan", task, "--json", "--max-tokens", "1", "--path", "examples/skills"]));
  assert.equal(overBudget.success, true);
  assert.equal(overBudget.summary.overBudget, true);
  assert.ok(overBudget.warnings.length > 1);

  const noMatch = JSON.parse(run(["plan", "fix one typo", "--json", "--path", "examples/skills"]));
  assert.equal(noMatch.summary.noMatch, true);
  assert.equal(noMatch.summary.smallTaskSuppressed, true);
  assert.equal(noMatch.summary.recommendedSkillsEstimatedTokens, 0);

  const unrelated = JSON.parse(run(["plan", "decide an intentionally vague unrelated request", "--json", "--path", "examples/skills"]));
  assert.equal(unrelated.success, true);
  assert.equal(unrelated.summary.noMatch, true);
  assert.deepEqual(unrelated.data.recommendedSkills, []);
  assert.equal(unrelated.summary.recommendedSkillsEstimatedTokens, 0);

  const chinese = JSON.parse(run(["plan", "检查登录接口是否存在权限绕过", "--json", "--path", "examples/skills"]));
  assert.equal(chinese.data.recommendedSkills[0].name, "security-review");
  const mixed = JSON.parse(run(["plan", "优化 Next.js 页面并检查 mobile layout", "--json", "--path", "examples/skills"]));
  assert.equal(mixed.success, true);

  const shown = JSON.parse(run(["plan", task, "--json", "--show-paths", "--path", "examples/skills"]));
  assert.notEqual(shown.data.recommendedSkills[0].path, "(hidden path)");
});

test("permission analysis predicts local risks and confirmations without executing actions", () => {
  const readOnly = analyzeTaskPermissions("Review the authentication code without modifying any files.");
  assert.equal(readOnly.permissionRisks.find((item) => item.type === "file-read").status, "required");
  assert.equal(readOnly.permissionRisks.find((item) => item.type === "file-write").status, "not-required");
  assert.equal(readOnly.highestRisk, "low");
  assert.equal(readOnly.requiredConfirmations.length, 0);

  const update = analyzeTaskPermissions("Update the README and run tests.");
  assert.equal(update.permissionRisks.find((item) => item.type === "file-write").status, "required");
  assert.equal(update.permissionRisks.find((item) => item.type === "shell").status, "required");
  assert.equal(update.highestRisk, "medium");
  assert.equal(update.requiredConfirmations.length, 0);

  const install = analyzeTaskPermissions("Install Playwright and add browser tests.");
  assert.equal(install.permissionRisks.find((item) => item.type === "package-install").risk, "high");
  assert.ok(install.requiredConfirmations.some((item) => item.permissionType === "package-install"));

  const publish = analyzeTaskPermissions("Commit the changes, push to GitHub, and publish version 0.2.0 to npm.");
  assert.equal(publish.permissionRisks.find((item) => item.type === "git-commit").status, "required");
  assert.ok(publish.requiredConfirmations.some((item) => item.permissionType === "git-push"));
  assert.ok(publish.requiredConfirmations.some((item) => item.permissionType === "package-publish"));

  const deleteOne = analyzeTaskPermissions("Delete the generated cache directory.");
  assert.equal(deleteOne.permissionRisks.find((item) => item.type === "file-delete").risk, "high");
  assert.ok(deleteOne.requiredConfirmations.some((item) => item.permissionType === "file-delete"));
  const deleteMany = analyzeTaskPermissions("Recursively delete all generated directories.");
  assert.equal(deleteMany.permissionRisks.find((item) => item.type === "file-delete").risk, "critical");

  const secret = analyzeTaskPermissions("Read the API key and paste it into a public issue.");
  assert.equal(secret.permissionRisks.find((item) => item.type === "secret-access").risk, "critical");
  assert.ok(secret.warnings.some((item) => item.includes("sensitive credentials")));
});

test("permission analysis respects Chinese and mixed explicit exclusions without noisy vague actions", () => {
  const chinese = analyzeTaskPermissions("只检查登录接口，不要修改文件，也不访问网络。");
  assert.equal(chinese.permissionRisks.find((item) => item.type === "file-read").status, "required");
  assert.equal(chinese.permissionRisks.find((item) => item.type === "file-write").status, "not-required");
  assert.equal(chinese.permissionRisks.find((item) => item.type === "network").status, "not-required");

  const mixed = analyzeTaskPermissions("Update README and run tests, but do not push.");
  assert.equal(mixed.permissionRisks.find((item) => item.type === "file-write").status, "required");
  assert.equal(mixed.permissionRisks.find((item) => item.type === "git-push").status, "not-required");

  const vague = analyzeTaskPermissions("Make project better.");
  assert.deepEqual(vague.permissionRisks, []);
  assert.ok(vague.unknowns.some((item) => item.includes("too vague")));
});

test("plan renders P3 permission sections and keeps confirmation data machine-readable", () => {
  const task = "Install Playwright and add browser tests.";
  const text = run(["plan", task, "--path", "examples/skills"]);
  const json = JSON.parse(run(["plan", task, "--json", "--path", "examples/skills"]));

  assert.match(text, /Expected Actions:/);
  assert.match(text, /Permission Risks:/);
  assert.match(text, /Required Confirmations:/);
  assert.match(text, /Confirm before install or upgrade dependencies/);
  assert.equal(json.summary.highestRisk, "high");
  assert.equal(json.summary.permissionRiskCount, json.data.permissionRisks.length);
  assert.equal(json.summary.confirmationCount, json.data.requiredConfirmations.length);
  assert.ok(json.data.requiredConfirmations.every((item) => item.permissionType && item.risk && item.message && item.reason));
  assert.ok(json.warnings.some((item) => item.includes("No action has been executed")));
});

test("acceptance criteria use stable explicit and derived pre-execution fields", () => {
  const analysis = analyzeTaskPermissions("Optimize the page layout without changing business logic.");
  const result = buildAcceptanceCriteria("Optimize the page layout without changing business logic.", analysis);

  assert.ok(result.acceptanceCriteria.length >= 3);
  assert.ok(result.acceptanceCriteria.length <= 7);
  assert.deepEqual(result.acceptanceCriteria.map((item) => item.id), result.acceptanceCriteria.map((_, index) => `AC-${String(index + 1).padStart(3, "0")}`));
  for (const criterion of result.acceptanceCriteria) {
    assert.ok(["deliverable", "scope", "constraint", "quality", "test", "safety", "documentation", "release"].includes(criterion.category));
    assert.ok(["required", "recommended"].includes(criterion.priority));
    assert.ok(["explicit", "derived"].includes(criterion.source));
    assert.ok(criterion.verificationMethod);
    assert.ok(Array.isArray(criterion.evidence) && criterion.evidence.length > 0);
  }
  assert.ok(result.acceptanceCriteria.some((item) => item.source === "explicit" && item.statement.includes("business logic")));
  assert.ok(result.acceptanceCriteria.some((item) => item.source === "derived" && item.category === "scope"));
  assert.deepEqual(result.acceptanceSummary, {
    generatedFromTaskText: true,
    usesExecutionResults: false,
    verificationPerformed: false,
  });
});

test("acceptance criteria cover actions, constraints, sensitive data, and vague tasks conservatively", () => {
  const install = buildAcceptanceCriteria("Install Playwright and add browser tests.", analyzeTaskPermissions("Install Playwright and add browser tests."));
  assert.ok(install.acceptanceCriteria.some((item) => item.category === "quality" && item.statement.includes("Dependency manifests")));
  assert.ok(install.acceptanceCriteria.some((item) => item.category === "test"));

  const push = buildAcceptanceCriteria("Commit the changes and push them to GitHub.", analyzeTaskPermissions("Commit the changes and push them to GitHub."));
  assert.ok(push.acceptanceCriteria.some((item) => item.statement.includes("Git push occurs only after confirmation")));

  const publish = buildAcceptanceCriteria("Publish version 0.2.0 to npm.", analyzeTaskPermissions("Publish version 0.2.0 to npm."));
  assert.ok(publish.acceptanceCriteria.some((item) => item.statement.includes("Package version")));
  assert.ok(publish.acceptanceCriteria.some((item) => item.statement.includes("package contents are reviewed")));
  assert.ok(publish.acceptanceCriteria.some((item) => item.statement.includes("required human confirmation")));

  const deletion = buildAcceptanceCriteria("Delete the obsolete generated directory.", analyzeTaskPermissions("Delete the obsolete generated directory."));
  assert.ok(deletion.acceptanceCriteria.some((item) => item.statement.includes("explicitly intended files")));

  const secret = buildAcceptanceCriteria("Read the API key and paste it into a public issue.", analyzeTaskPermissions("Read the API key and paste it into a public issue."));
  assert.ok(secret.acceptanceCriteria.some((item) => item.statement.includes("Sensitive values are redacted")));
  assert.doesNotMatch(JSON.stringify(secret), /paste it into a public issue/);

  const chinese = buildAcceptanceCriteria("优化页面布局，但不要修改业务逻辑，也不要安装新依赖。", analyzeTaskPermissions("优化页面布局，但不要修改业务逻辑，也不要安装新依赖。"));
  assert.ok(chinese.acceptanceCriteria.some((item) => item.statement.includes("business logic")));
  assert.ok(chinese.acceptanceCriteria.some((item) => item.statement.includes("No new dependencies")));

  const vague = buildAcceptanceCriteria("Make the project better.", analyzeTaskPermissions("Make the project better."));
  assert.ok(vague.acceptanceCriteria.length <= 3);
  assert.ok(vague.unknowns.some((item) => item.includes("not specific enough")));
});

test("plan exposes acceptance criteria in text and JSON without verification results", () => {
  const task = "Update the page and run tests, but do not push.";
  const text = run(["plan", task, "--path", "examples/skills"]);
  const json = JSON.parse(run(["plan", task, "--json", "--path", "examples/skills"]));

  assert.match(text, /Acceptance Criteria:/);
  assert.match(text, /Verification:/);
  assert.doesNotMatch(text, /Not available until P4/);
  assert.equal(json.data.acceptanceSummary.verificationPerformed, false);
  assert.equal(json.summary.acceptanceCriteriaCount, json.data.acceptanceCriteria.length);
  assert.equal(json.summary.explicitCriteriaCount + json.summary.derivedCriteriaCount, json.summary.acceptanceCriteriaCount);
  assert.ok(json.data.acceptanceCriteria.some((item) => item.statement.includes("No Git push")));
  assert.doesNotMatch(JSON.stringify(json.data.acceptanceCriteria), /\bPASS\b|\bFAIL\b/);
});

test("agent strategy returns stable single, parallel, and sequential recommendations", () => {
  const single = buildAgentStrategy("Fix one typo in README.", { recommendedSkills: [{ name: "docs-authoring" }], expectedActions: [{ type: "file-write", status: "required" }], acceptanceCriteria: [] }).agentStrategy;
  assert.equal(single.mode, "single");
  assert.equal(single.recommendDelegation, false);

  const sequential = buildAgentStrategy("Optimize an existing Next.js page and verify its mobile layout without changing business logic.", { recommendedSkills: [{ name: "frontend-ui" }, { name: "browser-validation" }], expectedActions: [{ type: "file-write", status: "required" }], acceptanceCriteria: [{ category: "constraint", statement: "Existing business logic remains unchanged." }] }).agentStrategy;
  assert.equal(sequential.mode, "sequential");
  assert.ok(sequential.suggestedAgents.some((item) => item.role === "frontend-implementation"));
  assert.ok(sequential.suggestedAgents.some((item) => item.role === "browser-validation"));
  assert.ok(sequential.dependencies.some((item) => item.type === "output"));

  const parallel = buildAgentStrategy("Review frontend accessibility and independently audit the authentication API.", { recommendedSkills: [{ name: "frontend-ui" }, { name: "security-review" }], expectedActions: [{ type: "file-read", status: "required" }], acceptanceCriteria: [] }).agentStrategy;
  assert.equal(parallel.mode, "parallel");
  assert.equal(parallel.costImpact.estimatedTokenImpact, "higher");
  assert.equal(parallel.costImpact.estimatedTimeImpact, "lower");
});

test("agent strategy limits vague delegation, keeps Skills local, and concentrates high risk", () => {
  const vague = buildAgentStrategy("Make the project better.", { recommendedSkills: [], expectedActions: [], acceptanceCriteria: [] }).agentStrategy;
  assert.equal(vague.mode, "single");
  assert.equal(vague.confidence, "low");
  assert.equal(vague.suggestedAgents.length, 1);

  const publish = buildAgentStrategy("Update the package, run tests, create a GitHub Release, and publish to npm.", { recommendedSkills: [{ name: "docs-authoring" }], expectedActions: [{ type: "file-write", status: "required" }, { type: "shell", status: "required" }, { type: "release-create", status: "required" }, { type: "package-publish", status: "required" }], requiredConfirmations: [{ permissionType: "release-create" }], acceptanceCriteria: [] }).agentStrategy;
  assert.equal(publish.mode, "sequential");
  assert.ok(publish.suggestedAgents.some((item) => item.role === "release-review"));
  assert.ok(publish.suggestedAgents.some((item) => item.role === "package-publish"));
  assert.ok(publish.dependencies.every((item) => item.from !== item.dependsOn));
  for (const agent of publish.suggestedAgents) {
    assert.ok(agent.skills.every((skill) => skill === "docs-authoring"));
    assert.ok(["recommended", "optional"].includes(agent.status));
  }
});

test("plan exposes P5 strategy without changing P3 or P4 fields", () => {
  const task = "Optimize an existing Next.js page and verify its mobile layout without changing business logic.";
  const text = run(["plan", task, "--path", "examples/skills"]);
  const json = JSON.parse(run(["plan", task, "--json", "--path", "examples/skills"]));
  assert.match(text, /Agent Strategy:/);
  assert.doesNotMatch(text, /Not available until P5/);
  assert.ok(["single", "parallel", "sequential"].includes(json.data.agentStrategy.mode));
  assert.equal(json.summary.suggestedAgentCount, json.data.agentStrategy.suggestedAgents.length);
  assert.equal(json.data.acceptanceSummary.verificationPerformed, false);
  assert.ok(Array.isArray(json.data.permissionRisks));
  assert.ok(json.data.agentStrategy.warnings.some((item) => item.includes("No agent has been created")));
});

test("plan JSON reports input errors without leaving JSON mode", () => {
  const missingTask = runFailure(["plan", "--json"]);
  const missingPath = runFailure(["plan", "task", "--json", "--path"]);
  const invalidTokens = runFailure(["plan", "task", "--json", "--max-tokens", "0"]);
  const invalidPath = runFailure(["plan", "task", "--json", "--path", "missing-skill-directory"]);

  for (const result of [missingTask, missingPath, invalidTokens, invalidPath]) {
    const parsed = JSON.parse(result.output);
    assert.equal(result.status, 2);
    assert.equal(parsed.command, "plan");
    assert.equal(parsed.success, false);
    assert.ok(parsed.errors.length > 0);
  }
  assert.equal(JSON.parse(missingTask.output).errors[0].code, "MISSING_TASK");
  assert.equal(JSON.parse(invalidPath.output).errors[0].code, "INVALID_SKILL_PATH");
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
