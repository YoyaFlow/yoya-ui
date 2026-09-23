/**
 * 编译路径的运行期钩子——`yoya-ui/compiler-runtime` 的真身（入口 shim 只做转出）。
 *
 * 构建期编译器产出「静态片段 + 位置寻址的写操作」，运行期这份模块负责把写操作落到
 * 既有 DOM 上。语义与核心的「收养既有 DOM」（hydrate）同源，只是被编译产物直接调用：
 *
 * - `cloneFragment(html)`：每个形状一份 `<template>`，每实例 `cloneNode(true)`；
 * - `adopt` / `bindChild`：节点模式——把片段里的元素/文本接进节点对象，再激活绑定；
 * - `bindText` / `bindClass` / `setAttr`：元素模式——句柄（或零参 reader）订阅后就地写，
 *   普通值只写一次；`setAttr` 与核心 `applyAttribute` 同口径；
 * - `createElementList`：元素模式的行对账（复用 / 原位重建 / 摘除 / 最小搬动）。
 *
 * SSR 纪律：本模块在服务端被导入是安全的——`<template>` 只在浏览器首次克隆时惰性创建，
 * 模块级缓存是「片段 → 模板」的纯派生缓存（键与值都与请求无关），不跨请求共享状态。
 */
import {
  ViewNode,
  applySetupValue,
  applyInlineStyle,
  appendNodeChild as linkNodeChild,
  applyAttribute
} from '../core/node.js';
import { computed, isSignal } from '../core/signals/handle.js';
import { isKeySet } from '../core/key-set.js';
import { optionKindOf } from '../core/setup-keys.js';

/**
 * 生成代码链接子节点：与 `child()` 同一口径——登记进父节点的 `_children`，**并**把子节点声明的
 * 挂载条件（`mountable`）交给父节点收养。
 *
 * 低层 `appendNodeChild` 只做前半步：产物里的活结点是「收养既有 DOM」，元素本来就躺在父元素里，
 * 条件为假时没人把它摘下来（通用路径是渲染时按状态决定插不插）——离场语义会静默丢掉。
 * 所以编译产物走这一份包装；核心 API 不动（不跑编译器的人不需要它）。
 */
export function appendNodeChild(node, child) {
  linkNodeChild(node, child);
  node._adoptPendingMount?.(child);
  return node;
}

/**
 * 把节点放到容器的指定位置（`before` 为 null 就是末尾）。
 *
 * 节点通道里"结构出现在 `if` / `for` 里"的锚点用它：节点已经用自己的片段建好元素，进树由
 * `node.child(...)` 负责，**位置**要等接管之后按片段里的边界摆回来——静态兄弟不在视图树里，
 * 核心的插入锚点看不到它们。
 *
 * 多根组件（一次 fragment 落实的若干根）按 DOM 组整体搬，与核心的 `nodeDomGroup()` 同口径。
 */
export function mountNodeAt(node, container, before) {
  // **条件挂载**（`vText(x).mountable(cond)` 这类）：此刻不挂的子树不能摆——通用路径按状态决定
  // 插不插（`_syncChildMounted` 自己会插 / 摘），硬摆就多出节点（实测多出空文本节点）。
  // 与 `keyedRows.place()` 同一条规矩：已挂 → 摆到位置；没挂 → 摘掉（没插过就什么都不做）。
  if (typeof node?.isMounted === 'function' && !node.isMounted()) {
    const element = node._el;
    if (element?.parentNode === container) {
      element.remove();
    }
    return node;
  }
  const group = node?._fragmentDom?.length ? node._fragmentDom : node?._el ? [node._el] : [];
  // 已经在位置上时 `insertBefore` 是等价的空操作（移动到自己原来的位置）
  group.forEach((element) => {
    container.insertBefore(element, before ?? null);
  });
  return node;
}

/**
 * 把一个清理函数挂到**节点**上（节点销毁时执行）。
 *
 * 节点通道里"链接组件"的实例化没有 `offs` 数组可放（产物返回的是节点本身），而
 * `bindComponent` 返回的退订函数必须跟着节点一起被释放——核心的 `destroy()` 会跑
 * `node._cleanup` 名单（`bindDocumentEvent` / 动画帧走的就是它）。
 */
export function bindNodeCleanup(node, cleanup) {
  if (!node || typeof cleanup !== 'function') {
    return node;
  }
  node._cleanup = node._cleanup ? [...node._cleanup, cleanup] : [cleanup];
  return node;
}

