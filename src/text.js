const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "when",
  "use",
  "user",
  "task",
  "this",
  "that",
  "from",
  "into",
  "using",
  "skill",
  "skills",
  "should",
  "codex",
  "一个",
  "这个",
  "那个",
  "进行",
  "使用",
]);

const CJK_KEYWORDS = [
  "页面",
  "移动端",
  "前端",
  "浏览器",
  "截图",
  "测试",
  "部署",
  "发布",
  "文档",
  "图片",
  "生成",
  "插件",
  "技能",
  "仓库",
  "评论",
  "检查",
  "优化",
];

const CJK_SYNONYMS = {
  页面: ["page", "ui", "frontend", "browser"],
  移动端: ["mobile", "responsive", "browser"],
  前端: ["frontend", "ui"],
  浏览器: ["browser", "playwright"],
  截图: ["screenshot", "browser"],
  测试: ["test", "testing", "eval"],
  检查: ["check", "validation", "test"],
  部署: ["deploy", "deployment"],
  发布: ["deploy", "release"],
  文档: ["docs", "documentation"],
  图片: ["image", "photo"],
  生成: ["generate", "create"],
  插件: ["plugin"],
  技能: ["skill"],
  仓库: ["repository", "github"],
  评论: ["comment", "review"],
  优化: ["optimize", "improve"],
};

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);
  const asciiTokens = normalized.match(/[a-z0-9]{3,}/g) || [];
  const cjkTokens = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const cjkKeywordTokens = CJK_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  const synonymTokens = cjkKeywordTokens.flatMap((keyword) => CJK_SYNONYMS[keyword] || []);
  const tokens = [...asciiTokens, ...cjkTokens, ...cjkKeywordTokens, ...synonymTokens];

  return [...new Set(tokens.filter((token) => !STOP_WORDS.has(token)))];
}

module.exports = {
  normalizeText,
  tokenize,
};
