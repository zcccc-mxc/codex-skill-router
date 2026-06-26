const { tokenize } = require("./text");

function scoreSkill(task, skill) {
  if (skill.status !== "ok" || !skill.description) {
    return {
      skill,
      score: 0,
      matchedTerms: [],
      reasons: ["Skill 格式不完整，暂不推荐。"],
    };
  }

  const taskTerms = new Set(tokenize(task));
  const skillTerms = new Set(tokenize(`${skill.name} ${skill.description}`));
  const matchedTerms = [];

  for (const term of taskTerms) {
    if (skillTerms.has(term)) {
      matchedTerms.push(term);
    }
  }

  const nameBoost = [...taskTerms].some((term) => skill.name.toLowerCase().includes(term)) ? 2 : 0;
  const score = matchedTerms.length + nameBoost;
  const reasons = [];

  if (matchedTerms.length > 0) {
    reasons.push(`匹配到关键词：${matchedTerms.join(", ")}。`);
  }

  if (nameBoost > 0) {
    reasons.push("任务描述和 Skill 名称有直接关联。");
  }

  if (reasons.length === 0) {
    reasons.push("没有找到明显匹配的关键词。");
  }

  return {
    skill,
    score,
    matchedTerms,
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