/**
 * **动态实参**的节点通道实现：直接复用核心的参数分派（`applySetupValue`）——字符串 / 数字 /
 * 句柄 / 数组 / 对象 options / 回调都按通用路径同一份实现落地，编译器不复制第二套语义。
 *
 * 只有节点通道用得上：元素通道没有节点对象，认不出运行期类型（所以那边整形状回落）。
 */
export function applyDynamicArg(node, value) {
  return applySetupValue(node, value);
}

/**
 * **动态实参**的元素通道实现：那里没有节点对象，只能按"位置 = 一段文本"落地
 * （与 `bindText` 同一条口径：句柄 / 零参 reader 订阅，普通值写一次）。
 *
 * 收到节点 / 对象这类要进视图树的值时**明确报错**（不静默写 `[object Object]`）——与 `bindText`
 * 的 `assertTextValue` 同一条规矩：元素通道是"行 = DOM + 值"的快速通道，要节点语义就用节点通道。
 */
export function applyDynamicChild(container, value) {
  if (value === null || value === undefined) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.map((item) => applyDynamicChild(container, item)).filter(Boolean);
  }

  const text = container.ownerDocument.createTextNode('');
  container.appendChild(text);
  const handle = liveHandle(value);
  if (handle) {
    const write = (next) => writeText(text, next);
    write(handle.value);
    return handle.subscribe(write);
  }

  assertTextValue(value);
  writeText(text, value);
  return null;
}

/**
 * 锚点里的**组件调用**（元素通道）：父片段里没有它的结构，运行期按注册表实例化——
 * 克隆组件片段 + 位置写（`entry.bind`），返回 `{ el, destroy }` 行产物。
 */
export function instantiateComponent(entry, values) {
  if (!entry || typeof entry.bind !== 'function' || !entry.plan?.html) {
    throw new Error(
      'yoya-ui: 编译产物里的组件锚点找不到注册表条目（重新生成组件注册表或用通用路径）'
    );
  }
  const el = cloneFragment(entry.plan.html);
  const destroy = entry.bind(el, values);
  return {
    el,
    destroy: typeof destroy === 'function' ? destroy : () => {}
  };
}

/**
 * 锚点里的**组件调用**（节点通道）：节点通道要的是 ViewNode，注册表条目里的 `render` 就是
 * 原组件（通用路径回落，与 `bindComponent` 的回落分支同一份语义）。
 */
export function instantiateComponentNode(entry, values) {
  if (!entry || typeof entry.render !== 'function') {
    throw new Error(
      'yoya-ui: 编译产物里的组件锚点找不到注册表条目（重新生成组件注册表或用通用路径）'
    );
  }
  let node = entry.render(...values);
  if (node && typeof node.render === 'function' && typeof node.renderDom !== 'function') {
    node = node.render();
  }
  node.renderDom?.();
  return node;
}

/**
 * **动态类名**（元素通道）：`className(<非字面量>)` 与核心同一条口径——`String(值)` 按空白切分，
 * 与已有类名**保序去重**。
 *
 * 节点通道直接用 `node.className(expr)`（同一份实现）；元素通道没有节点对象，只能落到 `classList`：
 * 已存在的类名保持原位、新类名按顺序追加——与核心的 merge 语义一致（差别只在"动态类名写在静态类名
 * 之前"时类名文本的顺序，见票 08 的同族序列化差异）。
 */
export function addClassText(element, value) {
  if (!value) {
    return null;
  }
  const text = String(value);
  const names = /\s/.test(text) ? text.split(/\s+/).filter(Boolean) : [text];
  names.forEach((name) => element.classList.add(name));
  return null;
}

const templates = new Map();

/**
 * 页面里的模板块：`<template data-yoya-fragment="<签名>">片段</template>`。
 * 用签名（构建期对片段 HTML 取的哈希）对号，命中就从页面克隆 —— 片段字节走 HTML 通道，
 * 解析交给 HTML 解析器（首屏不再多付 JS 里的模板串解析）。命中不到则回落到 JS 字符串路径。
 */
/**
 * 页面模板块的缓存：命中存 `content`，**未命中也存 `null`**。
 * 页面模板块是静态标记，运行期不会再变；不缓存未命中会让「片段内联在 JS、页面没有模板块」的用法
 * 每建一行查一次 DOM（票 17：1k 行实测白付 6 ms）。
 */
const pageTemplates = new Map();

