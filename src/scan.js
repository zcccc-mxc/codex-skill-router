const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const YAML = require("yaml");

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage"]);

function findGitRoot(cwd = process.cwd()) {
  let currentPath = path.resolve(cwd);

  while (true) {
    if (fs.existsSync(path.join(currentPath, ".git"))) {
      return currentPath;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      return path.resolve(cwd);
    }

    currentPath = parentPath;
  }
}

function uniqueRoots(roots) {
  const seen = new Set();
  const result = [];

  for (const item of roots) {
    const key = path.resolve(item.root).toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function projectAgentSkillRoots(cwd, gitRoot) {
  const roots = [];
  let currentPath = path.resolve(cwd);
  const stopPath = path.resolve(gitRoot);

  while (true) {
    roots.push({
      root: path.join(currentPath, ".agents", "skills"),
      source: "project",
      rootType: "standard",
    });

    if (currentPath === stopPath) {
      break;
    }

    const parentPath = path.dirname(currentPath);
    if (parentPath === currentPath) {
      break;
    }

    currentPath = parentPath;
  }

  return roots;
}

function defaultScanRoots(cwd = process.cwd(), home = os.homedir()) {
  const gitRoot = findGitRoot(cwd);
  const roots = [
    ...projectAgentSkillRoots(cwd, gitRoot),
    { root: path.join(home, ".agents", "skills"), source: "user", rootType: "standard" },
  ];

  const adminRoot = path.join(path.sep, "etc", "codex", "skills");
  if (process.platform !== "win32" && fs.existsSync(adminRoot)) {
    roots.push({ root: adminRoot, source: "admin", rootType: "standard" });
  }

  roots.push(
    { root: path.join(cwd, ".codex", "skills"), source: "legacy", rootType: "legacy" },
    { root: path.join(cwd, "skills"), source: "legacy", rootType: "legacy" },
    { root: path.join(home, ".codex", "skills"), source: "legacy", rootType: "legacy" },
  );

  return uniqueRoots(roots);
}

function customScanRoots(paths, cwd = process.cwd()) {
  return uniqueRoots(
    paths.map((inputPath) => ({
      root: path.resolve(cwd, inputPath),
      source: "custom",
      rootType: "custom",
    })),
  );
}

function findSkillFiles(root) {
  const skillFiles = [];

  function walk(currentPath) {
    let entries;

    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (error) {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          walk(entryPath);
        }
        continue;
      }

      if (entry.isFile() && entry.name === "SKILL.md") {
        skillFiles.push(entryPath);
      }
    }
  }

  walk(root);
  return skillFiles;
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");

  if (!normalized.startsWith("---\n")) {
    return {
      name: "",
      description: "",
      status: "format-error",
      errorType: "missing-frontmatter-start",
      message: "SKILL.md 缺少 YAML frontmatter。",
    };
  }

  const endIndex = normalized.indexOf("\n---", 4);

  if (endIndex === -1) {
    return {
      name: "",
      description: "",
      status: "format-error",
      errorType: "missing-frontmatter-end",
      message: "SKILL.md 的 YAML frontmatter 没有正确结束。",
    };
  }

  let values;
  try {
    const document = YAML.parseDocument(normalized.slice(4, endIndex), { prettyErrors: false });
    if (document.errors.length > 0) {
      throw document.errors[0];
    }

    values = document.toJS() || {};
  } catch (error) {
    return {
      name: "",
      description: "",
      status: "format-error",
      errorType: "yaml-syntax",
      message: `YAML 语法错误：${error.message}`,
    };
  }

  const name = values.name || "";
  const description = values.description || "";

  if (values.name === undefined || values.name === null) {
    return {
      name: "",
      description,
      status: "format-error",
      errorType: "missing-name",
      message: "缺少 name。",
    };
  }

  if (typeof values.name !== "string") {
    return {
      name: "",
      description,
      status: "format-error",
      errorType: "invalid-name-type",
      message: "name 必须是字符串。",
    };
  }

  if (values.description === undefined || values.description === null) {
    return {
      name,
      description: "",
      status: "format-error",
      errorType: "missing-description",
      message: "缺少 description。",
    };
  }

  if (typeof values.description !== "string") {
    return {
      name,
      description: "",
      status: "format-error",
      errorType: "invalid-description-type",
      message: "description 必须是字符串。",
    };
  }

  return {
    name: name.trim(),
    description: description.trim(),
    status: "ok",
    errorType: "",
    message: "",
  };
}

function readSkillFile(filePath, source, rootType) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = parseFrontmatter(content);

    return {
      name: parsed.name,
      description: parsed.description,
      path: filePath,
      source,
      rootType,
      status: parsed.status,
      errorType: parsed.errorType,
      message: parsed.message,
    };
  } catch (error) {
    return {
      name: "",
      description: "",
      path: filePath,
      source,
      rootType,
      status: "read-error",
      errorType: "read-error",
      message: "文件无法读取。",
    };
  }
}

function sourceCounts(skills) {
  return {
    project: skills.filter((skill) => skill.source === "project").length,
    user: skills.filter((skill) => skill.source === "user").length,
    admin: skills.filter((skill) => skill.source === "admin").length,
    legacy: skills.filter((skill) => skill.source === "legacy").length,
    custom: skills.filter((skill) => skill.source === "custom").length,
  };
}

function scanSkills(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = options.home || os.homedir();
  const roots = options.paths?.length > 0 ? customScanRoots(options.paths, cwd) : defaultScanRoots(cwd, home);
  const seen = new Set();
  const skills = [];
  const missingRoots = [];

  roots.forEach(({ root, source, rootType }, rootIndex) => {
    if (!fs.existsSync(root)) {
      missingRoots.push(root);
      return;
    }

    const skillFiles = findSkillFiles(root);

    for (const filePath of skillFiles) {
      const resolvedPath = path.resolve(filePath);
      if (seen.has(resolvedPath)) {
        continue;
      }

      seen.add(resolvedPath);
      skills.push({ ...readSkillFile(resolvedPath, source, rootType), rootIndex });
    }
  });

  skills.sort((left, right) => {
    if (left.rootIndex !== right.rootIndex) {
      return left.rootIndex - right.rootIndex;
    }

    return left.path.localeCompare(right.path);
  });

  const publicSkills = skills.map(({ rootIndex, ...skill }) => skill);

  const summary = {
    roots: roots.length,
    missingRoots: missingRoots.length,
    total: publicSkills.length,
    ok: publicSkills.filter((skill) => skill.status === "ok").length,
    formatErrors: publicSkills.filter((skill) => skill.status === "format-error").length,
    readErrors: publicSkills.filter((skill) => skill.status === "read-error").length,
    sources: sourceCounts(publicSkills),
  };

  return {
    summary,
    roots: roots.map((item) => item.root),
    missingRoots,
    skills: publicSkills,
  };
}

module.exports = {
  customScanRoots,
  defaultScanRoots,
  findGitRoot,
  parseFrontmatter,
  scanSkills,
  sourceCounts,
};
