# Codex Skill Router 使用说明

这份说明面向项目使用者，不要求你懂代码。它的目标是告诉你：如何在 Codex 对话里配合使用 Codex Skill Router，以及如何自己在命令行里试用它。

## 先记住一句话

Codex Skill Router 不能控制 Codex 内部一定调用哪个 Skill。

它现在的作用是：

- 扫描本地有哪些 Skill；
- 检查 Skill 描述是否清楚；
- 根据你的任务描述，预测哪些 Skill 可能适合；
- 用测试集评估 route 预测是否稳定。

也就是说，它是一个本地辅助判断工具，不是 Codex 的内部调度系统。

## 项目位置

当前项目在：

```powershell
<你的项目目录>\codex-skill-router
```

进入项目目录：

```powershell
cd "<你的项目目录>\codex-skill-router"
```

## 最简单的试用方式

先使用仓库自带的示例 Skill：

```powershell
node src\cli.js scan --path .\examples\skills
```

你应该看到类似结果：

```text
找到 Skills: 10
正常: 10
```

然后试一次 route：

```powershell
node src\cli.js route "优化现有的 Next.js 页面，并检查移动端显示" --path .\examples\skills
```

你重点看：

- 推荐了哪些 Skill；
- 推荐原因；
- 哪些 Skill 没有推荐；
- 没推荐的原因。

再跑完整 Eval：

```powershell
node src\cli.js eval .\examples\eval.yml --path .\examples\skills --min-complete-rate 1
```

你应该看到：

```text
总测试数: 30
完全正确: 30
错误: 0
误报: 0
漏报: 0
```

## 在 Codex 对话中怎么用

你可以直接对 Codex 说：

```text
先用 csr route 判断这个任务适合哪些 Skill，再开始执行：
“优化现有的 Next.js 页面，并检查移动端显示”
```

如果当前没有安装 `csr` 命令，Codex 可以运行：

```powershell
node src\cli.js route "优化现有的 Next.js 页面，并检查移动端显示" --path .\examples\skills
```

如果已经安装了 `csr` 命令，Codex 可以运行：

```powershell
csr route "优化现有的 Next.js 页面，并检查移动端显示" --path .\examples\skills
```

## 安装成本地 csr 命令

在项目目录运行：

```powershell
npm link
```

然后可以直接使用：

```powershell
csr --help
csr scan --path .\examples\skills
csr route "检查登录接口是否存在权限绕过" --path .\examples\skills
csr eval .\examples\eval.yml --path .\examples\skills --min-complete-rate 1
```

如果以后不想保留这个本地命令：

```powershell
npm unlink -g codex-skill-router
```

## 使用你自己的 Skill

当你要扫描自己的真实 Skill 时，把路径换成你的 Skill 目录。

例如：

```powershell
csr scan --path "你的 Skill 目录"
csr audit --path "你的 Skill 目录"
csr route "你的任务描述" --path "你的 Skill 目录"
```

如果你不知道 Skill 目录在哪里，可以先让 Codex 帮你找：

```text
帮我找到本机 Codex Skills 的目录，然后用 csr scan 扫描。
```

## 四个命令怎么理解

### scan

用途：看看某个目录里有哪些 Skill。

常用命令：

```powershell
csr scan --path .\examples\skills
```

你主要看：

- 找到几个 Skill；
- 有没有格式错误；
- 有没有读取失败。

### audit

用途：检查 Skill 的描述是否清楚。

常用命令：

```powershell
csr audit --path .\examples\skills
```

如果只想看比较重要的问题：

```powershell
csr audit --severity warning --path .\examples\skills
```

### route

用途：输入一个任务，让工具预测适合哪些 Skill。

常用命令：

```powershell
csr route "只修改 README 中的安装说明" --path .\examples\skills
```

你主要看：

- 推荐的 Skill 是否符合直觉；
- 推荐原因是否说得通；
- 有没有明显推荐过多；
- 有没有漏掉应该推荐的 Skill。

### eval

用途：用一批测试任务检查 route 是否稳定。

常用命令：

```powershell
csr eval .\examples\eval.yml --path .\examples\skills
```

更严格的验收命令：

```powershell
csr eval .\examples\eval.yml --path .\examples\skills --min-complete-rate 1
```

`--min-complete-rate 1` 的意思是：必须 100% 完全正确，否则命令失败。

## 路径隐私

默认情况下，工具会隐藏本地路径。

这是为了避免你截图或复制输出时泄露私人电脑路径。

如果你确实需要看完整路径，可以加：

```powershell
--show-paths
```

例如：

```powershell
csr scan --path .\examples\skills --show-paths
```

## 适合你的日常使用方式

建议你在每次复杂任务开始前，让 Codex 先跑一次 route：

```text
先用 csr route 判断这个任务适合哪些 Skill，并解释推荐原因。不要直接开始写代码。
任务：“这里写你的任务”
```

然后你人工判断：

- 推荐结果是否符合常识；
- 有没有明显不该推荐的 Skill；
- 有没有漏掉你知道应该用的 Skill。

如果推荐结果不符合直觉，就把任务描述写得更具体，再跑一次。

## 当前限制

- 它不能控制 Codex 内部真实调用哪个 Skill；
- 它不调用 AI，也不理解复杂上下文；
- 它主要依赖 Skill 的 `name` 和 `description`；
- 如果 Skill 描述写得太模糊，route 结果也会变差；
- 它默认只读，不会修改你的 Skill。

## 推荐验收流程

你可以按这个顺序试：

```powershell
cd "<你的项目目录>\codex-skill-router"
node src\cli.js --help
node src\cli.js scan --path .\examples\skills
node src\cli.js audit --severity warning --path .\examples\skills
node src\cli.js route "优化现有的 Next.js 页面，并检查移动端显示" --path .\examples\skills
node src\cli.js eval .\examples\eval.yml --path .\examples\skills --min-complete-rate 1
```

如果这些都符合预期，再尝试扫描你自己的真实 Skill。
