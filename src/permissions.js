const RISK_ORDER = ["low", "medium", "high", "critical"];

const DEFINITIONS = {
  "file-read": { risk: "low", description: "Read or inspect project files." },
  "file-write": { risk: "medium", description: "Modify project files." },
  "file-delete": { risk: "high", description: "Delete project files." },
  shell: { risk: "medium", description: "Run local commands, tests, or services." },
  network: { risk: "high", description: "Access a network service." },
  "package-install": { risk: "high", description: "Install or upgrade dependencies." },
  "git-read": { risk: "low", description: "Inspect local Git state." },
  "git-commit": { risk: "medium", description: "Create a Git commit." },
  "git-push": { risk: "high", description: "Push changes to a remote repository." },
  "release-create": { risk: "high", description: "Create or publish a release." },
  "package-publish": { risk: "high", description: "Publish a package." },
  "secret-access": { risk: "high", description: "Access credentials or other sensitive values." },
  "outside-workspace": { risk: "critical", description: "Access or modify files outside the workspace." },
};

const RULES = [
  ["file-read", /\b(?:review|inspect|analy[sz]e|check|scan|read|look at)\b|检查|审查|查看|阅读|分析/iu],
  ["file-write", /\b(?:update|modify|edit|change|create|add|refactor|implement|write|generate)\b|修改|更新|编辑|创建|新增|重构|实现|编写/iu],
  ["file-delete", /\b(?:delete|remove|clear|clean up|cleanup)\b|删除|移除|清理/iu],
  ["shell", /\b(?:run|test|build|start|command|script)\b|运行|执行|测试|构建|启动|命令/iu],
  ["package-install", /\b(?:install|upgrade)\b.*\b(?:package|dependency|dependencies|playwright)\b|安装依赖|安装包|升级依赖/iu],
  ["git-read", /\b(?:git status|git log|git diff)\b|检查Git|查看Git/iu],
  ["git-commit", /\b(?:git )?commit\b|提交Git|创建提交/iu],
  ["git-push", /\b(?:git )?push\b|推送(?:到)?远程/iu],
  ["release-create", /\b(?:create|publish)\b.*\brelease\b|创建发布版本|发布Release/iu],
  ["package-publish", /\b(?:npm publish|publish\b.*\b(?:npm|package)\b)|发布(?:npm)?包/iu],
  ["network", /\b(?:network|online|download|upload|api|github)\b|网络|联网|下载|上传|接口/iu],
  ["secret-access", /\b(?:api key|secret|token|password|credential|environment variable)\b|密钥|令牌|密码|凭据|环境变量/iu],
  ["outside-workspace", /\b(?:outside (?:the )?workspace|system file|home directory)\b|工作区外|系统文件|用户目录/iu],
];

const EXCLUSIONS = {
  "file-write": [/\b(?:do not|don't|without)\s+(?:modify|modifying|change|changing|edit|editing|write|writing)\b|不要修改文件|不修改文件|只检查|只review/iu],
  "file-delete": [/\b(?:do not|don't)\s+(?:delete|remove)\b|不要删除|不删除/iu],
  network: [/\b(?:no|without|do not|don't)\s+network(?: access)?\b|不访问网络|不要联网/iu],
  "package-install": [/\b(?:without|do not|don't)\s+install(?:ing)?\b|不安装依赖|不要安装依赖/iu],
  "git-push": [/\b(?:do not|don't)\s+push\b|不要推送|不推送/iu],
  "package-publish": [/\b(?:do not|don't)\s+publish\b|不要发布|不发布/iu],
};

function matchedText(pattern, task) {
  const match = task.match(pattern);
  return match ? match[0] : "";
}

function isCritical(type, task) {
  return (type === "file-delete" && /\b(?:recursive|all|entire|bulk)\b|递归|大量|全部/iu.test(task))
    || (type === "git-push" && /\bforce\s+push\b|强制推送|覆盖历史/iu.test(task))
    || (type === "secret-access" && /\b(?:public|paste|post|expose|share)\b|公开|粘贴|发布|泄露/iu.test(task));
}

function needsConfirmation(type, risk, status) {
  return status !== "not-required" && (risk === "critical" || (risk === "high" && status === "required") || [
    "package-install", "git-push", "release-create", "package-publish", "file-delete", "outside-workspace", "secret-access",
  ].includes(type));
}

function analyzeTaskPermissions(task) {
  const found = new Map();
  const add = (type, status, evidence) => {
    if (!found.has(type)) found.set(type, { status, evidence: evidence ? [evidence] : [] });
  };

  for (const [type, pattern] of RULES) {
    const evidence = matchedText(pattern, task);
    if (evidence) add(type, "required", evidence);
  }
  for (const [type, patterns] of Object.entries(EXCLUSIONS)) {
    if (patterns.some((pattern) => pattern.test(task))) found.set(type, { status: "not-required", evidence: ["Explicitly excluded by the task wording."] });
  }

  if (found.has("file-write") && !found.has("file-read")) add("file-read", "possible", "File changes commonly require reading the affected files first.");
  if (found.has("package-install")) {
    add("shell", "possible", "Dependency installation normally uses a local command.");
    add("network", "possible", "Dependency installation may download packages.");
  }
  if (found.has("git-push") || found.has("package-publish") || found.has("release-create")) add("network", "possible", "Remote publishing normally uses a network connection.");

  const expectedActions = [];
  const permissionRisks = [];
  const requiredConfirmations = [];
  for (const [type, item] of found) {
    const baseRisk = DEFINITIONS[type].risk;
    const risk = isCritical(type, task) ? "critical" : baseRisk;
    const requiresConfirmation = needsConfirmation(type, risk, item.status);
    const reason = item.status === "not-required"
      ? "The task explicitly excludes this operation."
      : item.status === "possible"
        ? "This operation may be needed, but the task does not state it as certain."
        : "The task wording explicitly requests this operation.";
    expectedActions.push({ type, status: item.status, description: DEFINITIONS[type].description, evidence: item.evidence });
    permissionRisks.push({ type, status: item.status, risk, reason, requiresConfirmation, evidence: item.evidence });
    if (requiresConfirmation) requiredConfirmations.push({
      permissionType: type,
      risk,
      message: `Confirm before ${DEFINITIONS[type].description.charAt(0).toLowerCase()}${DEFINITIONS[type].description.slice(1)}`,
      reason,
    });
  }

  const relevantRisks = permissionRisks.filter((item) => item.status !== "not-required").map((item) => RISK_ORDER.indexOf(item.risk));
  const highestRisk = relevantRisks.length ? RISK_ORDER[Math.max(...relevantRisks)] : "low";
  const warnings = ["Permission analysis is a local prediction based only on task wording. No action has been executed."];
  if (permissionRisks.some((item) => item.type === "secret-access" && item.risk === "critical")) warnings.push("The task may expose sensitive credentials. Do not disclose secret values.");
  const unknowns = ["Exact commands, files, and network targets are unknown; analysis is limited to the task text."];
  if (found.size === 0) unknowns.push("The task is too vague to predict specific permissions without creating noisy reminders.");

  return { expectedActions, permissionRisks, requiredConfirmations, warnings, unknowns, highestRisk };
}

module.exports = { analyzeTaskPermissions };
