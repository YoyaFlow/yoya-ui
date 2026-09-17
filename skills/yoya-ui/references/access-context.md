# 权限（access）与 Context

yoya-ui 在基础节点层内置 read / write 两级权限：**组件只声明裸资源码**，读/写级别由用户持有的权限决定；渲染管线自动显隐与禁用，SSR（`toHTML`）与真实 DOM（`renderDom`）行为一致。

> 前端权限是体验层（显隐 / 只读 / 禁用）；真正的安全拦截必须由后端校验。未声明 `access` 的节点永远放行（fail-open），现有代码不受影响。

## 用户持有集合（授权侧）

用户被授予的权限字符串决定级别，**裸码默认可读可写**：

| 用户持有                | 含义                            |
| ----------------------- | ------------------------------- |
| `system:member`（裸码） | **读 + 写**（默认全权限）       |
| `r.system:member`       | **只读**（能看，不能改/操作）   |
| `w.system:member`       | **读 + 写**（显式，与裸码等价） |

```js
createAccess({
  permissions: ['system:member', 'r.system:member:audit'],
  roles: ['admin'],
  superAdmins: ['super_admin'] // 命中则该角色全部放行
});

// 判定
access.canRead(code); // 持有 裸码 | r. | w. 任一
access.canWrite(code); // 持有 裸码 | w.（r. 不满足）
```

## 组件声明（资源侧）

组件只用**裸资源码**，不写前缀：

```js
vInput({ name: 'name', access: 'system:member' }); // 对象配置
button('删除').access('system:member:remove'); // 链式
```

引擎按用户持有判定该控件：

- 无读权限 → **不渲染**（SSR 也不输出）。
- 有读无写（用户只持 `r.`）→ 显示 + **只读 / 禁用**（可交互控件）。
- 有写（裸码或 `w.`）→ 正常可改可操作。

## 作用域：整块只读 / 就近覆盖

容器（`vForm` / 卡片）上声明 `access`，内部未自行声明的元素自动继承；**子节点自己声明即以子节点为准**（就近覆盖）。

```js
vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name' })); // 继承表单作用域
  form.child(button('导出').access('system:member:export')); // 就近：按它自己的资源码判定
});
```

> 不可读的祖先作用域直接整块隐藏，子树不再渲染；就近覆盖主要作用于「可见但只读」。

## 初始化与使用

**SPA（单用户）**：启动时 `installAccess(...)` 一次，之后节点直接 `.access()`，不再包任何作用域。

```js
import { createAccess, installAccess } from '@yoyaflow/yoya-ui';

installAccess(createAccess({ permissions: ['system:member'], roles: ['admin'] }));

vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name' }));
});
```

**SSR（每请求）**：把 `access` 传给入口，入口内部自动按请求作用域渲染（与 i18n 一致，不跨请求共享）。

```js
import { renderToString } from '@yoyaflow/yoya-ui/router';

renderToString(page, { state, access: createAccess({ permissions, roles }) });
```

`installAccess` / SSR `options.access` 支持的入口：`renderToString / renderPage / mount / hydrate / hydrateOrMount`。

## 进阶：作用域与热切换

- `withAccess(access, build)`：在作用域内构建的节点会**捕获该权限上下文**，之后任意时刻渲染都按它判定；可用于并排构建「有权限 / 无权限」多份实例互不影响。
- 权限热切换：对已注入的上下文调用 `access.setPermissions([...])` 后原地 `renderDom()`，隐藏 / 禁用 / 可编辑三态无需重建视图树。
- SSR/隔离纪律：每请求独立 `createAccess`，服务端渲染后不保留跨请求状态。

## 模板接线（admin 脚手架）

- 启动：`ShellState.load()` → `loadSession()`（`/auth/me`）→ `installAccess(createAccess({ permissions, roles }))` → 菜单按 `permCode` 过滤 → 创建路由。
- 菜单 / 路由：菜单条目标注 `permCode`，`ShellState` 用 `access.canRead(permCode)` 过滤；无读路由不注册，直达 URL 落到未找到页。
- 按钮 / 操作：直接 `.access('system:member:create')` 等裸码，无写自动禁用、无读自动隐藏。
- 演示数据：`shell/api/auth.mock.js` 提供 `/auth/me`；想观察效果增减权限码即可。

