# kits/ —— 本项目锁定的组件库副本（vendoring）

**只放组件库（kit），不放基础库。**

| 这类东西 | 走哪 | 为什么 |
| --- | --- | --- |
| `@yoyaflow/yoya-ui` · `@yoyaflow/yoya-core`（**基础库**） | `apps/<ui>/package.json` 的 `dependencies` + lock | 没有它页面渲染不出来 —— 是**依赖**，不是 kit |
| 第三方 / 项目自有的**组件库**（kit，例如 `yoya-kit`、`acme/orders-kit`） | 本项目 `kits/<owner>/<kit>/`（vendoring），或发布成 npm 包后按版本范围引用 | 装了它才有那些组件；换版本要有显式动作 |

判据一句话：**没有它页面渲染不出来 = 基础库；装了它才有那些组件 = kit。**

## 为什么 vendoring（放进项目里）

项目需要 kit 时**从 `kits/` 拿，不去问上游**：上游出故障、删版本、registry 挂掉，本项目零影响
（toB 私有化 / 离线内网的硬要求）。代价是"复制会漂移"，所以副本必须自带 **provenance**：

```json
{
  "namespace": "acme",
  "name": "orders-kit",
  "version": "0.1.0",
  "source": {
    "repo": "<上游仓地址>",
    "vendoredAt": "2026-09-30",
    "integrity": "sha256-…",
    "note": "本项目锁定的副本；改过就要在这里写清改了什么"
  }
}
```

## 怎么用

`apps/<ui>/package.json` 里用 `file:` 引用 —— **件在项目里，依赖解析还是 npm 的**：

```json
{ "dependencies": { "acme-orders-kit": "file:../../kits/acme/orders-kit" } }
```

## 两条边界

- **要收费 / 要授权控制的 kit 不放这里**（放进来就等于交付出去）——`kits/` 是"这个项目的依赖副本"，
  不是"你的产品资产库"；
- 加载要**显式信任**（宿主侧声明路径，不静默扫描任意目录）。

## .gitignore 策略（别把大制品塞进 Git）

- **源码与清单进 Git**（`kit.json`、`components/`、README）—— 它们是"这个项目锁了什么"的证据，要能 diff / blame；
- **`dist/` 这类大制品按需忽略**，交付时一并打包 —— 这一条决定了"别人拿到的目录是否自包含"；
- 模板的 `.gitignore` 已经忽略 `node_modules/` 与 `dist/`（含 kit 的 `dist/`）：
  克隆后先各自构建，或者由交付包带上制品。