function pageTemplate(signature) {
  if (pageTemplates.has(signature)) {
    return pageTemplates.get(signature);
  }
  if (typeof document === 'undefined') {
    return null;
  }

  const found = document.querySelector(`template[data-yoya-fragment="${signature}"]`);
  const content = found ? found.content : null;
  pageTemplates.set(signature, content);
  return content;
}

/** 每个形状一份 template；`firstElementChild` 是片段根。传签名时优先用页面里的模板块。 */
export function cloneFragment(html, signature = null) {
  if (signature) {
    const content = pageTemplate(signature);
    if (content) {
      return content.firstElementChild.cloneNode(true);
    }
    // templates-only 构建：不带 JS 回落字符串，模板缺失就是**硬错误**（不静默产出空节点）
    if (!html) {
      throw new Error(
        `yoya-ui: fragment template "${signature}" is missing from the page ` +
          '(templates-only build: write the <template data-yoya-fragment="…"> block or rebuild)'
      );
    }
    // 模板缺失 / 形状不符：回落到 JS 字符串路径（不静默出错）
  }

  let template = templates.get(html);
  if (!template) {
    template = document.createElement('template');
    template.innerHTML = html;
    templates.set(html, template);
  }
  return template.content.firstElementChild.cloneNode(true);
}

/**
 * 位置寻址接管（节点模式）：节点对象只承担绑定 / 事件，DOM 用片段里那一份。
 *
 * 文本占位由**产出它的那条写**自己认领（`bindChild` 把占位文本节点接到自己的 `VTextNode` 上），
 * 所以这里不再按位置传一份文本名单：名单与 `_children` 里文本节点的**下标对应**在混入运行期
 * 子节点（`mountRuntimeChildren`：值到运行期才知道是文本还是节点）之后不再成立，按位置硬对齐
 * 会把值写进别人的占位。位置表（`p0` / `p1`…）仍然是"跑任何 op 之前一次性解析"的纪律。
 *
 * `liveAttrs` = 这个片段位置上「值由运行期写」的属性名（节点通道的活属性）。片段里为它们留了
 * 空占位（`data-x=""`，属性顺序与规范序列化一致）；绑定的初值在构建期已经求过一次，值为
 * `null` / `undefined` / `false` 时节点快照里**没有**这一项——通用路径的 DOM 也就没有这个属性，
 * 所以占位必须删掉（否则节点通道会留下一个 `data-x=""`，与通用路径逐字节不同）。
 */
export function adopt(node, element, liveAttrs = []) {
  node._el = element;

  node._applyBindingsToElement(false);
  if (liveAttrs.length > 0) {
    liveAttrs.forEach((name) => {
      if (node._attrs?.[name] === undefined) {
        element.removeAttribute(name);
      }
    });
  }
  node.renderDom();
  return node;
}

/**
 * 一次性写（非句柄）的文本值守卫：节点 / 数组 / 对象在通用路径里都不是「一段文本」——
 * 节点会被当文本写、数组会被摊平成多个子节点、对象直接报错——编成位置写就是**静默误编**，
 * 所以宁可抛错。句柄不在这里拦：它走的是与通用路径同一条 `String(value)`。
 */
function assertTextValue(value) {
  if (value instanceof ViewNode) {
    throw new TypeError(
      'compiled text position received a node: use child(<factory>(...)) or a slot marker ' +
        'instead of passing a node variable into a text position.'
    );
  }
  if (Array.isArray(value)) {
    throw new TypeError(
      'compiled text position received an array: the generic path flattens arrays into several ' +
        'children, so writing String(value) would silently differ — use keyed(...) or one ' +
        'child(...) per item.'
    );
  }
  if (value !== null && typeof value === 'object') {
    throw new TypeError(
      'compiled text position received an object: pass a string / number / handle, or build a ' +
        'node for it.'
    );
  }
}

/**
 * 片段里的文本位置是**注释锚点**（见 `emit.js` 的 `TEXT_ANCHOR`）：HTML 解析器会把相邻的两段文本
 * 并成一个文本节点，注释不参与合并，位置表因此照旧对齐。写入之前先把锚点换成真文本节点。
 *
 * 幂等：传入的已经是文本节点（或锚点没有父节点）时原样返回。
 */
export function textAt(anchor) {
  // 只有**注释锚点**需要换：文本节点 / 真实元素原样返回（直接调这个钩子的用法照旧）
  if (!anchor || anchor.nodeType !== 8) {
    return anchor;
  }
  const parent = anchor.parentNode;
  if (!parent) {
    return anchor;
  }
  const text = anchor.ownerDocument.createTextNode('');
  parent.replaceChild(text, anchor);
  return text;
}

