const MAX_CRITERIA = 10;
const VAGUE_TASK = /^(?:make|improve|fix|handle)\s+(?:the\s+)?(?:project|app|it|this)\s+(?:better|good|work)?\.?$|^(?:改进|优化|处理)(?:项目|应用|这个)?\s*(?:一下|更好)?。?$/iu;

function contains(task, pattern) {
  return pattern.test(task);
}

function taskEvidence(task, fallback) {
  if (/\b(?:api key|secret|token|password|credential)\b|密钥|令牌|密码|凭据/iu.test(task)) {
    return fallback || "Task text contains a sensitive-data reference.";
  }
  return task.length > 160 ? `${task.slice(0, 157)}...` : task;
}

function buildAcceptanceCriteria(task, analysis = {}) {
  const criteria = [];
  const expectedActions = analysis.expectedActions || [];
  const permissionRisks = analysis.permissionRisks || [];
  const actionByType = new Map(expectedActions.map((item) => [item.type, item]));
  const riskByType = new Map(permissionRisks.map((item) => [item.type, item]));
  const vague = VAGUE_TASK.test(task.trim());

  function add(category, statement, priority, source, verificationMethod, evidence) {
    if (criteria.some((item) => item.statement === statement) || criteria.length >= MAX_CRITERIA) return;
    criteria.push({
      id: `AC-${String(criteria.length + 1).padStart(3, "0")}`,
      category,
      statement,
      priority,
      source,
      verificationMethod,
      evidence: [evidence],
    });
  }

  function actionStatus(type) {
    return actionByType.get(type)?.status;
  }

  if (vague) {
    add("scope", "The task scope and expected deliverable are clarified before changes begin.", "required", "explicit", "Confirm the intended outcome and affected area with the task owner.", "Task text is too broad to name a deliverable.");
    add("safety", "No high-risk operation is performed before its purpose and scope are confirmed.", "required", "derived", "Review the final plan for high-risk actions and required confirmations.", "Vague task safety rule.");
    add("scope", "Any changes remain limited to the confirmed task scope.", "recommended", "derived", "Review the changed-file list against the confirmed scope.", "Vague task scope rule.");
    return {
      acceptanceCriteria: criteria,
      acceptanceSummary: {
        generatedFromTaskText: true,
        usesExecutionResults: false,
        verificationPerformed: false,
      },
      unknowns: ["The requested deliverable is not specific enough to define detailed acceptance criteria."],
    };
  }

  add("deliverable", "The requested task outcome is delivered as described.", "required", "explicit", "Review the completed work against the task description.", taskEvidence(task, "Task explicitly requests a deliverable."));

  const constraints = [
    [/\b(?:without changing|do not change|don't change)\s+(?:the\s+)?business logic\b|不要修改业务逻辑|不修改业务逻辑/iu, "Existing business logic remains unchanged.", "Review the diff for business-logic changes and run relevant existing tests.", "Business-logic constraint in the task."],
    [/\b(?:do not|don't|without)\s+(?:modify|change|edit|write)(?:ing)?\s+files?\b|不要修改文件|不修改文件/iu, "No project files are modified.", "Review the changed-file list and diff for file changes.", "No-file-change constraint in the task."],
    [/\b(?:do not|don't|without)\s+install(?:ing)?\s+(?:new\s+)?dependencies\b|不安装(?:新)?依赖|不要安装(?:新)?依赖/iu, "No new dependencies are installed.", "Review dependency manifests and lockfiles for added dependencies.", "No-install constraint in the task."],
    [/\b(?:do not|don't)\s+push\b|不要推送|不推送/iu, "No Git push is performed.", "Review Git remote activity or confirm that no push command was run.", "No-push constraint in the task."],
    [/\bkeep\s+(?:the\s+)?public api unchanged\b|保持接口不变|保持公共接口不变/iu, "The public API remains unchanged.", "Review public API definitions and compatibility-sensitive changes.", "Public-API constraint in the task."],
    [/\bonly\s+(?:update|change)\s+documentation\b|只更新文档/iu, "Only documentation files are changed.", "Review the changed-file list for non-documentation changes.", "Documentation-only constraint in the task."],
    [/\b(?:do not|don't)\s+expose\s+secrets?\b|不要泄露密钥|不泄露密钥/iu, "Sensitive values are not exposed in outputs or shared locations.", "Review outputs and changed content for unredacted sensitive values.", "Secret-protection constraint in the task."],
    [/\bpreserve\s+backward compatibility\b|保持向后兼容/iu, "Backward compatibility is preserved.", "Review compatibility-sensitive changes and run relevant existing tests.", "Compatibility constraint in the task."],
  ];
  for (const [pattern, statement, verificationMethod, evidence] of constraints) {
    if (contains(task, pattern)) add("constraint", statement, "required", "explicit", verificationMethod, evidence);
  }

  if (contains(task, /\b(?:update|modify|edit|change|create|add|refactor|implement|optimi[sz]e)\b|更新|修改|编辑|创建|新增|重构|实现|优化/iu)) {
    add("scope", "Changes remain limited to what is needed for the stated task outcome.", "required", "derived", "Review the changed-file list and diff for unrelated changes.", "General task-change rule.");
  }

  if (actionStatus("file-read") === "required" && !actionByType.has("file-write")) {
    add("quality", "The review or analysis conclusion is supported by relevant project content.", "required", "derived", "Check that important conclusions cite the relevant files, locations, or observed evidence.", "Required file-read action.");
  }
  if (["required", "possible"].includes(actionStatus("file-write"))) {
    add("scope", "Only files required for the stated task are modified.", "required", "derived", "Review the changed-file list and diff for unrelated changes.", "File-write action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("shell"))) {
    add("test", "Requested commands or tests complete successfully, or failures and skipped checks are clearly reported.", "required", "derived", "Run the relevant existing command and record any failure or skipped check.", "Shell action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("package-install"))) {
    add("quality", "Dependency manifests and lockfiles remain consistent with the requested dependency change.", "required", "derived", "Review dependency manifests and lockfiles after the proposed installation.", "Package-install action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("git-commit"))) {
    add("scope", "Any Git commit contains only task-related changes and uses an accurate message.", "recommended", "derived", "Review the commit diff and message before creating it.", "Git-commit action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("git-push"))) {
    add("release", "A Git push occurs only after confirmation and to the intended remote and branch.", "required", "derived", "Confirm the remote and branch, then obtain the required human confirmation.", "Git-push action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("release-create"))) {
    add("release", "Release version, tag, changelog, and release notes are consistent before release creation.", "required", "derived", "Review release metadata and obtain the required human confirmation.", "Release-create action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("package-publish"))) {
    add("release", "Package version and changelog are consistent before publishing.", "required", "derived", "Review package metadata and changelog before publishing.", "Package-publish action prediction.");
    add("quality", "The package contents are reviewed before publishing.", "required", "derived", "Run the package-content dry run and review the included files.", "Package-publish action prediction.");
    add("release", "Package publishing occurs only after the required human confirmation.", "required", "derived", "Confirm the target registry and obtain the required human confirmation.", "Package-publish action prediction.");
    add("release", "The published version can be checked at the intended registry after publishing.", "recommended", "derived", "Check the intended registry for the planned version after publishing.", "Package-publish action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("file-delete"))) {
    add("safety", "Only the explicitly intended files or directories are deleted, with no unrelated references left behind.", "required", "derived", "Review deletion targets and related references before deletion, then obtain confirmation.", "File-delete action prediction.");
  }
  if (["required", "possible"].includes(actionStatus("secret-access")) || riskByType.get("secret-access")?.risk === "critical") {
    add("safety", "Sensitive values are redacted and are not sent to public or unintended locations.", "required", "derived", "Review planned outputs and destinations for sensitive-data exposure before proceeding.", "Sensitive-data risk prediction.");
  }
  if (["required", "possible"].includes(actionStatus("outside-workspace"))) {
    add("safety", "Any outside-workspace action has a specific target and explicit human confirmation.", "required", "derived", "Confirm the target is necessary and obtain the required human confirmation.", "Outside-workspace action prediction.");
  }

  return {
    acceptanceCriteria: criteria,
    acceptanceSummary: {
      generatedFromTaskText: true,
      usesExecutionResults: false,
      verificationPerformed: false,
    },
    unknowns: [],
  };
}

module.exports = { buildAcceptanceCriteria };
