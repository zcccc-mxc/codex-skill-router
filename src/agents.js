const HIGH_RISK_TYPES = new Set(["package-install", "git-push", "release-create", "package-publish", "file-delete", "secret-access", "outside-workspace"]);
const VAGUE_TASK = /^(?:make|improve|fix|handle)\s+(?:the\s+)?(?:project|app|it|this)\s+(?:better|good|work)?\.?$|^(?:改进|优化|处理)(?:项目|应用|这个)?\s*(?:一下|更好)?。?$/iu;

function buildAgentStrategy(task, planContext = {}) {
  const skills = (planContext.recommendedSkills || []).map((item) => item.name).filter(Boolean);
  const actions = (planContext.expectedActions || []).filter((item) => item.status !== "not-required").map((item) => item.type);
  const confirmations = planContext.requiredConfirmations || [];
  const criteria = planContext.acceptanceCriteria || [];
  const vague = VAGUE_TASK.test(task.trim());
  const has = (name) => skills.includes(name);
  const hasAction = (type) => actions.includes(type);
  const highRisk = actions.filter((type) => HIGH_RISK_TYPES.has(type));
  const agents = [];
  const dependencies = [];
  const conflictRisks = [];
  const warnings = ["This is a recommendation only. No agent has been created or invoked.", "No worktree or branch has been created."];
  const unknowns = ["Exact file ownership and actual agent availability are unknown from the task text."];

  function add(role, objective, agentSkills, expectedActions, order, options = {}) {
    const id = `agent-${agents.length + 1}`;
    const guidance = criteria.filter((item) => item.category === "constraint" || item.category === "safety").map((item) => item.statement);
    agents.push({ id, role, objective, skills: agentSkills, status: options.optional ? "optional" : "recommended", executionOrder: order, canRunInParallel: Boolean(options.parallel), dependsOn: options.dependsOn || [], expectedActions, deliverables: options.deliverables || [objective], scopeGuidance: guidance, isolationRecommended: Boolean(options.isolation), confidence: options.confidence || "medium" });
    return id;
  }

  if (vague) {
    add("task-clarification", "Clarify the intended deliverable and scope before delegation.", [], [], 1, { confidence: "low", deliverables: ["Clarified task scope"] });
    return strategy("single", false, "low", ["The task is too vague to split reliably."], agents, dependencies, conflictRisks, "similar", "unknown", warnings, [...unknowns, "The requested deliverable is not specific enough for reliable delegation."]);
  }

  const independentReadOnly = /\b(?:independently|separately)\b|独立(?:地)?/iu.test(task) && !hasAction("file-write") && !highRisk.length;
  if (independentReadOnly && skills.length >= 2) {
    skills.slice(0, 2).forEach((skill, index) => add(skill === "security-review" ? "security-review" : `${skill}-review`, `Review the task area associated with ${skill}.`, [skill], actions.filter((type) => type === "file-read"), index + 1, { parallel: true, confidence: "high", deliverables: [`Review findings for ${skill}`] }));
    conflictRisks.push({ level: "none", reason: "The suggested workstreams are explicitly independent and read-only.", mitigation: "Keep findings separate and combine them after both reviews." });
    return strategy("parallel", true, "high", ["The task explicitly describes independent read-only workstreams."], agents, dependencies, conflictRisks, "higher", "lower", warnings, unknowns);
  }

  let implementationId = "";
  if (has("frontend-ui") && (hasAction("file-write") || /\b(?:page|layout|ui|mobile)\b|页面|布局|移动端/iu.test(task))) {
    implementationId = add("frontend-implementation", "Implement the requested page or layout changes.", ["frontend-ui"], actions.filter((type) => ["file-read", "file-write"].includes(type)), 1, { deliverables: ["Updated page implementation"] });
  } else if (hasAction("file-write") || hasAction("git-commit")) {
    implementationId = add("implementation", "Complete the requested project changes.", skills.slice(0, 1), actions.filter((type) => ["file-read", "file-write", "git-commit"].includes(type)), 1);
  }

  if (has("browser-validation") && (implementationId || /\b(?:verify|browser|mobile|render)\b|验证|浏览器|移动端|显示/iu.test(task))) {
    const id = add("browser-validation", "Verify the requested browser or mobile rendering.", ["browser-validation"], ["shell"], agents.length + 1, { dependsOn: implementationId ? [implementationId] : [], deliverables: ["Browser validation findings"] });
    if (implementationId) dependencies.push({ from: id, dependsOn: implementationId, type: "output", reason: "Browser validation requires the updated page." });
  } else if (hasAction("shell") && implementationId) {
    const id = add("test-validation", "Run the requested existing tests and report failures or skipped checks.", [], ["shell"], agents.length + 1, { dependsOn: [implementationId], deliverables: ["Test results or reported limitations"] });
    dependencies.push({ from: id, dependsOn: implementationId, type: "output", reason: "Validation depends on the implementation result." });
  }

  if (has("security-review") && (implementationId || /\b(?:security|auth|authorization)\b|安全|权限|认证/iu.test(task))) {
    const id = add("security-review", "Review security-sensitive changes or requested authentication behavior.", ["security-review"], ["file-read"], agents.length + 1, { dependsOn: implementationId ? [implementationId] : [], deliverables: ["Security review findings"] });
    if (implementationId) dependencies.push({ from: id, dependsOn: implementationId, type: "output", reason: "Security review should inspect the completed implementation." });
  }

  if (highRisk.length) {
    const addHighRiskRole = (role, actionTypes) => {
      const priorId = agents.length ? agents[agents.length - 1].id : "";
      const id = add(role, "Handle the proposed high-risk action only after required review and confirmation.", [], actionTypes, agents.length + 1, { dependsOn: priorId ? [priorId] : [], deliverables: ["Confirmed high-risk action plan"], confidence: "medium" });
      if (priorId) {
        dependencies.push({ from: id, dependsOn: priorId, type: "output", reason: "High-risk work follows the preceding review or validation." });
        if (confirmations.length) dependencies.push({ from: id, dependsOn: priorId, type: "approval", reason: "Human confirmation is required before the high-risk action." });
      }
    };
    if (highRisk.includes("release-create")) addHighRiskRole("release-review", ["release-create"]);
    if (highRisk.includes("package-publish")) addHighRiskRole("package-publish", ["package-publish"]);
    const remainingHighRisk = highRisk.filter((type) => type !== "release-create" && type !== "package-publish");
    if (remainingHighRisk.length) addHighRiskRole(remainingHighRisk.includes("git-push") ? "git-push" : "high-risk-review", remainingHighRisk);
  }

  if (!agents.length) add(skills[0] ? `${skills[0]}-task` : "task-review", "Handle the single requested task scope.", skills.slice(0, 1), actions, 1, { confidence: "low" });
  const mode = agents.length === 1 ? "single" : "sequential";
  if (agents.filter((agent) => agent.expectedActions.includes("file-write")).length > 1) conflictRisks.push({ level: "likely", reason: "Multiple suggested agents may modify the same task area.", mitigation: "Use sequential work or assign non-overlapping file scopes." });
  else if (agents.some((agent) => agent.expectedActions.includes("file-write"))) conflictRisks.push({ level: "possible", reason: "Exact file ownership is unknown for the suggested implementation work.", mitigation: "Assign file scope before any parallel work." });
  else conflictRisks.push({ level: "none", reason: "Suggested roles are read-only or have no predicted file modification.", mitigation: "Keep task constraints shared across the review." });
  const confidence = highRisk.length ? "medium" : agents.length > 1 ? "medium" : "low";
  const reasons = mode === "single" ? ["The task has one main workstream or splitting would add overhead."] : ["Implementation, validation, or high-risk work has an output dependency."];
  return strategy(mode, agents.length > 1, confidence, reasons, agents, dependencies, conflictRisks, mode === "single" ? "similar" : "higher", mode === "single" ? "similar" : "higher", warnings, unknowns);
}

function strategy(mode, recommendDelegation, confidence, reasons, suggestedAgents, dependencies, conflictRisks, estimatedTokenImpact, estimatedTimeImpact, warnings, unknowns) {
  return { agentStrategy: { mode, recommendDelegation, confidence, reasoningSummary: reasons.join(" "), reasons, suggestedAgents, dependencies, conflictRisks, costImpact: { estimatedTokenImpact, estimatedTimeImpact, confidence: "low", reason: "This is a local estimate; multiple agents may duplicate project context." }, warnings, unknowns } };
}

module.exports = { buildAgentStrategy };