/** 文本位置（节点模式）：句柄 → 建绑定并接管既有文本节点；普通值 → 直接写。 */
export function bindChild(node, textNode, value) {
  const target = textAt(textNode);
  if (isSignal(value)) {
    node.child(value);
    const textChild = node._children[node._children.length - 1];
    textChild._textNode = target;
    textChild._el = target;
    return;
  }

  assertTextValue(value);
  target.textContent = value === null || value === undefined ? '' : String(value);
}

/**
 * **运行期子节点**（节点通道）：`child(<表达式>)` 的值到运行期才知道是什么，分派**不复制第二套**——
 * 直接交给核心 `child()`（字符串 / 数字 / 句柄 / 零参 reader / 节点 / 组件对象 / 数组 / 认不出的
 * 值报错，全是它自己的口径，与通用路径逐条同源）。
 *
 * 两件事必须在这里做对：
 *
 * 1. **句柄要自己切差集**：`child()` 返回的是**父节点**（链式子工厂 `this.child(factory(…))` 依赖
 *    这个语义），拿返回值当新子节点就会把本片段元素当成子节点，DOM 出现嵌套 / 重复片段；
 * 2. **位置不在这里摆**：此刻宿主还没接管片段（`_el` 为 null），子节点的 DOM 要等 `renderDom()`
 *    才存在。这里只登记 `[子节点, 边界]`，由产物在 `adopt()` 之后统一 `mountNodeAt` 摆位
 *    （边界 = 片段里它后面的那个兄弟，没有就是容器末尾）。
 */
export function mountRuntimeChildren(node, value, places, before) {
  // 长度必须在调用**之前**取：`node.child()` 是就地 push（`_children` 是同一个数组引用），
  // 拿"调用前后的数组对象"比较永远是同一个对象（差集恒为空，后面的子节点就没人摆位）。
  const previous = node._children;
  const start = previous ? previous.length : 0;
  node.child(value);
  const children = node._children;
  if (!children || children.length === start) {
    return places;
  }

  for (let index = start; index < children.length; index += 1) {
    const child = children[index];
    // 同一个子节点在一次调用里出现多次（`child(a); child(a)`）：核心的 `renderDom` 看到它的元素
    // 已经在父元素里就**原地留人**（DOM 只在第一次的位置出现），所以这里也不能再登记一次摆位
    // ——`mountNodeAt(child, …, null)` 会把它搬到末尾，与通用路径的 DOM 不一致。
    if (children.indexOf(child) < index) {
      continue;
    }
    places.push([child, before]);
  }
  return places;
}

/**
 * **运行期语句的"洞"**（票 21 §2.1.7）：把一条父方法调用（`node.hstack(…)` / `node.vTd(…)`）
 * **原样在产物节点上跑**，跑完把**新加的子节点**按边界摆位。
 *
 * 为什么不认方法名：父方法就是通用路径那个注册过的快捷方法（`registerChildFactories`）——
 * 调它就是调通用路径本身，语义天然同源；编译器只需要知道"它往当前节点加了子节点"，
 * 于是按通用做法（`child()` 差集 + 边界摆位）把位置补回来。第三方注册的工厂同样适用。
 */
export function mountRuntimeChildrenFrom(node, run, places, before) {
  const previous = node._children;
  const start = previous ? previous.length : 0;
  run();
  const children = node._children;
  if (!children || children.length === start) {
    return places;
  }

  for (let index = start; index < children.length; index += 1) {
    const child = children[index];
    if (children.indexOf(child) < index) {
      continue;
    }
    places.push([child, before]);
  }
  return places;
}

/** 值位置（元素模式）的取值语义：句柄直接用；零参 reader 折成派生信号（依赖自动收集）。 */
function liveHandle(value) {
  if (typeof value === 'function') {
    return computed(value);
  }
  return isSignal(value) ? value : null;
}

const writeText = (element, value) => {
  element.textContent = value === null || value === undefined ? '' : String(value);
};

/**
 * 文本位置（元素模式）：锚点换成真文本节点后就地写；活值订阅，普通值写一次。
 * 返回退订函数（普通值返回 null）。
 */
export function bindText(element, value) {
  const target = textAt(element);
  const handle = liveHandle(value);
  if (!handle) {
    assertTextValue(value);
    writeText(target, value);
    return null;
  }

  writeText(target, handle.value);
  return handle.subscribe((next) => writeText(target, next));
}

