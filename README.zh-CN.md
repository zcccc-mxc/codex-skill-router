# Codex Skill Router

[English README](README.md)

> 在本地扫描、审计、路由和测试 Codex Skills，不需要 API Key，也不会上传 Skill 内容。

Codex Skill Router 是一个本地优先的命令行工具，用来检查 Codex Skill 是否能被发现、描述是否清楚、路由结果是否符合预期。

它适合维护多个 Codex Skills 的用户，用来做：

```text
扫描本地 Skills
审计 Skill 元数据
预测任务应该使用哪些 Skills
用 Eval 测试路由质量
估算本地 Skill 元数据预算
```

Codex 本身已经有自己的 Skill 选择机制。本项目不替代 Codex，也不控制 Codex 内部决策。它提供的是本地、可解释的 Skill 质量检查。

## 30 秒试用

```bash
npm install -g codex-skill-router
csr scan
csr audit
csr route "检查登录接口是否存在权限绕过"
csr route "检查登录接口是否存在权限绕过" --json
csr plan "优化现有页面并检查移动端布局"
```

`csr scan` 用来查看本地 Skills，`csr audit` 用来发现元数据问题，`csr route` 用来给出可解释的本地路由预测。默认不会显示本地路径。

## 当前状态

当前候选版本：`0.2.0-rc.1`

稳定版本：`0.1.0`

已发布：

