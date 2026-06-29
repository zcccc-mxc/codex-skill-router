# Codex Skill Router

[English README](README.md)

Codex Skill Router 是一个本地优先的命令行工具，用来检查、审计、预测、测试和解释 Codex Skill 的路由质量。

Codex 本身已经会选择 Skill。这个项目不替代 Codex，也不控制 Codex 内部决策。它解决的是另一个问题：

> 我的本地 Skills 是否能被发现？描述是否清楚？路由结果是否符合预期？

## 当前状态

版本：`0.1.0-rc.1`

已实现命令：

- `csr scan`
- `csr audit`
- `csr route`
- `csr eval`
- `csr budget`

工具默认本地运行、只读，不调用外部 AI，不需要 API Key。

## 安装和试用

```bash
npm install
npm test
```

本地模拟安装 `csr` 命令：

```bash
npm link
csr --help
```

不用时可以移除：

```bash
npm unlink -g codex-skill-router
```

## 五分钟快速开始

```bash
node src/cli.js scan --path ./examples/skills
node src/cli.js audit --path ./examples/skills
node src/cli.js route "优化现有页面并检查移动端显示" --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --path ./examples/skills
node src/cli.js budget --path ./examples/skills
```

示例 Eval 当前包含 50 条任务，期望看到：

```text
Total cases: 50
complete: 50
failed: 0
```

## scan

扫描本地 `SKILL.md`：

```bash
csr scan
csr scan --path ./examples/skills
csr scan --json --path ./examples/skills
csr scan --brief --path ./examples/skills
```

默认扫描规则：

- 从当前目录开始向上查找 `.agents/skills`；
- 到 Git 仓库根目录停止；
- 扫描 `$HOME/.agents/skills`；
- Linux/macOS 如果存在 `/etc/codex/skills`，也会扫描；
- 兼容 `.codex/skills` 和 `skills`，但标记为 `legacy`；
- 保留 `--path` 自定义路径。

默认隐藏本地路径，只有使用 `--show-paths` 才显示。

## audit

检查 Skill 描述质量：

```bash
csr audit --path ./examples/skills
csr audit --severity warning --path ./examples/skills
```

它会检查缺少名称、缺少描述、描述过短、缺少使用条件、缺少排除条件、名称重复和可能重叠等问题。

## route

根据任务描述预测适合的 Skill：

```bash
csr route "检查登录接口是否存在权限绕过" --path ./examples/skills
csr route "只修改 README 中的安装说明" --path ./examples/skills
```

它会解释推荐原因和未推荐原因。注意：这是本地预测，不代表 Codex 内部一定会实际调用这些 Skills。

## eval

用测试集检查路由效果：

```bash
csr eval ./examples/eval.yml --path ./examples/skills
csr eval ./examples/eval.yml --json --path ./examples/skills
csr eval ./examples/eval.yml --output ./tmp-eval-report.md --path ./examples/skills
```

支持 `.yml`、`.yaml`、`.json`。YAML 使用标准 `yaml` 依赖解析。

Eval 支持：

- strict / permissive；
- include / optional / exclude；
- no-match；
- Required Recall；
- Exclusion Accuracy；
- Exact Set Match；
- Unexpected Recommendation Rate；
- No-Match Accuracy；
- Markdown 报告；
- 质量门槛。

## budget

估算本地 Skill 元数据大小：

```bash
csr budget --path ./examples/skills
csr budget --json --path ./examples/skills
csr budget --max-tokens 12000 --path ./examples/skills
```

它只是估算，不是 Codex 内部 token 计费，也不会调用模型。

## 本地上下文

`route` 可以读取可选上下文：

- `agents/openai.yaml`
- `.agents/openai.yaml`
- `package.json`

示例：

```yaml
routing:
  - skill: docs-authoring
    when:
      - manual pages
      - usage guide
```

这些只是本地提示，不会修改 Skill，也不会替代 Skill 的 `description`。

## JSON 输出

支持 `--json` 的命令会输出可解析 JSON，并包含：

```json
{
  "schemaVersion": 1,
  "command": "scan",
  "success": true,
  "summary": {},
  "data": {},
  "warnings": [],
  "errors": []
}
```

## 退出码

```text
0 = 正常完成
1 = 运行时错误
2 = 用户输入或配置错误
3 = Eval 质量门槛未通过
```

## 隐私

默认不会上传 Skill、路径、任务、Eval 数据或项目代码。默认输出也会隐藏本地路径。

## 当前限制

- 本地预测不等于 Codex 实际调用；
- Router 是规则式的，语义能力有限；
- 依赖声明不等于依赖可用；
- budget 只是估算；
- 不自动修改用户 Skill；
- 不连接外部 AI。

## 开发命令

```bash
npm ci
npm test
node src/cli.js --help
node src/cli.js scan --help
node src/cli.js audit --help
node src/cli.js route --help
node src/cli.js eval --help
node src/cli.js budget --help
npm pack --dry-run
```
