// 组件作者契约（票 06 §一）：跨组件通用、第三方作者只装 core 就要能拿到。
// ui 里的官方组件与外部组件包都从这里导入；`components/shared.js` 只是顺手再导出一次。
import {
  ComponentNode,
  ViewNode,
  applySetupValue,
  hasComponentIdentity,
  normalizeSetupArguments
} from './node.js';
import { ref } from './signals/handle.js';

// 元素选项落地属于节点/元素面，实现只有 `node.js` 一份（类型声明在 types/core.d.ts）。
// 这里**再导出同一绑定**：作者从主入口或本入口 import 都拿得到同一个函数；如果两处各自
// 实现同名函数，barrel 的 `export *` 会把它判成命名空间冲突、静默丢掉这个名字。
export { applyElementOptions } from './node.js';

export function booleanMethod(target, key, initial, apply) {
  const state = ref(Boolean(initial));
  target[`_${key}`] = state;

  return (value) => {
    if (value === undefined) {
      return state.value;
    }

    const next = Boolean(value);
    state.value = next;

    if (typeof apply === 'function') {
      apply(next);
    }

    return target;
  };
}

/**
 * **DOM 元素**（不是视图节点）上的身份判定：读 `vn` 属性、按空格拆名，多值任一命中。
 *
 * 用途：事件回调里 `event.target.closest(...)` 拿到的是真 DOM，视图节点侧的
 * `componentNameOf` / `hasComponentIdentity` 读不到它。身份类名退场后（票 15），
 * "这个元素是不是某个部件" 就靠这条判定。
 */

export function elementHasIdentity(element, name) {
  const value = element?.getAttribute?.('vn');
  return typeof value === 'string' && value.split(/\s+/).includes(name);
}

/**
 * 命令委托：把**节点类型（视图根）**上的同名方法挂到组件 `api` 上（返回节点时映射回 `api`，
 * 链式两端都通）。vNode 定义里写 `delegateCommands(api, element, ['open', 'close'])`，
 * 命令面就固定成这份清单；`component-shell.test.js` 按"节点类型上的公开方法"逐条兜底。
 */

export function delegateCommands(api, node, names) {
  names.forEach((name) => {
    api[name] = (...args) => {
      const result = node[name](...args);
      return result === node ? api : result;
    };
  });
}

/**
 * 容器组件上的子工厂调用（`menu.vMenuItem(…)`）：转发到视图根，只转发该族自己的子工厂，
 * 不把整套 DSL 复制到每个实例上。
 */

export function delegateChildFactories(api, node, names) {
  names.forEach((name) => {
    const factory = node[name];
    if (typeof factory !== 'function' || name in api) {
      return;
    }
    api[name] = (...args) => {
      factory.apply(node, args);
      return api;
    };
  });
}

/**
 * 节点类型上有、组件 `api` 上还没有的**公开方法**：补进命令面。
 *
 * 视图根还是节点类型的组件（`navigation/menu` / `data-display/tree` / `chart/echart` 等）用它兜底：
 * 构造函数里挂的开关（`disabled()` / `checked()` …）不在原型上，手工清单漏一个就会静默失效
 * （迁移表单控件时踩到：`vTimer().disabled()` 直接不存在）。
 * 闭包形态的组件（真 B）不走这条——命令自己在 `api` 上写，元素级命令需要时才代委托
 * （如布尔控件族的 `createBooleanControl`）。
 * 口径与旧的 `createComponentShell` 一致，只是不再需要外壳。
 */

