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

const ASCII_SYNONYMS = {
  app: ["application"],
  application: ["app"],
  audit: ["check", "review", "validate", "validation"],
  browser: ["playwright", "rendering", "page"],
  build: ["create", "generate", "make"],
  check: ["audit", "test", "validate", "validation", "verify"],
  create: ["build", "generate", "make"],
  deploy: ["deployment", "publish", "release"],
  deployment: ["deploy", "publish", "release"],
  docs: ["documentation", "document"],
  document: ["docs", "documentation"],
  documentation: ["docs", "document"],
  frontend: ["ui", "page", "layout"],
  generate: ["build", "create", "make"],
  image: ["photo", "picture"],
  improve: ["optimize", "refine"],
  layout: ["frontend", "page", "ui"],
  mobile: ["phone", "phones", "responsive"],
  optimize: ["improve", "refine"],
  page: ["browser", "frontend", "layout", "ui"],
  phone: ["mobile", "responsive"],
  phones: ["mobile", "responsive"],
  photo: ["image", "picture"],
  picture: ["image", "photo"],
  playwright: ["browser", "rendering"],
  publish: ["deploy", "deployment", "release"],
  refine: ["improve", "optimize"],
  release: ["deploy", "deployment", "publish"],
  rendering: ["browser", "playwright"],
  responsive: ["mobile", "phone", "phones"],
  review: ["audit", "check"],
  test: ["check", "validate", "validation", "verify"],
  ui: ["frontend", "layout", "page"],
  validate: ["check", "test", "validation", "verify"],
  validation: ["check", "test", "validate", "verify"],
  verify: ["check", "test", "validate", "validation"],
};

function normalizeText(text) {
  return text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ").trim();
}

function stemAsciiToken(token) {
  if (token.length > 6 && token.endsWith("ing")) {
    return token.slice(0, -3);
  }

  if (token.length > 5 && token.endsWith("ied")) {
    return `${token.slice(0, -3)}y`;
  }

  if (token.length > 5 && token.endsWith("ed")) {
    return token.slice(0, -2);
  }

  if (token.length > 5 && token.endsWith("es")) {
    return token.slice(0, -2);
  }

  if (token.length > 4 && token.endsWith("s")) {
    return token.slice(0, -1);
  }

  return token;
}

function expandAsciiToken(token) {
  const stemmed = stemAsciiToken(token);
  const values = [token, stemmed, ...(ASCII_SYNONYMS[token] || []), ...(ASCII_SYNONYMS[stemmed] || [])];

  return [...new Set(values)];
}

function tokenize(text) {
  const normalized = normalizeText(text);
  const asciiTokens = normalized.match(/[a-z0-9]{3,}/g) || [];
  const cjkTokens = normalized.match(/[\u4e00-\u9fa5]{2,}/g) || [];
  const cjkKeywordTokens = CJK_KEYWORDS.filter((keyword) => normalized.includes(keyword));
  const synonymTokens = cjkKeywordTokens.flatMap((keyword) => CJK_SYNONYMS[keyword] || []);
  const asciiExpandedTokens = asciiTokens.flatMap(expandAsciiToken);
  const tokens = [...asciiExpandedTokens, ...cjkTokens, ...cjkKeywordTokens, ...synonymTokens];

  return [...new Set(tokens.filter((token) => !STOP_WORDS.has(token)))];
}

module.exports = {
  normalizeText,
  stemAsciiToken,
  tokenize,
};
