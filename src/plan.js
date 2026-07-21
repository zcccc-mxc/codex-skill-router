const { budgetSkills } = require("./budget");
const { buildAcceptanceCriteria } = require("./acceptance");
const { buildAgentStrategy } = require("./agents");
const { analyzeTaskPermissions } = require("./permissions");
const { routeTask, serializeRouteResult } = require("./route");

const UNKNOWN_MESSAGES = [
  "Actual Codex Skill invocation is unknown.",
  "Actual runtime Token usage is unknown.",
];

function buildTaskPlan(task, scanResult, options = {}) {
  const maxTokens = options.maxTokens || 8000;
  const context = options.context || {};
  const routeResult = routeTask(task, scanResult, { context });
  const routeData = serializeRouteResult(routeResult).data;
  const allBudget = budgetSkills(scanResult, { maxRecommendedTokens: maxTokens });
  const recommendedBudget = budgetSkills({
    skills: routeResult.recommended.map((item) => item.skill),
  }, { maxRecommendedTokens: maxTokens });
  const overBudget = allBudget.summary.estimatedTokens > maxTokens;
  const warnings = [
    "Token values are rough local metadata estimates, not actual Codex Token usage.",
  ];
  const permissionAnalysis = analyzeTaskPermissions(task);
  const acceptanceAnalysis = buildAcceptanceCriteria(task, permissionAnalysis, options);
  const agentAnalysis = buildAgentStrategy(task, { ...permissionAnalysis, recommendedSkills: routeData.recommendedSkills, acceptanceCriteria: acceptanceAnalysis.acceptanceCriteria, tokenEstimate: { allSkills: allBudget.summary, recommendedSkills: recommendedBudget.summary } }, options);

  if (overBudget) {
    warnings.push(`All available Skill metadata exceeds the threshold of ${maxTokens} estimated tokens.`);
  }

  if (scanResult.summary.formatErrors > 0 || scanResult.summary.readErrors > 0) {
    warnings.push("Some Skill files could not be fully read or parsed and were excluded from the metadata estimate.");
  }

  return {
    summary: {
      skillCount: routeResult.skillCount,
      recommendedCount: routeResult.recommended.length,
      noMatch: routeResult.recommended.length === 0,
      smallTaskSuppressed: routeResult.suppressSmallTask,
      allSkillsEstimatedTokens: allBudget.summary.estimatedTokens,
      recommendedSkillsEstimatedTokens: recommendedBudget.summary.estimatedTokens,
      maxTokens,
      overBudget,
      permissionRiskCount: permissionAnalysis.permissionRisks.length,
      confirmationCount: permissionAnalysis.requiredConfirmations.length,
      highestRisk: permissionAnalysis.highestRisk,
      acceptanceCriteriaCount: acceptanceAnalysis.acceptanceCriteria.length,
      explicitCriteriaCount: acceptanceAnalysis.acceptanceCriteria.filter((item) => item.source === "explicit").length,
      derivedCriteriaCount: acceptanceAnalysis.acceptanceCriteria.filter((item) => item.source === "derived").length,
      agentMode: agentAnalysis.agentStrategy.mode,
      delegationRecommended: agentAnalysis.agentStrategy.recommendDelegation,
      suggestedAgentCount: agentAnalysis.agentStrategy.suggestedAgents.length,
      agentStrategyConfidence: agentAnalysis.agentStrategy.confidence,
    },
    data: {
      task,
      recommendedSkills: routeData.recommendedSkills,
      notRecommendedSkills: routeData.notRecommendedSkills,
      tokenEstimate: {
        method: "rough-local-estimate",
        allSkills: {
          estimatedTokens: allBudget.summary.estimatedTokens,
          threshold: maxTokens,
          overBudget,
        },
        recommendedSkills: {
          estimatedTokens: recommendedBudget.summary.estimatedTokens,
        },
        actualCodexUsageKnown: false,
      },
      contextSummary: routeData.contextSummary,
      expectedActions: permissionAnalysis.expectedActions,
      permissionRisks: permissionAnalysis.permissionRisks,
      requiredConfirmations: permissionAnalysis.requiredConfirmations,
      acceptanceCriteria: acceptanceAnalysis.acceptanceCriteria,
      acceptanceSummary: acceptanceAnalysis.acceptanceSummary,
      agentStrategy: agentAnalysis.agentStrategy,
      unknowns: [...permissionAnalysis.unknowns, ...acceptanceAnalysis.unknowns, ...UNKNOWN_MESSAGES],
    },
    warnings: [...warnings, ...permissionAnalysis.warnings],
  };
}

module.exports = {
  buildTaskPlan,
};
