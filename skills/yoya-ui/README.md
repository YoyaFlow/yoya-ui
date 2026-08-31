# yoya-ui Codex 技能安装说明

本目录是 [yoya-ui](../../README.zh-CN.md) 的 Codex 技能。安装后，Codex 能在项目中使用 yoya-ui 时给出正确指导：声明式组件 DSL、页面组合、表单收集与校验、主题 token、SSR/hydrate、i18n，以及基于 `@yoyaflow/yoya-ui/core` 开发第三方组件。

## 前置要求

- 已安装 Codex（CLI 或桌面应用）
- 技能默认安装到 `$CODEX_HOME/skills`，即：
  - macOS / Linux：`~/.codex/skills`
  - Windows：`%USERPROFILE%\.codex\skills`

## 方式一：官方安装脚本（推荐）

仓库需为公开仓库。先克隆官方 `openai/skills` 仓库获取安装脚本：

```bash
git clone https://github.com/openai/skills.git
cd skills
python scripts/install-skill-from-github.py --repo YoyaFlow/yoya-ui --path skills/yoya-ui
```

也支持 URL 写法：

```bash
python scripts/install-skill-from-github.py --url https://github.com/YoyaFlow/yoya-ui/tree/main/skills/yoya-ui
```

脚本行为说明：

- 默认使用 `main` 分支，可用 `--ref` 指定其他分支或标签
- 默认安装到 `~/.codex/skills/yoya-ui`，可用 `--dest` 修改目录、`--name` 修改技能名
- 目标目录已存在时会中止，更新前需先删除旧目录
- 支持一次安装多个技能：多个 `--path` 参数分别指向各技能目录

## 方式二：让 Codex 直接安装

新开一个 Codex 会话，直接说：

> 安装 YoyaFlow/yoya-ui 仓库 skills/yoya-ui 路径的 yoya-ui 技能

Codex 会调用 skill-installer 自动完成安装。

## 方式三：手动复制

将 `skills/yoya-ui` 整个目录复制到技能目录：

- macOS / Linux：复制到 `~/.codex/skills/yoya-ui/`
- Windows：复制到 `%USERPROFILE%\.codex\skills\yoya-ui\`

新开一个 Codex 会话即可生效。

## 验证安装

新开一个 Codex 会话，询问“列出已安装的技能”，应能看到 `yoya-ui`；也可以直接检查目录：

```bash
ls ~/.codex/skills/yoya-ui
```

## 更新技能

目标目录已存在时脚本会中止，更新前先删除旧版本再重新安装：

```bash
# macOS / Linux
rm -rf ~/.codex/skills/yoya-ui

# Windows（PowerShell）
Remove-Item -Recurse -Force "$env:USERPROFILE\.codex\skills\yoya-ui"
```

然后重新执行方式一中的安装命令。

## 常见问题

- **私有仓库**：安装脚本支持私有仓库，通过已配置的 git 凭据或 `GITHUB_TOKEN` / `GH_TOKEN` 下载
- **网络受限**：直连下载失败时，脚本会自动回退到 git 稀疏检出（先 HTTPS 后 SSH）
- **安装后不生效**：技能在会话启动时加载，请新开一个会话再使用