/**
 * 元素通道的 `child(<表达式>)` 守卫：这里**没有节点对象**，只能按"位置 = 一段文本"落地。
 * 收到要进视图树的值（节点 / 组件对象 / 认不出的对象）或通用路径根本渲染不了的值（布尔 / symbol）
 * 时**响亮报错**，不静默写 `[object Object]`；要节点语义就把这个单元编成节点通道
 * （`child(<工厂>(…))` 的静态写法两条通道都成立）。
 */
function assertChildValue(value) {
  if (value instanceof ViewNode) {
    throw new TypeError(
      'compiled child() position (element channel) received a node: the element channel has no ' +
        'view nodes — compile this unit with mode "node", or inline the structure with ' +
        'child(<factory>(...)).'
    );
  }
  if (
    value !== null &&
    (typeof value === 'object' ||
      typeof value === 'boolean' ||
      typeof value === 'bigint' ||
      typeof value === 'symbol')
  ) {
    throw new TypeError(
      `compiled child() position (element channel) received ${typeof value}: pass a string / ` +
        'number / handle, or compile this unit with mode "node" for node / component values.'
    );
  }
}

/**
 * **运行期子节点**（元素通道）：没有节点对象，位置就是一段文本——字符串 / 数字 / 句柄 / 零参
 * reader 写进锚点（先换成真文本节点）；数组按通用路径的口径**摊平**成多个文本子节点
 * （注释锚点本身就是插入位置，插完即撤，DOM 与通用路径逐节点一致）。
 *
 * 返回退订函数（活值才有），与 `bindText` 同一套收口方式。
 */
export function bindChildText(element, value) {
  if (value === null || value === undefined) {
    // 通用路径里 `child(null)` 什么都不渲染：锚点也撤掉，别在 DOM 里留一个注释
    element.remove?.();
    return null;
  }

  if (!Array.isArray(value)) {
    const target = textAt(element);
    const handle = liveHandle(value);
    if (!handle) {
      assertChildValue(value);
      writeText(target, value);
      return null;
    }

    writeText(target, handle.value);
    return handle.subscribe((next) => writeText(target, next));
  }

  const parent = element.parentNode;
  const offs = [];
  const writeItem = (item) => {
    if (item === null || item === undefined) {
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(writeItem);
      return;
    }

    const target = element.ownerDocument.createTextNode('');
    parent.insertBefore(target, element);
    const handle = liveHandle(item);
    if (handle) {
      writeText(target, handle.value);
      offs.push(handle.subscribe((next) => writeText(target, next)));
      return;
    }

    assertChildValue(item);
    writeText(target, item);
  };

  value.forEach(writeItem);
  element.remove();
  return offs.length > 0 ? () => offs.forEach((off) => off()) : null;
}

/** 类名位置（元素模式）：语义与 `toggleClass(name, value)` 一致，直接写 classList。 */
export function bindClass(element, name, value) {
  const apply = (next) => element.classList.toggle(name, Boolean(next));
  const handle = liveHandle(value);
  if (!handle) {
    apply(value);
    return null;
  }

  apply(handle.value);
  return handle.subscribe(apply);
}

/** 动态属性（元素模式）：与核心 `applyAttribute` 同一份实现，避免两套语义。 */
export function setAttr(element, name, value) {
  const handle = liveHandle(value);
  if (handle) {
    applyAttribute(element, name, handle.value);
    return handle.subscribe((next) => applyAttribute(element, name, next));
  }

  applyAttribute(element, name, value);
  return null;
}

/** 收集退订函数，让生成代码保持「一行一句话」。 */
export function pushOff(offs, off) {
  if (typeof off === 'function') {
    offs.push(off);
  }
  return off;
}

/**
 * 运行期 options 合并（票 18）：把**整段** options 对象（可能含 `...rest`）按核心那张键分类表
 * （`src/core/setup-keys.js`）落到既有元素上，键序照对象自身的键序——与核心 `_setupObject` 同表同序。
 *
 * 为什么不做"构建期把 rest 与静态键拼成一份 JSON"：`rest` 的键要到运行期才知道，而且
 * `attrs` / `style` 在通用路径里是**整包覆盖**（对象字面量语义），构建期自算必错。
 * 所以这里只做"按对象自身逐键落位"，不新增语义。
 *
 * `children` 一档：编译单元的形参口径要求把 `children` 从 props 解构出来（票 18 §2.2），
 * 所以正常不会走到；真走到就按通用路径的次序落在**结构之前**（内容在前、结构在后）。
 *
 * 返回退订函数（句柄值才有；普通值返回 null），由产物 `pushOff` 收口。
 */