## 跨组件共享：provide / inject

**默认就用这一对。** 声明写在构建这一帧的代码里（setup 回调、组件 `render()`、页面工厂），后代直接读，不需要包一层闭包：

```js
import { inject, provide, div, vCard } from '@yoyaflow/yoya-ui';

function ProfileCard() {
  return vCard((card) => card.vCardBody((body) => body.p(`用户：${inject('user').name}`)));
}

const page = div((root) => {
  provide('user', { name: 'Ada' });
  root.child(ProfileCard());
});
```

- **就近覆盖**：同一 key 内层声明覆盖外层；兄弟子树互不影响
- **key**：字符串或 Symbol 都行；没声明过的 key 返回调用点给的 fallback（`inject('user', { name: '客人' })`）
- **作用域归属节点**：声明挂在当前构建的节点上，随节点一起销毁；区域重建会先清掉上一轮的声明，避免残留过期键
- **先 inject 再 provide 即继承覆盖**（Vue 同款写法）：

```js
const parent = inject('config');
provide('config', { ...parent, color: 'red' });
```

- **只读值**：要响应式就把句柄放进去（`provide('count', ref(0))`，消费方 `inject('count')` 拿到同一个句柄）；不要指望 provider 里的普通对象变化会通知视图
- **必须在构建帧内声明**：`provide()` 在构建帧外调用会抛 `TypeError`；`inject()` 在帧外调用只会回退到 withContext / 全局层 / fallback
- 懒解析的组件（`{ render() }`）也读得到：解析时沿父链上溯，不依赖声明的调用栈还在不在
- **先挂再建**：第三方组件若在挂到树上之前就构建子树（异步加载视图那类），用 `buildInProviderScope(host, build)` 构建——子树 inject 得到 host 所在位置的祖先，自己声明的 provide 也归属产出的子树而不外溢；`vDynamicLoader` 与路由视图（`router` / `vRouterViews` 保活页的同步、异步、加载 / 出错视图）已按这个模式接入

## Context：请求级作用域注入

请求级数据（每请求的用户、租户、语言）用调用栈作用域：构建期内可见，结束后还原。

```js
import { withContext, currentContext, div } from '@yoyaflow/yoya-ui';

withContext({ user: { name: 'Ada' } }, () => {
  const page = div((root) => {
    root.p(currentContext('user').name); // 'Ada'
  });
});
```

- `withContext(providers, build)`：构建期内可见，结束后还原；`currentContext(key)` 就近读取（内层覆盖外层），缺省回退到 `installContext` 的全局层
- SSR：入口传 `context` 选项（对象或 `(state) => providers`），每请求隔离
- `inject()` 会依次查 provide 链、withContext 层、`installContext` 全局层，所以两种写法可以混用，读侧统一用 `inject`
- 与 `access` 的关系：access 管显隐/只读，Context 管数据注入；两者都是构建期作用域，SSR 下都按请求隔离

## 选哪个

| 场景                               | 用什么                                                 |
| ---------------------------------- | ------------------------------------------------------ |
| 跨组件共享数据 / 状态句柄          | `provide` + `inject`                                   |
| 每请求的请求级数据（SSR / 多租户） | 入口 `options.context`，或 `withContext`               |
| 单用户 SPA 的全局数据              | `installContext`，读侧仍用 `inject` / `currentContext` |
| 只是父子两层                       | 直接传参数，不必上这两套                               |

## 无障碍原语（core）

`core` 同时提供 `announce`（aria-live 播报）、`createFocusTrap`（焦点循环）、`getFocusableElements`、`moveByKey`（方向键导航）。弹层 / 键盘组件优先复用它们，而不是自己操作 `tabindex` 或 document 焦点。
