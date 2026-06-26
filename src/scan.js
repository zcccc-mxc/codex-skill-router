const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const IGNORED_DIRS = new Set([".git", "node_modules", "dist", "build", "coverage"]);

function defaultScanRoots(cwd = process.cwd(), home = os.homedir()) {
  return [
    { root: path.join(cwd, ".codex", "skills"), source: "project" },
    { root: path.join(cwd, "skills"), source: "project" },
    { root: path.join(home, ".codex", "skills"), source: "user" },
  ];
}

function customScanRoots(paths, cwd = process.cwd()) {
  return paths.map((inputPath) => ({
    root: path.resolve(cwd, inputPath),
    source: "custom",
  }));
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
  if (!content.startsWith("---\n") && !content.startsWith("---\r\n")) {
    return {
      name: "",
      description: "",
      status: "format-error",
      message: "SKILL.md 缺少 YAML frontmatter。",
    };
  }

  const normalized = content.replace(/\r\n/g, "\n");
  const endIndex = normalized.indexOf("\n---", 4);

  if (endIndex === -1) {
    return {
      name: "",
      description: "",
      status: "format-error",
      message: "SKILL.md 的 YAML frontmatter 没有正确结束。",
    };
  }

  const metadata = normalized.slice(4, endIndex).split("\n");
  const values = {};

  for (let index = 0; index < metadata.length; index += 1) {
    const line = metadata[index];
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const key = match[1];
    const rawValue = match[2].trim();

    if (rawValue === ">-" || rawValue === ">" || rawValue === "|" || rawValue === "|-") {
      const blockLines = [];

      while (index + 1 < metadata.length && /^\s+/.test(metadata[index + 1])) {
        index += 1;
        blockLines.push(metadata[index].trim());
      }

      values[key] = blockLines.join(rawValue.startsWith("|") ? "\n" : " ").trim();
      continue;
    }

    values[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  const name = values.name || "";
  const description = values.description || "";

  if (!name || !description) {
    return {
      name,
      description,
      status: "format-error",
      message: !name ? "缺少 name。" : "缺少 description。",
    };
  }

  return {
    name,
    description,
    status: "ok",
    message: "",
  };
}

function readSkillFile(filePath, source) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = parseFrontmatter(content);

    return {
      name: parsed.name,
      description: parsed.description,
      path: filePath,
      source,
      status: parsed.status,
      message: parsed.message,
    };
  } catch (error) {
    return {
      name: "",
      description: "",
      path: filePath,
      source,
      status: "read-error",
      message: "文件无法读取。",
    };
  }
}

function scanSkills(options = {}) {
  const cwd = options.cwd || process.cwd();
  const home = options.home || os.homedir();
  const roots = options.paths?.length > 0 ? customScanRoots(options.paths, cwd) : defaultScanRoots(cwd, home);
  const seen = new Set();
  const skills = [];
  const missingRoots = [];

  for (const { root, source } of roots) {
    if (!fs.existsSync(root)) {
      missingRoots.push(root);
      continue;
    }

    const skillFiles = findSkillFiles(root);

    for (const filePath of skillFiles) {
      const resolvedPath = path.resolve(filePath);
      if (seen.has(resolvedPath)) {
        continue;
      }

      seen.add(resolvedPath);
      skills.push(readSkillFile(resolvedPath, source));
    }
  }

  skills.sort((left, right) => left.path.localeCompare(right.path));

  return {
    roots: roots.map((item) => item.root),
    missingRoots,
    skills,
  };
}

module.exports = {
  parseFrontmatter,
  scanSkills,
};