export function delegateNodeCommands(api, node) {
  const names = [];
  const seen = new Set();

  const collect = (source) => {
    if (!source) {
      return;
    }

    Object.getOwnPropertyNames(source).forEach((name) => {
      if (seen.has(name) || name === 'constructor' || name.startsWith('_')) {
        return;
      }

      seen.add(name);
      if (name in api || name in ComponentNode.prototype || typeof node[name] !== 'function') {
        return;
      }

      names.push(name);
    });
  };

  collect(node);
  let prototype = Object.getPrototypeOf(node);
  while (prototype && prototype !== Object.prototype) {
    collect(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }

  return delegateCommands(api, node, names);
}

export function themeValue(token, fallback) {
  return `var(--yoya-${token}, ${fallback})`;
}

export function themeBorder(token, fallback, width = '1px') {
  return `${width} solid ${themeValue(token, fallback)}`;
}

export function normalizeComponentArguments(first = null, second = null, third = null) {
  return normalizeSetupArguments(first, second, third);
}

/**
 * 执行构建回调：节点会记录 builder 以支持区域重建；
 */
// 内部助手：本模块的 `applyComponentSetup` / `createComponentFactory` 用它；ui 保留下来的
// 槽位装配助手（`setupButtonSlot` / `setupContentSlot`）也调用它，所以它是**模块级导出**
// （走 `/internal/*` 深引用），但不进 core 的聚合面（聚合里是显式名单）。
export function runBuilder(node, builder) {
  if (typeof node.setup === 'function') {
    node.setup(builder);
    return;
  }

  builder(node);
}

export function applyComponentArguments(node, options = null, callback = null) {
  applySetupValue(node, options);
  applySetupValue(node, callback);
  return node;
}

/**
 * 组件工厂（**形态 C 的旧口径**）：首个参数交给组件构造函数（组件自己的 setup / 特殊路由逻辑
 * 在这里），其余参数按出现顺序走统一分派；超过三个参数由工厂把 `arguments` 透传进来（见第五参数）。
 *
 * 库内组件已全部收敛成 A / B 两种写法，各自用「定义 + `createComponentShortcut`」或
 * 「定义 + `applyComponentArguments`」建实例，所以这个助手**只留给第三方 / 编译侧的类组件**
 * （编译器按「从库内导入的 `createComponentFactory`」识别形态 C 的编译单元，见票 18 / `docs/compiler`）。
 * 新代码不要用它。
 */

export function createComponentFactory(
  Component,
  first = null,
  second = null,
  third = null,
  args = null
) {
  const node = first instanceof Component ? first : new Component(first);
  applySetupValue(node, second);
  applySetupValue(node, third);

  if (args && args.length > 3) {
    for (let index = 3; index < args.length; index += 1) {
      applySetupValue(node, args[index]);
    }
  }

  return node;
}

export function applyComponentSetup(node, setup) {
  if (setup === null || setup === undefined) {
    return node;
  }

  if (typeof setup === 'function') {
    runBuilder(node, setup);
    return node;
  }

  if (
    setup instanceof ViewNode ||
    Array.isArray(setup) ||
    typeof setup === 'string' ||
    typeof setup === 'number'
  ) {
    node.child(setup);
    return node;
  }

  if (isPlainObject(setup)) {
    node.setup(setup);
  }

  return node;
}

export function normalizeChildren(content) {
  if (content === null || content === undefined) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
}

/**
 * 列表项的**身份键**（`keyed` 用）：每个组件实例建一份，不是模块级——同一页面渲染两次的键逐字一致
 * （SSR 直出 / hydrate 都对得上），同一个项节点重复投递也始终是同一个键（行按它复用 / 搬动）。
 *
 * 项是**节点**而不是数据行，键只能按节点身份发：按 href / 下标发键，会在插入 / 重排时把同一个节点换到
 * 另一个键上（旧成员先销毁，再按新键重建一个已经销毁的节点）。键会由引擎镜像成 `data-row-key`。
 */

export function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function resolveTextValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTextValue(item)).join('');
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  // 组件 props 是配置位：只接受字面值与信号句柄。函数在这里没有绑定语义，
  // 静默串成源码文本会让人以为传进去了（值位置接受零参闭包的地方另行说明）。
  if (typeof value === 'function') {
    throw new TypeError(
      'property value does not accept a function: pass a ref/computed handle. ' +
        'Zero-argument readers are only supported in element value positions ' +
        '(attr / style / styles / toggleClass / vText / mountable)'
    );
  }

  if (typeof value.textContent === 'function') {
    return value.textContent();
  }

  return String(value);
}

