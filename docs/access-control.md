# 权限控制（Access Control）

yoya-ui 在基础节点层内置读/写两级权限。**组件只声明裸资源码**，读/写级别完全由用户持有的权限决定；渲染管线自动显隐与禁用，SSR（`toHTML`）与真实 DOM（`renderDom`）行为一致。

> 前端权限是体验层（显隐 / 只读 / 禁用）；真正的安全拦截必须在后端校验。未声明 `access` 的节点永远放行（fail-open），现有代码不受影响。

## 用户持有集合（授权侧）

用户被授予的权限字符串决定级别，**裸码默认可读可写**，与主流权限框架一致：

| 用户持有                | 含义                            |
| ----------------------- | ------------------------------- |
| `system:member`（裸码） | **读 + 写**（默认全权限）       |
| `r.system:member`       | **只读**（能看，不能改/操作）   |
| `w.system:member`       | **读 + 写**（显式，与裸码等价） |

判定：

```text
canRead(code)  = 持有裸 code | r.code | w.code
canWrite(code) = 持有裸 code        | w.code
super_admin（roles 命中 superAdmins）           → 全部放行
```

## 组件声明（资源侧）

组件上只用**裸资源码**，不写前缀：

```js
vInput({ name: 'name', access: 'system:member' }); // 只写裸码
button('删除').access('system:member:remove');
```

引擎按用户持有判定该控件：

- 无读权限 → 不渲染（SSR 也不输出）。
- 有读无写（用户只持 `r.`）→ 显示 + 只读/禁用（可交互控件）。
- 有写（用户持裸码或 `w.`）→ 正常可改可操作。

## 三种效果对照

| 用户持有                | 组件声明        | 结果                       |
| ----------------------- | --------------- | -------------------------- |
| 都没有                  | `system:member` | 不渲染（SSR 也不输出）     |
| `r.system:member`       | `system:member` | 显示 + 可交互控件只读/禁用 |
| `system:member`（裸码） | `system:member` | 可改可操作                 |
| `w.system:member`       | `system:member` | 可改可操作                 |

## 作用域：整块只读 / 就近覆盖

权限作用域在渲染时**自上而下传播**：在容器（如 `vForm` / 卡片）上声明 `access`，内部未自行声明的元素自动继承。

```js
vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name' })); // 无写权限 → 禁用
  form.child(vInput({ name: 'email' })); // 同作用域，一起只读
});
```

**就近覆盖**：子节点一旦自己声明 `access`，就以子节点为准，覆盖祖先作用域；多层嵌套取离操作点最近的一层声明。

```js
vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name' })); // 继承表单作用域（只读）
  form.child(button('导出').access('system:export')); // 就近：按它自己的资源码判定
});
```

> 不可读的祖先作用域会直接整块隐藏，子树不再渲染；就近覆盖主要作用于「可见但只读」的判定。

## 使用示例

**SPA（单用户）**：登录时 `installAccess(...)` 设一次，之后写节点不必再包任何作用域。

```js
import { createAccess, installAccess, vForm, vInput, button } from '@yoyaflow/yoya-ui';

installAccess(createAccess({ permissions: ['system:member', 'w.system:member:remove'] }));

vForm({ access: 'system:member' }, (form) => {
  form.child(vInput({ name: 'name', value: 'Ada' }));
  form.child(vInput({ name: 'email' }));
});
manualBtns.child(button('删除').access('system:member:remove'));
```

**SSR（每请求）**：把 `access` 传给入口，入口内部自动按作用域渲染，不必手写 `withAccess`。

```js
import { renderToString } from '@yoyaflow/yoya-ui/ssr';

renderToString(page, {
  state,
  access: createAccess({ permissions, roles })
});
```

## 三道默认开关（渲染管线统一执行）

| 情况                                  | 结果                                                              |
| ------------------------------------- | ----------------------------------------------------------------- |
| 无 `access` 声明                      | 放行，行为与之前完全一致                                          |
| 声明了裸码且无读权限                  | 不渲染（前端与 SSR 都不输出）                                     |
| 声明了裸码、有读无写（用户只持 `r.`） | 显示，可交互控件禁用（`disabled` / `readonly` / `aria-disabled`） |
| 声明了裸码、有写权限（裸码 / `w.`）   | 正常显示、可改可操作                                              |

写闸会从声明节点**向下继承**：容器声明资源被拒写时，内部表单控件、按钮一并禁用（复合控件如 `vInput` 的内层 `input` 也会收到禁用）。

## 组件接入点（给组件作者）

每个组件可在 `ViewNode` 上重写两个标准钩子：

- `_permissionState()`：返回 `'active' | 'readonly' | 'hidden'`。一般用基类实现，无需重写。
- `_applyAccessState(state)`：把「只读/禁用」按组件自身语义落位。`vInput` / `vButton` 已重写为调用自身的 `disabled()`，样式与交互状态正确；原生元素由基类兜底加 `disabled` / `readonly` / `aria-disabled`。

## SSR / 每请求隔离与全局

- **SPA**：`installAccess(access)` 设一次全局上下文，节点渲染直接使用。
- **SSR**：`renderToString / renderPage / mount / hydrate / hydrateOrMount` 支持 `options.access`，入口内部按请求作用域渲染（与 i18n 同构），不跨请求共享。
- `withAccess(access, build)` 作用域内构建的节点会**捕获该权限上下文**，之后任意时刻渲染都按它判定；因此可以并排构建「有权限 / 无权限」多份实例而互不影响。
- `withAccess(access, build)` 仍保留给封装层 / 框架进阶嵌入，普通使用不必手写。

## API

```js
createAccess({ permissions?, roles?, superAdmins? })  // 创建每请求权限上下文
  .canRead(spec) / .canWrite(spec) / .has(spec) / .isSuper()
  .setPermissions(next) / .subscribe(listener)

installAccess(access)       // SPA：设一次全局上下文
withAccess(access, build)   // 保持作用域（进阶 / 封装层用）
currentAccess()             // 读取当前上下文（作用域优先，回退全局）

renderToString(page, { access })   // SSR / 入口的 options.access 自动作用域
parseAccessSpec(spec)               // 组件传裸码；内部解析出资源 code
stripAccessCode(spec)               // 去掉 r./w. 前缀，得到资源 code

node.access(code)           // 组件只写裸资源码（对象配置可用 access 键）
```
