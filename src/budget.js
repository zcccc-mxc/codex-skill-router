const { tokenize } = require("./text");

function estimateTextTokens(text) {
  return Math.ceil(String(text || "").length / 4);
}

function estimateSkillBudget(skill) {
  const nameTokens = estimateTextTokens(skill.name);
  const descriptionTokens = estimateTextTokens(skill.description);
  const totalTokens = nameTokens + descriptionTokens;

  return {
    name: skill.name || "(unnamed Skill)",
    source: skill.source,
    status: skill.status,
    estimatedTokens: totalTokens,
    descriptionTokens,
    termCount: tokenize(`${skill.name || ""} ${skill.description || ""}`).length,
    included: skill.status === "ok",
    reason: skill.status === "ok" ? "Included in local budget estimate." : "Excluded because the Skill is not readable or valid.",
    path: skill.path,
  };
}

function budgetSkills(scanResult, options = {}) {
  const maxRecommendedTokens = options.maxRecommendedTokens || 8000;
  const skills = (scanResult.skills || []).map(estimateSkillBudget);
  const includedSkills = skills.filter((skill) => skill.included);
  const estimatedTokens = includedSkills.reduce((sum, skill) => sum + skill.estimatedTokens, 0);
  const utilization = maxRecommendedTokens === 0 ? 0 : estimatedTokens / maxRecommendedTokens;
  const risk =
    utilization >= 1 ? "high" :
      utilization >= 0.7 ? "medium" :
        "low";

  return {
    summary: {
      totalSkills: skills.length,
      includedSkills: includedSkills.length,
      skippedSkills: skills.length - includedSkills.length,
      estimatedTokens,
      maxRecommendedTokens,
      utilization,
      risk,
    },
    skills,
    note: "This is a local rough estimate based on Skill metadata length. It is not Codex internal token accounting.",
  };
}

module.exports = {
  budgetSkills,
  estimateTextTokens,
};