/**
 * 组件快捷方法：createElementFactory 的组件侧对应物。
 *
 * 定义函数（VXxx）只描述组件（结构 / 状态 / 命令 / 身份，参数是组件自己的）；
 * 快捷方法（vXxx）建组件并把调用方参数按 setupFunction / setupString / setupObject 分派实现，
 * 组件在 api 上覆盖同名方法就用覆盖的，没覆盖就回落视图根（元素）的实现。
 */
/**
 * 同类实例判定：优先看**身份事实**（多值 `vn` 任一名命中），退回原型判定。
 * 不再依赖 `Symbol.hasInstance`（defineComponentIdentity 已退场），箭头函数也没有 prototype。
 */
function isSameComponent(value, Definition) {
  const name = Definition?.name;
  // 身份 = 多值 `vn` 事实：包装型（`VTimer` = `VInput`）任一名命中即同类
  // （与 component-shell 的 reuseComponent 同一口径）。
  if (name && hasComponentIdentity(value, name)) {
    return true;
  }
  try {
    return value instanceof Definition;
  } catch {
    return false;
  }
}

/**
 * 组件定义 → 快捷方法。
 *
 * 默认（不传 options）：`Definition()` 不带参，调用方参数全部按 setup 分派落到组件节点上
 * （`setupFunction` / `setupString` / `setupObject` + 节点 / 数组的固定分派）——存量组件的形态。
 *
 * `{ props: true }`：**定义函数自己吃 props**（业务组件函数形态）。此时调用方参数里的
 * **第一个普通对象**作为 props 传给定义函数（构建期就知道，状态一次初始化到位、绑定首评即终值，
 * 不需要"构建 → 落地"窗口的收口）；其余参数照旧按 setup 分派，只是它们**在构建之后**才落位，
 * 组件的命令要自己收口（`if (!self.node()._el) self.node().flush()`，见 `badge.js`）——
 * 于是嵌套结构走 `.setup(cb)` 或位置参数：
 *
 * ```js
 * vBadge({ count: 5, dot: true }).setup((badge) => badge.child(...));   // props 走调用、嵌套走 .setup()
 * vCard('标题', { variant: 'primary' }, (card) => card.vCardHeader('头'));  // 文本 + props + 回调
 * ```
 */

export function createComponentShortcut(Definition, options = {}) {
  const acceptsProps = options.props === true;

  return function componentShortcut(first = null, second = null, third = null) {
    // 复用同类实例（旧 `createComponentFactory` 的语义）：`vCard(已有卡片)` 返回它自己，
    // 其余参数继续按 setup 分派补上。
    if (first && typeof first === 'object' && isSameComponent(first, Definition)) {
      applySetupValue(first, second);
      applySetupValue(first, third);

      for (let index = 3; index < arguments.length; index += 1) {
        applySetupValue(first, arguments[index]);
      }

      return first;
    }

    // props = 参数里的第一个普通对象（定义函数吃 props 时）；其余参数照旧走 setup 分派
    const args = Array.from(arguments);
    const props = acceptsProps ? args.find((value) => isPlainObject(value)) : undefined;
    const node = acceptsProps ? Definition(props) : Definition();

    if (!node || typeof node.setup !== 'function') {
      throw new TypeError(
        'createComponentShortcut(Definition) requires Definition() to return a ViewNode ' +
          '(the component definition owns the view; the shortcut only applies setup arguments).'
      );
    }

    // 已经作为 props 进定义函数的那一份不再分派；其余按出现顺序落位
    for (let index = 0; index < args.length; index += 1) {
      const value = args[index];

      if (acceptsProps && value === props) {
        continue;
      }
      applySetupValue(node, value);
    }

    return node;
  };
}