export function applyRuntimeOptions(element, options) {
  if (!element || !options || typeof options !== 'object') {
    return null;
  }

  const offs = [];

  for (const [key, value] of Object.entries(options)) {
    const kind = optionKindOf(key);

    if (kind === 'class') {
      addClassText(element, value);
      continue;
    }

    if (kind === 'attrs') {
      Object.entries(value ?? {}).forEach(([name, attrValue]) => {
        pushOff(offs, setAttr(element, name, attrValue));
      });
      continue;
    }

    if (kind === 'style') {
      Object.entries(value ?? {}).forEach(([name, styleValue]) => {
        pushOff(offs, setStyleValue(element, name, styleValue));
      });
      continue;
    }

    if (kind === 'children') {
      insertOptionsChildren(element, value);
      continue;
    }

    if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
      continue;
    }

    if (key === 'mountable') {
      mountableAt(element, value);
      continue;
    }

    pushOff(offs, setAttr(element, key, value));
  }

  return offs.length > 0 ? () => offs.forEach((off) => off()) : null;
}

/**
 * 元素通道的样式写：直接复用核心的 `applyInlineStyle`（`--x` 走 setProperty、其余按
 * camelCase 索引写），不另写一套样式语义。
 */
function setStyleValue(element, name, value) {
  const write = (next) => applyInlineStyle(element, name, next);
  const handle = liveHandle(value);
  if (!handle) {
    write(value);
    return null;
  }

  write(handle.value);
  return handle.subscribe(write);
}

/**
 * `options.children` 的元素通道落位：通用路径里 options 先应用 → 内容在**结构之前**。
 * 只处理元素通道能承载的值（字符串 / 数字 / DOM 节点 / 视图节点 / 数组）；其余报错不静默。
 */
function insertOptionsChildren(element, value) {
  const insert = (item) => {
    if (item === null || item === undefined || item === false) {
      return;
    }
    if (Array.isArray(item)) {
      item.forEach(insert);
      return;
    }
    if (typeof item === 'string' || typeof item === 'number') {
      element.insertBefore(element.ownerDocument.createTextNode(String(item)), element.firstChild);
      return;
    }
    if (item instanceof ViewNode) {
      element.insertBefore(item.renderDom(), element.firstChild);
      return;
    }
    if (item.nodeType) {
      element.insertBefore(item, element.firstChild);
      return;
    }
    throw new TypeError(
      `compiled options.children received ${typeof item}: pass a string / number / node value`
    );
  };
  insert(value);
}

/**
 * `mountable(值)` 的元素通道实现（票 43 的操作识别）：元素留在片段里，只在"在场 / 离场"之间切换。
 *
 * 边界（下一个静态兄弟）在**首次应用之前**捕获——反复切换才能回到原位，而不是append 到末尾；
 * 值可以是句柄（订阅）或普通布尔（写一次）。
 */
export function mountableAt(element, value) {
  const boundary = element.nextSibling;
  const parent = element.parentNode;
  const apply = (on) => {
    element.__yoyaMounted = Boolean(on);
    // 由列表管理的行（keyedRows）：位置由列表统一摆放，自己动 DOM 会把顺序弄错
    if (element.__yoyaListManaged) {
      element.__yoyaOnMount?.();
      return;
    }
    const owner = parent ?? element.parentNode;
    if (!owner) {
      return;
    }
    if (on) {
      if (element.parentNode !== owner) {
        owner.insertBefore(element, boundary);
      }
    } else {
      element.remove();
    }
  };

  const handle = liveHandle(value);
  if (!handle) {
    apply(Boolean(value));
    return null;
  }
  apply(Boolean(handle.value));
  return handle.subscribe((next) => apply(Boolean(next)));
}

/** 句柄 / 常量 → 数组（列表数据源）。 */
function asList(value) {
  if (isSignal(value)) {
    return value.value ?? [];
  }
  return value ?? [];
}

/**
 * `keyed(source, keyOf, rowFactory)` 的元素通道实现（票 03）。
 *
 * 行对账复用 `createElementList`（复用 / 原位重建 / 离场销毁 / 最小搬动）；数据源是句柄时订阅变化；
 * 行的条件挂载（`mountableAt`）只翻状态，**位置由这里统一摆放**（离场摘出、回场回到原位）。
 * 返回退订函数，供生成代码的 `pushOff` 收归节点。
 */
