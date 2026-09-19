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
import { VTextNode, appendNodeChild, applyAttribute } from '../core/node.js';
import { computed, isSignal } from '../core/signals/handle.js';

export { appendNodeChild };

const templates = new Map();

/** 每个形状一份 template；`firstElementChild` 是片段根。 */
export function cloneFragment(html) {
  let template = templates.get(html);
  if (!template) {
    template = document.createElement('template');
    template.innerHTML = html;
    templates.set(html, template);
  }
  return template.content.firstElementChild.cloneNode(true);
}

/** 位置寻址接管（节点模式）：节点对象只承担绑定 / 事件，DOM 用片段里那一份。 */
export function adopt(node, element, textNodes = []) {
  node._el = element;

  if (textNodes.length > 0) {
    const textChildren = (node._children ?? []).filter((child) => child instanceof VTextNode);
    textNodes.forEach((dom, index) => {
      const textChild = textChildren[index];
      if (textChild && dom) {
        textChild._textNode = dom;
        textChild._el = dom;
      }
    });
  }

  node._applyBindingsToElement(false);
  node.renderDom();
  return node;
}

/** 文本位置（节点模式）：句柄 → 建绑定并接管既有文本节点；普通值 → 直接写。 */
export function bindChild(node, textNode, value) {
  if (isSignal(value)) {
    node.child(value);
    const textChild = node._children[node._children.length - 1];
    textChild._textNode = textNode;
    textChild._el = textNode;
    return;
  }

  textNode.textContent = value === null || value === undefined ? '' : String(value);
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

/** 文本位置（元素模式）：活值订阅后就地写，普通值写一次；返回退订函数（普通值返回 null）。 */
export function bindText(element, value) {
  const handle = liveHandle(value);
  if (!handle) {
    writeText(element, value);
    return null;
  }

  writeText(element, handle.value);
  return handle.subscribe((next) => writeText(element, next));
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
 * `data-row-key` 直接写在元素上。可观察行为对齐 `keyed`：同 key 同数据引用复用，
 * 同 key 换引用原位重建，离场 key 销毁并摘除。
 */
export function createElementList(container, keyOf) {
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
      row.data = data;
      row.el.setAttribute('data-row-key', String(key));
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
