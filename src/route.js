const { normalizeText, tokenize } = require("./text");

const BROAD_TERMS = [
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

const EXCLUSION_MARKERS = [
  "do not use",
  "not use",
  "avoid",
  "not for",
  "不要",
  "不适用",
  "避免",
  "不要用于",
];

const DESCRIPTION_CONCEPTS = [
  {
    label: "文档写作",
    terms: ["docs", "document", "documentation"],
  },
  {
    label: "浏览器验证",
    terms: ["browser", "playwright", "rendering", "screenshot"],
  },
  {
    label: "移动端界面",
    terms: ["frontend", "layout", "mobile", "page", "phone", "responsive", "ui"],
  },
  {
    label: "部署发布",
    terms: ["deploy", "deployment", "publish", "release"],
  },
  {
    label: "图片生成",
    terms: ["generate", "image", "photo", "picture"],
  },
  {
    label: "质量检查",
    terms: ["audit", "check", "review", "test", "validate", "validation", "verify"],
  },
];

const GENERIC_ROUTE_TERMS = new Set([
  "audit",
  "check",
  "data",
  "review",
  "test",
  "testing",
  "validate",
  "validation",
  "verify",
]);

const GENERIC_SEMANTIC_LABELS = new Set([DESCRIPTION_CONCEPTS[5].label]);

const PHRASE_CONCEPTS = [
  {
    label: "移动端布局",
    phrases: ["mobile layout", "mobile display", "responsive layout", "responsive ui"],
  },
  {
    label: "浏览器渲染验证",
    phrases: ["browser rendering", "page rendering", "playwright checks", "browser validation"],
  },
  {
    label: "文档编辑",
    phrases: ["documentation pages", "editing guides", "docs clearer", "write docs"],
  },
  {
    label: "部署链接",
    phrases: ["deployment link", "deploy app", "release app", "publish app"],
  },
  {
    label: "数据库结构变更",
    phrases: ["database schema", "schema migration", "database migration"],
  },
];

function countMatches(taskTerms, skillTerms) {
  const matchedTerms = [];

  for (const term of taskTerms) {
    if (skillTerms.has(term)) {
      matchedTerms.push(term);
    }
  }

  return matchedTerms;
}

function matchDescriptionConcepts(taskTerms, descriptionTerms) {
  return DESCRIPTION_CONCEPTS.filter((concept) => {
    const taskMatched = concept.terms.some((term) => taskTerms.has(term));
    const descriptionMatched = concept.terms.some((term) => descriptionTerms.has(term));

    return taskMatched && descriptionMatched;
  }).map((concept) => concept.label);
}

function matchPhraseConcepts(task, description) {
  const normalizedTask = normalizeText(task);
  const normalizedDescription = normalizeText(description);

  return PHRASE_CONCEPTS.filter((concept) => {
    const taskMatched = concept.phrases.some((phrase) => normalizedTask.includes(phrase));
    const descriptionMatched = concept.phrases.some((phrase) => normalizedDescription.includes(phrase));

    return taskMatched && descriptionMatched;
  }).map((concept) => concept.label);
}

function extractExclusionText(description) {
  const normalized = description.toLowerCase();
  const parts = [];

  for (const marker of EXCLUSION_MARKERS) {
    const index = normalized.indexOf(marker);
    if (index >= 0) {
      parts.push(description.slice(index));
    }
  }

  return parts.join(" ");
}

function hasBroadDescription(description) {
  const normalized = description.toLowerCase();
  return BROAD_TERMS.some((term) => normalized.includes(term));
}

function scoreSkill(task, skill) {
  if (skill.status !== "ok" || !skill.description) {
    return {
      skill,
      score: 0,
      matchedTerms: [],
      scoreDetails: {
        nameMatches: [],
        descriptionMatches: [],
        semanticMatches: [],
        phraseMatches: [],
        exclusionMatches: [],
        broadPenalty: 0,
      },
      reasons: ["Skill 格式不完整，暂不推荐。"],
    };
  }

  const taskTerms = new Set(tokenize(task));
  const nameTerms = new Set(tokenize(skill.name || ""));
  const descriptionTerms = new Set(tokenize(skill.description || ""));
  const exclusionTerms = new Set(tokenize(extractExclusionText(skill.description || "")));
  const nameMatches = countMatches(taskTerms, nameTerms);
  const descriptionMatches = countMatches(taskTerms, descriptionTerms);
  const semanticMatches = matchDescriptionConcepts(taskTerms, descriptionTerms);
  const phraseMatches = matchPhraseConcepts(task, skill.description || "");
  const exclusionMatches = countMatches(taskTerms, exclusionTerms);
  const matchedTerms = [...new Set([...nameMatches, ...descriptionMatches])];
  const concreteNameMatches = nameMatches.filter((term) => !GENERIC_ROUTE_TERMS.has(term));
  const concreteMatches = matchedTerms.filter((term) => !GENERIC_ROUTE_TERMS.has(term));
  const concreteSemanticMatches = semanticMatches.filter((label) => !GENERIC_SEMANTIC_LABELS.has(label));
  const broadPenalty = hasBroadDescription(skill.description) ? 1 : 0;

  const rawScore =
    nameMatches.length * 3 +
    descriptionMatches.length +
    semanticMatches.length * 2 +
    phraseMatches.length * 3 -
    exclusionMatches.length * 4 -
    broadPenalty;
  const hasReliableEvidence =
    concreteMatches.length > 0 ||
    concreteNameMatches.length > 0 ||
    concreteSemanticMatches.length > 0 ||
    phraseMatches.length > 0;
  const score = hasReliableEvidence ? Math.max(0, rawScore) : 0;
  const reasons = [];

  if (nameMatches.length > 0) {
    reasons.push(`Skill 名称命中：${nameMatches.join(", ")}。`);
  }

  if (descriptionMatches.length > 0) {
    reasons.push(`description 命中：${descriptionMatches.join(", ")}。`);
  }

  if (semanticMatches.length > 0) {
    reasons.push(`语义理解：${semanticMatches.join(", ")}。`);
  }

  if (phraseMatches.length > 0) {
    reasons.push(`短语理解：${phraseMatches.join(", ")}。`);
  }

  if (exclusionMatches.length > 0) {
    reasons.push(`命中不适用条件：${exclusionMatches.join(", ")}，因此降低推荐分。`);
  }

  if (broadPenalty > 0) {
    reasons.push("description 可能过于宽泛，降低推荐分。");
  }

  if (reasons.length === 0) {
    reasons.push("没有找到明显匹配的关键词。");
  }

  return {
    skill,
    score,
    matchedTerms,
    scoreDetails: {
      nameMatches,
      descriptionMatches,
      semanticMatches,
      phraseMatches,
      exclusionMatches,
      broadPenalty,
    },
    reasons,
  };
}

function routeTask(task, scanResult, options = {}) {
  const limit = options.limit || 3;
  const scored = (scanResult.skills || [])
    .map((skill) => scoreSkill(task, skill))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.skill.path.localeCompare(right.skill.path);
    });

  const recommended = scored.filter((item) => item.score > 0).slice(0, limit);
  const notRecommended = scored.filter((item) => item.score === 0).slice(0, limit);

  return {
    task,
    skillCount: scanResult.skills?.length || 0,
    recommended,
    notRecommended,
    note: "这是本地路由预测，不代表 Codex 实际内部一定会调用这些 Skills。",
  };
}

module.exports = {
  routeTask,
  scoreSkill,
};