- npm：[`codex-skill-router@0.1.0`](https://www.npmjs.com/package/codex-skill-router)
- GitHub Release：[`v0.1.0`](https://github.com/zcccc-mxc/codex-skill-router/releases/tag/v0.1.0)

已实现命令：

- `csr scan`
- `csr audit`
- `csr route`
- `csr eval`
- `csr budget`
- `csr plan`

默认本地优先：

- 不需要 API Key；
- 不调用外部 AI；
- 不需要云数据库；
- 不上传 Skill；
- 不修改用户 Skill 文件。

## 安装

安装已发布的 npm 包：

```bash
npm install -g codex-skill-router
csr --help
```

如需测试 v0.2 候选版，同时保持稳定版 `latest` 安装不变：

```bash
npm install -g codex-skill-router@next
# 或者
npm install -g codex-skill-router@0.2.0-rc.1
```

当前本地开发安装：

```bash
git clone https://github.com/zcccc-mxc/codex-skill-router.git
cd codex-skill-router
npm install
npm link
csr --help
```

不用时可以移除本地链接：

```bash
npm unlink -g codex-skill-router
```

## 60 秒试用

使用仓库自带的示例 Skills：

```bash
csr scan --path ./examples/skills
csr route "检查浏览器渲染和移动端视口显示" --path ./examples/skills
csr eval ./examples/eval.yml --path ./examples/skills
```

预期大致会看到：

```text
Found 10 Skills
Recommended: frontend-ui, browser-validation
Eval: 50 complete, 0 failed
```

如果还没有链接 `csr`，可以使用本地 Node 入口：

```bash
node src/cli.js scan --path ./examples/skills
node src/cli.js route "检查浏览器渲染和移动端视口显示" --path ./examples/skills
node src/cli.js eval ./examples/eval.yml --path ./examples/skills
```

## 适合谁

如果你遇到这些问题，可以使用 Codex Skill Router：

- 自己写或维护 Codex Skills；
- 安装了多个 Skills，不确定哪些能被扫描到；
- 想检查 Skill description 是否清楚；
- 修改 Skill 前后想测试路由结果有没有变差；
- 想用公开安全的方式记录 Skill 路由质量。

## 命令

### `csr scan`

扫描本地 `SKILL.md` 文件并读取 YAML frontmatter。

```bash
csr scan
csr scan --path ./examples/skills
csr scan --json --path ./examples/skills
csr scan --brief --path ./examples/skills
csr scan --show-paths --path ./examples/skills
```

默认扫描规则：

- 从当前工作目录开始，向上查找 `.agents/skills`；
- 到当前 Git 仓库根目录停止；
- 扫描 `$HOME/.agents/skills`；
- Linux/macOS 如果存在 `/etc/codex/skills`，也会检查；
- 兼容旧目录 `.codex/skills` 和 `skills`，但标记为 `legacy`；
- 保留 `--path` 自定义路径。

默认隐藏本地路径。只有本地调试需要时才使用 `--show-paths`。

### `csr audit`

检查 Skill 元数据质量。

```bash
csr audit --path ./examples/skills
csr audit --severity warning --path ./examples/skills
```

可以发现缺少 name、缺少 description、描述过弱、缺少使用场景、缺少排除条件、名称重复和可能重叠等问题。

### `csr route`

根据任务描述预测可能适合的 Skills，并解释原因。

```bash
csr route "检查登录接口是否存在权限绕过" --path ./examples/skills
csr route "只修改 README 中的安装说明" --path ./examples/skills
csr route "检查登录接口是否存在权限绕过" --json --path ./examples/skills
```

注意：这是本地预测，不代表 Codex 内部一定会实际调用这些 Skills。

`--json` 会输出一个可供本地程序读取的 JSON 对象。默认仍隐藏路径；没有匹配到 Skill 也属于成功结果。该输出只是本地路由预测，不是 Codex 实际调用记录。

### `csr eval`

运行路由测试集。

```bash
csr eval ./examples/eval.yml --path ./examples/skills
csr eval ./examples/eval.yml --json --path ./examples/skills
csr eval ./examples/eval.yml --output ./tmp-eval-report.md --path ./examples/skills
```

Eval 支持：

- `.yml`、`.yaml`、`.json`；
- `strict` 和 `permissive`；
- `include`、`optional`、`exclude`；
- no-match 案例；
- Required Recall；
- Exclusion Accuracy；
- Exact Set Match；
- Unexpected Recommendation Rate；
- No-Match Accuracy；
- Markdown 报告；
- 质量门槛。

### `csr budget`

估算本地 Skill 元数据大小。它只是估算，不是 Codex 内部真实 Token 计量。

```bash
csr budget --path ./examples/skills
csr budget --json --path ./examples/skills
csr budget --max-tokens 12000 --path ./examples/skills
```

### `csr plan`

在开始工作前，组合本地路由预测与本地 Skill 元数据的粗略 Token 估算。

```bash
csr plan "optimize an existing page and verify mobile layout"
csr plan "optimize an existing page and verify mobile layout" --json
csr plan "检查登录接口是否存在权限绕过" --path ./examples/skills
```

`csr plan` 会输出路由结果、元数据估算、预测操作、权限提醒、验收标准和 Agent Strategy 建议。策略只建议单智能体、并行或顺序角色；不会创建智能体、worktree、分支或执行任务。并行可能缩短耗时，但也可能增加 Token 和文件冲突风险。

v0.2 候选版包括计划、权限分析、验收标准和 Agent Strategy；它不会执行用户任务。

## 隐私

本工具默认不会上传：

- Skill 内容；
- 本地路径；
- 任务描述；
- Eval 数据；
- 项目代码。

默认输出会隐藏本地路径。只有你明确需要本地调试时才使用 `--show-paths`。

## RC1 验证结果

`v0.1.0-rc.1` 已完成 RC 验证，并用于稳定版 `v0.1.0` 发布判断：

```text
真实任务：30
完全正确：28
失败：2
必须使用的 Skill 命中率：100.0%
无需 Skill 判断正确率：100.0%
不应推荐 Skill 排除正确率：91.7%
```

已知 P2 问题：

```text
docs-authoring 在少量网页和移动端任务中可能被额外推荐。
正确的主要 Skill 仍然会被选中。
不阻塞 v0.1.0。
```

相关文档：

- [RC1 验证日志](docs/RC1_VALIDATION_LOG.md)
- [RC1 问题分级](docs/RC1_ISSUE_TRIAGE.md)
- [稳定版发布清单](docs/STABLE_RELEASE_CHECKLIST.md)

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

当前项目是 JavaScript 项目，没有构建步骤，也没有 TypeScript 类型检查。

## 当前限制

- 本地预测不等于 Codex 实际内部调用。
- Router 是规则式的，语义理解能力有限。
- 依赖声明不等于依赖真实可用。
- `budget` 只是粗略估算，不是真实 Token 计量。
- 工具不会修改用户 Skills。
- 工具不会连接外部 AI 服务。

## 路线图

见 [docs/ROADMAP.md](docs/ROADMAP.md)。
