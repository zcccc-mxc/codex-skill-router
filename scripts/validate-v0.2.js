const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const yaml = require("../src/yaml");

const root = path.join(__dirname, "..");
const cli = path.join(root, "src", "cli.js");
const reports = path.join(root, "validation", "reports");
const allowedModes = new Set(["single", "parallel", "sequential"]);
const allowedRisks = new Set(["low", "medium", "high", "critical"]);

function loadCases(file, key) {
  const document = yaml.parseDocument(fs.readFileSync(path.join(root, file), "utf8"));
  if (document.errors.length) throw document.errors[0];
  return document.toJS()[key];
}

function plan(task) {
  const output = execFileSync(process.execPath, [cli, "plan", task, "--json", "--path", "examples/skills"], { cwd: root, encoding: "utf8" });
  return { output, value: JSON.parse(output) };
}

function validate(item) {
  const { output, value } = plan(item.task);
  const errors = [];
  const data = value.data || {};
  const summary = value.summary || {};
  const actions = new Map((data.expectedActions || []).map((entry) => [entry.type, entry.status]));
  const confirmationTypes = new Set((data.requiredConfirmations || []).map((entry) => entry.permissionType));
  if (value.schemaVersion !== 1 || value.command !== "plan" || value.success !== true) errors.push("invalid plan envelope");
  for (const field of ["recommendedSkills", "tokenEstimate", "expectedActions", "permissionRisks", "requiredConfirmations", "acceptanceCriteria", "acceptanceSummary", "agentStrategy"]) if (!(field in data)) errors.push(`missing ${field}`);
  if (data.acceptanceSummary?.verificationPerformed !== false) errors.push("verificationPerformed must be false");
  if (!Array.isArray(value.warnings) || !Array.isArray(value.errors)) errors.push("warnings/errors must be arrays");
  if (/[A-Za-z]:\\|\/(?:Users|home)\//.test(output)) errors.push("private path in default JSON");
  if (!allowedModes.has(data.agentStrategy?.mode)) errors.push("invalid agent mode");
  if (!allowedRisks.has(summary.highestRisk)) errors.push("invalid highest risk");
  const agentIds = new Set((data.agentStrategy?.suggestedAgents || []).map((agent) => agent.id));
  for (const agent of data.agentStrategy?.suggestedAgents || []) {
    if (!agent.skills.every((skill) => data.recommendedSkills.some((candidate) => candidate.name === skill))) errors.push("agent has unrecommended Skill");
    if (!["recommended", "optional"].includes(agent.status)) errors.push("runtime agent status");
  }
  for (const dependency of data.agentStrategy?.dependencies || []) if (!agentIds.has(dependency.from) || !agentIds.has(dependency.dependsOn) || dependency.from === dependency.dependsOn) errors.push("invalid agent dependency");
  for (const type of item.requiredActions || []) if (actions.get(type) !== "required") errors.push(`missing required action ${type}`);
  for (const type of item.notRequiredActions || []) if (actions.get(type) !== "not-required") errors.push(`missing not-required action ${type}`);
  for (const type of item.confirmations || []) if (!confirmationTypes.has(type)) errors.push(`missing confirmation ${type}`);
  if (item.mode && data.agentStrategy?.mode !== item.mode) errors.push(`expected mode ${item.mode}`);
  if (data.acceptanceCriteria?.some((criterion) => /\b(?:passed|failed|completed)\b/iu.test(criterion.statement))) errors.push("false execution claim in acceptance criterion");
  return { id: item.id, category: item.category || "reserved", status: errors.length ? "failed" : "complete", errors };
}

function report(items, kind) {
  const summary = { total: items.length, complete: items.filter((item) => item.status === "complete").length, partial: 0, failed: items.filter((item) => item.status === "failed").length };
  return { schemaVersion: 1, kind, generatedAt: new Date().toISOString(), summary, cases: items };
}

function main() {
  const primary = loadCases("validation/v0.2-plan.eval.yml", "primary").map(validate);
  const reserved = loadCases("validation/v0.2-plan-reserved.eval.yml", "reserved").map(validate);
  const result = { primary: report(primary, "primary"), reserved: report(reserved, "reserved") };
  fs.mkdirSync(reports, { recursive: true });
  fs.writeFileSync(path.join(reports, "v0.2-plan-report.json"), `${JSON.stringify(result, null, 2)}\n`);
  fs.writeFileSync(path.join(reports, "v0.2-plan-report.md"), `# v0.2 Plan Validation Report\n\n- Primary: ${result.primary.summary.complete}/${result.primary.summary.total} complete\n- Reserved: ${result.reserved.summary.complete}/${result.reserved.summary.total} complete\n- No task was executed; all results are local plan analysis.\n`);
  console.log(JSON.stringify({ primary: result.primary.summary, reserved: result.reserved.summary }));
  return result.primary.summary.failed || result.reserved.summary.failed ? 3 : 0;
}

process.exitCode = main();
