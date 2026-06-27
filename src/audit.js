const BROAD_PHRASES = [
  "anything",
  "any task",
  "all tasks",
  "general purpose",
  "use when needed",
  "通用",
  "任何任务",
  "所有任务",
  "需要时使用",
];

const { normalizeText, tokenize } = require("./text");

const EXCLUSION_MARKERS = [
  "do not use",
  "not use",
  "avoid",
  "not for",
  "涓嶈",
  "涓嶉€傜敤",
  "閬垮厤",
  "涓嶈鐢ㄤ簬",
];

function extractApplicabilityText(description) {
  const normalized = description.toLowerCase();
  const markerIndexes = EXCLUSION_MARKERS.map((marker) => normalized.indexOf(marker)).filter((index) => index >= 0);

  if (markerIndexes.length === 0) {
    return description;
  }

  return description.slice(0, Math.min(...markerIndexes));
}

function similarity(left, right) {
  const leftTokens = new Set(tokenize(extractApplicabilityText(left)));
  const rightTokens = new Set(tokenize(extractApplicabilityText(right)));

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let shared = 0;
  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      shared += 1;
    }
  }

  return shared / Math.min(leftTokens.size, rightTokens.size);
}

function issue(skill, type, severity, message, suggestion) {
  return {
    skill: skill.name || "(未命名 Skill)",
    path: skill.path,
    type,
    severity,
    message,
    suggestion,
  };
}

function auditSkillShape(skill) {
  const issues = [];
  const description = skill.description.trim();

  if (skill.status !== "ok") {
    issues.push(issue(skill, "format", "error", skill.message || "SKILL.md 格式存在问题。", "先修复 SKILL.md 的基础格式。"));
  }

  if (!skill.name) {
    issues.push(issue(skill, "missing-name", "error", "缺少 name，工具无法稳定识别这个 Skill。", "在 frontmatter 中补充清晰、唯一的 name。"));
  }

  if (!description) {
    issues.push(
      issue(skill, "missing-description", "error", "缺少 description，工具无法判断它适合什么任务。", "补充一句说明：什么时候应该使用这个 Skill。"),
    );
    return issues;
  }

  if (description.length < 30) {
    issues.push(
      issue(skill, "short-description", "warning", "description 太短，可能不足以判断适用场景。", "补充具体任务类型、触发条件和不适用场景。"),
    );
  }

  if (description.length > 500) {
    issues.push(
      issue(skill, "long-description", "warning", "description 很长，可能让路由判断抓不住重点。", "保留最关键的触发条件，把细节放到正文说明。"),
    );
  }

  const lowerDescription = description.toLowerCase();
  if (BROAD_PHRASES.some((phrase) => lowerDescription.includes(phrase))) {
    issues.push(
      issue(skill, "broad-description", "warning", "description 可能过于宽泛，容易和其他 Skill 抢任务。", "写清楚具体适用任务，并说明哪些任务不应该使用。"),
    );
  }

  if (!/use when|when|适用|使用|触发|用于/.test(lowerDescription)) {
    issues.push(
      issue(skill, "missing-use-condition", "info", "description 没有明显说明什么时候使用。", "建议加入“Use when...”或中文等价说明。"),
    );
  }

  if (!/do not use|not use|不要|不适用|避免/.test(lowerDescription)) {
    issues.push(
      issue(skill, "missing-exclusion", "info", "description 没有说明什么时候不使用。", "建议补充不适用场景，减少误触发。"),
    );
  }

  return issues;
}

function findDuplicateNameIssues(skills) {
  const byName = new Map();
  const issues = [];

  for (const skill of skills) {
    if (!skill.name) {
      continue;
    }

    const key = skill.name.toLowerCase();
    const group = byName.get(key) || [];
    group.push(skill);
    byName.set(key, group);
  }

  for (const group of byName.values()) {
    if (group.length <= 1) {
      continue;
    }

    for (const skill of group) {
      issues.push(issue(skill, "duplicate-name", "error", `Skill 名称重复：${skill.name}。`, "保持 Skill name 唯一，避免扫描和路由结果混淆。"));
    }
  }

  return issues;
}

function findOverlapIssues(skills) {
  const issues = [];

  for (let leftIndex = 0; leftIndex < skills.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < skills.length; rightIndex += 1) {
      const left = skills[leftIndex];
      const right = skills[rightIndex];

      if (!left.description || !right.description) {
        continue;
      }

      const score = similarity(left.description, right.description);
      if (score < 0.45) {
        continue;
      }

      issues.push({
        skill: `${left.name || "(未命名 Skill)"} / ${right.name || "(未命名 Skill)"}`,
        path: `${left.path}\n${right.path}`,
        type: "possible-overlap",
        severity: "info",
        message: `这两个 Skill 的 description 可能重叠，相似度约 ${Math.round(score * 100)}%。`,
        suggestion: "检查它们是否面向同一类任务；如果是，请写清楚边界和优先使用条件。",
      });
    }
  }

  return issues;
}

function auditSkills(scanResult) {
  const skills = scanResult.skills || [];
  const issues = [
    ...skills.flatMap(auditSkillShape),
    ...findDuplicateNameIssues(skills),
    ...findOverlapIssues(skills),
  ];

  return {
    skillCount: skills.length,
    issueCount: issues.length,
    errorCount: issues.filter((item) => item.severity === "error").length,
    warningCount: issues.filter((item) => item.severity === "warning").length,
    infoCount: issues.filter((item) => item.severity === "info").length,
    issues,
  };
}

module.exports = {
  auditSkills,
  similarity,
};
