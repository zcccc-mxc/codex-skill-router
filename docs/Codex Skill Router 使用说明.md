# Codex Skill Router 使用说明

适用版本：`0.1.0`

## 一句话理解

Codex Skill Router 不控制 Codex 内部一定调用哪个 Skill。

它的作用是：

- 扫描本地有哪些 Skill；
- 检查 Skill 描述是否清楚；
- 根据任务描述预测可能适合的 Skill；
- 用 Eval 测试路由结果是否稳定；
- 粗略估算 Skill 元数据预算。

## 快速试用

如果已经从 npm 全局安装：

```powershell
csr scan --path .\examples\skills
csr audit --path .\examples\skills
csr route "优化现有页面并检查移动端显示" --path .\examples\skills
csr eval .\examples\eval.yml --path .\examples\skills
csr budget --path .\examples\skills
```

如果是在仓库源码目录中运行：

```powershell
node src\cli.js scan --path .\examples\skills
node src\cli.js audit --path .\examples\skills
node src\cli.js route "优化现有页面并检查移动端显示" --path .\examples\skills
node src\cli.js eval .\examples\eval.yml --path .\examples\skills
node src\cli.js budget --path .\examples\skills
```

## 在 Codex 对话中怎么用

你可以对 Codex 说：

```text
先用 csr route 判断这个任务适合哪些 Skill，并解释推荐原因。
任务：“优化现有页面并检查移动端显示”
```

如果没有全局安装 `csr`，可以运行：

```powershell
node src\cli.js route "优化现有页面并检查移动端显示" --path .\examples\skills
```

如果已经全局安装或 `npm link`：

```powershell
csr route "优化现有页面并检查移动端显示" --path .\examples\skills
```

## 五个命令

### scan

查看有哪些 Skills：

```powershell
csr scan --path .\examples\skills
```

默认隐藏本地路径。需要调试路径时再加：

```powershell
csr scan --show-paths --path .\examples\skills
```

### audit

检查 Skill 描述问题：

```powershell
csr audit --path .\examples\skills
csr audit --severity warning --path .\examples\skills
```

### route

预测任务适合哪些 Skills：

```powershell
csr route "检查登录接口是否存在权限绕过" --path .\examples\skills
```

重点看：

- 推荐了哪些 Skill；
- 推荐原因；
- 未推荐原因；
- 是否明显推荐过多或漏选。

### eval

运行测试集：

```powershell
csr eval .\examples\eval.yml --path .\examples\skills
csr eval .\examples\eval.yml --json --path .\examples\skills
csr eval .\examples\eval.yml --output .\tmp-eval-report.md --path .\examples\skills
```

当前示例 Eval 有 50 条任务，包括 strict、permissive 和 no-match。

### budget

估算 Skill 元数据预算：

```powershell
csr budget --path .\examples\skills
csr budget --json --path .\examples\skills
```

注意：这是粗略估算，不是 Codex 内部真实 token 计费。

## 人工验收建议

建议你重点运行：

```powershell
npm test
node src\cli.js --version
node src\cli.js eval .\examples\eval.yml --path .\examples\skills --min-complete-rate 1
node src\cli.js budget --path .\examples\skills
```

如果这些都通过，再尝试扫描你自己的 Skill 目录。

## 当前限制

- 本地预测不等于 Codex 实际调用；
- Router 是规则式的，语义能力有限；
- `agents/openai.yaml` 只是本地提示；
- `package.json` 依赖只是声明，不代表依赖可用；
- `budget` 只是估算；
- 工具不会自动修改用户 Skill；
- 工具不调用外部 AI。