export function keyedRows(container, keyOf, source, build) {
  // 两参形式（`keyed(source, build)`）的键口径**照抄核心**：keySet 源用容器自己的
  // `keyOf(item.data)`（键是数据自己的键），信号源按行身份（对象键 → 不写 `data-row-key`）。
  const keyFn = keyOf ?? (isKeySet(source) ? (item) => source.keyOf(item.data) : (row) => row);
  const list = createElementList(container, keyFn);
  const products = new Map();
  let rows = [];

  const place = () => {
    let cursor = 0;
    rows.forEach((row) => {
      if (row.isMounted()) {
        const target = container.childNodes[cursor] ?? null;
        if (target !== row.el) {
          container.insertBefore(row.el, target);
        }
        cursor += 1;
      } else if (row.el.parentNode === container) {
        row.el.remove();
      }
    });
  };

  const buildRow = (data) => {
    const product = build(data);
    product.el.__yoyaListManaged = true;
    product.el.__yoyaOnMount = place;
    // 键镜像：与核心 `keyed` 的**节点行**同一条规则（键是字符串 / 数字才写）——通用路径里行是
    // ViewNode，`keyed` 会给它挂 `data-row-key`，编译产物少一个属性就等于少一个可观察差异；
    // `keySet` 的行是 KeyItem（对象），照写会得到 "[object Object]"，所以按类型分支。
    const key = keyFn(data);
    if (
      (typeof key === 'string' || typeof key === 'number') &&
      !product.el.hasAttribute('data-row-key')
    ) {
      product.el.setAttribute('data-row-key', String(key));
    }
    products.set(product.el, product);
    return product;
  };

  const sync = (next) => {
    list.sync(asList(next), buildRow);
    rows = list
      .elements()
      .map((element) => products.get(element))
      .filter(Boolean);
    place();
  };

  // keySet 源：`.value` 是 KeyItem 数组，读取本身可追踪（核心也是这么订阅的）——包一层 `computed`
  // 就能跟着 `replaceAll` / `remove` 走；keySet 先判，别把它当成信号。
  const handle = isKeySet(source)
    ? computed(() => source.value)
    : isSignal(source)
      ? source
      : typeof source === 'function'
        ? computed(source)
        : null;
  if (!handle) {
    sync(source);
    return () => list.destroy();
  }
  sync(handle.value);
  const off = handle.subscribe((next) => sync(next));
  return () => {
    off?.();
    list.destroy();
  };
}

/**
 * 链接组件的运行期入口（生成代码调用它）。
 *
 * 注册表条目 `{ hash, bind(root, values) → destroy|null, render(...values) → ViewNode }`：
 * - 版本哈希一致、且 `bind` 的形状校验通过 → 用嵌入的片段 + 位置写，返回退订函数；
 * - 哈希不符、形状不符、条目缺失 → 走**通用路径回落**（`render` 用原组件重建 DOM 替换占位），
 *   绝不留下「片段与数据不符」的静默错误；连原组件都拿不到时抛出可定位的错误。
 */
export function bindComponent(entry, slot, values = [], expectedHash = null, options = null) {
  if (
    entry &&
    typeof entry.bind === 'function' &&
    (expectedHash === null || entry.hash === expectedHash)
  ) {
    const dispose = entry.bind(slot, values, options);
    if (typeof dispose === 'function') {
      return dispose;
    }
  }

  if (entry && typeof entry.render === 'function') {
    let node = entry.render(...values);
    // 形态 B 的组件对象：render() 才拿得到视图
    if (node && typeof node.render === 'function' && typeof node.renderDom !== 'function') {
      node = node.render();
    }
    const element = typeof node?.renderDom === 'function' ? node.renderDom() : node;
    if (slot && element && slot.parentNode) {
      slot.replaceWith(element);
    }
    return typeof node?.destroy === 'function' ? () => node.destroy() : () => {};
  }

  throw new Error(
    'yoya-ui: the compiled component is missing from the component registry ' +
      '(重新生成组件注册表，或让调用方回落通用路径)'
  );
}

/**
 * 最长递增子序列（返回下标）：位置本来就单调的行原地不动，只搬真正换位的行。
 * 没有它，交换相隔很远的两行会把中间所有行重插一遍（票 39 实测 +247%~+561%）。
 */
