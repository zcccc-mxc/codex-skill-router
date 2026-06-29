function unquote(value) {
  const trimmed = String(value || "").trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseScalar(value) {
  const trimmed = String(value || "").trim();
  if (trimmed === "") return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return inner.split(",").map((item) => unquote(item.trim()));
  }
  if (trimmed.startsWith("[") || trimmed.endsWith("]")) {
    throw new Error(`Invalid inline array: ${trimmed}`);
  }
  return unquote(trimmed);
}

function preprocess(content) {
  const lines = String(content || "").replace(/\r\n/g, "\n").split("\n");
  const output = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const folded = line.match(/^(\s*)([A-Za-z0-9_-]+):\s*(>\-?|\|)\s*$/);
    if (!folded) {
      output.push(line);
      continue;
    }

    const [, indent, key] = folded;
    const childIndent = indent.length + 2;
    const parts = [];
    index += 1;
    while (index < lines.length) {
      const child = lines[index];
      if (child.trim() === "") {
        parts.push("");
        index += 1;
        continue;
      }
      const currentIndent = child.match(/^ */)[0].length;
      if (currentIndent < childIndent) {
        index -= 1;
        break;
      }
      parts.push(child.slice(childIndent));
      index += 1;
    }
    output.push(`${indent}${key}: ${JSON.stringify(parts.join(" ").trim())}`);
  }

  return output;
}

function setValue(parent, key, value) {
  if (Array.isArray(parent)) {
    parent.push(value);
  } else {
    parent[key] = value;
  }
}

function parseSimpleYaml(content) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = preprocess(content);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const rawLine = lines[lineIndex];
    if (!rawLine.trim() || rawLine.trim().startsWith("#")) continue;

    const indent = rawLine.match(/^ */)[0].length;
    const line = rawLine.trim();
    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }
    const parent = stack[stack.length - 1].value;

    if (line.startsWith("- ")) {
      if (!Array.isArray(parent)) {
        throw new Error("Invalid YAML list indentation.");
      }
      const itemText = line.slice(2).trim();
      if (itemText.includes(":")) {
        const [key, ...rest] = itemText.split(":");
        const valueText = rest.join(":").trim();
        const item = {};
        item[key.trim()] = valueText ? parseScalar(valueText) : {};
        parent.push(item);
        if (!valueText) stack.push({ indent, value: item[key.trim()] });
        else stack.push({ indent, value: item });
      } else {
        parent.push(parseScalar(itemText));
      }
      continue;
    }

    const match = line.match(/^([^:]+):(.*)$/);
    if (!match) {
      throw new Error(`Invalid YAML line: ${line}`);
    }

    const key = match[1].trim();
    const valueText = match[2].trim();
    if (valueText) {
      setValue(parent, key, parseScalar(valueText));
      continue;
    }

    const nextLine = lines.slice(lineIndex + 1).find((candidate) => candidate.trim());
    const nextIsArray = nextLine && nextLine.trim().startsWith("- ");
    const child = nextIsArray ? [] : {};
    setValue(parent, key, child);
    stack.push({ indent, value: child });
  }

  return root;
}

function fallbackParseDocument(content) {
  const errors = [];
  let value = null;
  try {
    value = parseSimpleYaml(content);
  } catch (error) {
    errors.push(error);
  }
  return {
    errors,
    toJS() {
      return value;
    },
  };
}

function loadYaml() {
  try {
    return require("yaml");
  } catch (error) {
    return {
      parseDocument: fallbackParseDocument,
    };
  }
}

module.exports = loadYaml();
