const fs = require("node:fs");
const path = require("node:path");
const YAML = require("yaml");
const { findGitRoot } = require("./scan");
const { tokenize } = require("./text");

const CONTEXT_FILES = [
  path.join("agents", "openai.yaml"),
  path.join(".agents", "openai.yaml"),
];

function safeReadJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return null;
  }
}

function safeReadYaml(filePath) {
  try {
    const document = YAML.parseDocument(fs.readFileSync(filePath, "utf8"), { prettyErrors: false });
    if (document.errors.length > 0) {
      return null;
    }

    return document.toJS();
  } catch (error) {
    return null;
  }
}

function stringValues(value) {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(stringValues);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(stringValues);
  }

  return [];
}

function normalizeSkillHint(item, skillNames) {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    return [];
  }

  const hints = [];
  const explicitSkill = typeof item.skill === "string" ? item.skill : typeof item.name === "string" ? item.name : "";
  const skill = skillNames.find((name) => name === explicitSkill);

  if (skill) {
    const values = [
      ...stringValues(item.when),
      ...stringValues(item.terms),
      ...stringValues(item.triggers),
      ...stringValues(item.description),
      ...stringValues(item.prompt),
    ];
    hints.push({
      skill,
      terms: tokenize(values.join(" ")),
    });
  }

  for (const [key, value] of Object.entries(item)) {
    if (skillNames.includes(key)) {
      hints.push({
        skill: key,
        terms: tokenize(stringValues(value).join(" ")),
      });
      continue;
    }

    if (value && typeof value === "object") {
      hints.push(...extractSkillHints(value, skillNames));
    }
  }

  return hints;
}

function extractSkillHints(value, skillNames) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => extractSkillHints(item, skillNames));
  }

  return normalizeSkillHint(value, skillNames);
}

function loadPackageTerms(cwd) {
  const gitRoot = findGitRoot(cwd);
  const packageJson = safeReadJson(path.join(gitRoot, "package.json"));
  if (!packageJson) {
    return [];
  }

  const dependencyNames = [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ];
  const scriptText = Object.values(packageJson.scripts || {}).join(" ");

  return tokenize([...dependencyNames, scriptText].join(" "));
}

function loadRouteContext(options = {}) {
  const cwd = options.cwd || process.cwd();
  const skills = options.skills || [];
  const skillNames = skills.map((skill) => skill.name).filter(Boolean);
  const gitRoot = findGitRoot(cwd);
  const contextFiles = CONTEXT_FILES.map((fileName) => path.join(gitRoot, fileName)).filter((filePath) => fs.existsSync(filePath));
  const yamlContexts = contextFiles.map(safeReadYaml).filter(Boolean);
  const skillHints = yamlContexts.flatMap((item) => extractSkillHints(item, skillNames));

  return {
    gitRoot,
    contextFiles,
    packageTerms: loadPackageTerms(cwd),
    skillHints,
  };
}

module.exports = {
  extractSkillHints,
  loadRouteContext,
};