function longestIncreasingSubsequence(values) {
  const predecessors = new Array(values.length).fill(-1);
  const tails = [];

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value < 0) {
      continue; // 新行 / 重建行：必然要摆位，不参与子序列
    }

    let low = 0;
    let high = tails.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (values[tails[middle]] < value) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }

    if (low > 0) {
      predecessors[index] = tails[low - 1];
    }
    tails[low] = index;
  }

  const result = [];
  let cursor = tails.length > 0 ? tails[tails.length - 1] : -1;
  while (cursor !== -1) {
    result.push(cursor);
    cursor = predecessors[cursor];
  }
  return result.reverse();
}

/**
 * 元素模式的行对账：元素数组 + key → 位置索引，复用 / 原位重建 / 摘除 / 最小 `insertBefore`，
 * 默认**不往元素上写键镜像属性**（官方基准要求行 DOM 与参考实现逐字节一致，票 18 / C8）；
 * 需要按 key 定位行时传 `{ keyAttribute: 'data-row-key' }`。其余可观察行为对齐 `keyed`：
 * 同 key 同数据引用复用，同 key 换引用原位重建，离场 key 销毁并摘除。
 */
export function createElementList(container, keyOf, options = {}) {
  // 键镜像属性默认**不写**：官方基准要求行 DOM 与参考实现一致（票 18 / C8），
  // 需要按 key 定位行时（DevTools / 排查对账）显式传 `keyAttribute: 'data-row-key'` 打开。
  const keyAttribute = options.keyAttribute ?? null;
  let rows = [];
  let indexes = new Map();

  const destroyRows = () => {
    rows.forEach((row) => row?.destroy?.());
    rows = [];
    indexes = new Map();
  };

  /** 数据 → 元素：与 keyed 同口径的最小搬动。 */
  const sync = (nextData, build) => {
    const nextIndexes = new Map();
    nextData.forEach((data, index) => {
      const key = keyOf(data);
      if (nextIndexes.has(key)) {
        throw new TypeError(`compiled list duplicate key: ${String(key)}`);
      }
      nextIndexes.set(key, index);
    });

    const nextRows = new Array(nextData.length);
    nextData.forEach((data, index) => {
      const key = keyOf(data);
      const previous = indexes.get(key);
      const current = previous === undefined ? undefined : rows[previous];

      if (current && current.data === data) {
        nextRows[index] = current;
        return;
      }

      current?.destroy?.();
      const row = build(data);
      // 同 key 换了行引用 → 旧元素必须摘掉：`destroy()` 只退订，不搬 DOM（元素行的搬家归容器），
      // 留着就是同一 key 两个元素。
      if (current && current.el !== row.el && current.el.parentNode === container) {
        container.removeChild(current.el);
      }
      row.data = data;
      if (keyAttribute !== null) {
        row.el.setAttribute(keyAttribute, String(key));
      }
      nextRows[index] = row;
    });

    rows.forEach((row) => {
      if (row && !nextIndexes.has(keyOf(row.data))) {
        row.destroy?.();
        if (row.el.parentNode === container) {
          container.removeChild(row.el);
        }
      }
    });

    // 位置本来就单调（只删不改序，最常见）→ 一行都不用搬，省掉 LIS
    const positions = nextData.map((data, index) => {
      const previous = indexes.get(keyOf(data));
      if (previous === undefined || nextRows[index] !== rows[previous]) {
        return -1;
      }
      return previous;
    });

    let increasing = true;
    for (let index = 0; index < positions.length; index += 1) {
      if (positions[index] < 0 || (index > 0 && positions[index] < positions[index - 1])) {
        increasing = false;
        break;
      }
    }
    const keep = increasing
      ? { has: () => true }
      : new Set(longestIncreasingSubsequence(positions));

    let anchor = null;
    for (let index = nextRows.length - 1; index >= 0; index -= 1) {
      const element = nextRows[index].el;
      if (
        element.parentNode !== container ||
        (!keep.has(index) && element.nextSibling !== anchor)
      ) {
        container.insertBefore(element, anchor);
      }
      anchor = element;
    }

    rows = nextRows;
    indexes = nextIndexes;
  };

  return {
    get size() {
      return rows.length;
    },
    sync,
    data: () => rows.map((row) => row.data),
    elements: () => rows.map((row) => row.el),
    destroy() {
      destroyRows();
      container.replaceChildren();
    }
  };
}
