/**
 * DOM 访问门禁（**只减不增**）：组件代码不许出现 `_el`，也不许出现 `renderDom()`。
 *
 * `_el` 是引擎私有的元素字段，`renderDom()` 是**构建**入口（没落地时它会把 DOM 建出来，SSR 路径
 * 还会碰 `document`）——组件拿它们就等于绕过引擎的机制。组件碰 DOM 只有这几条口子
 * （`packages/yoya-core/src/core/node.js`，组件节点上同名委托、可被组件命令遮蔽）：
 *
 * 1. **落地判定** `isLanded()`；
 * 2. **聚焦** `focus()` / `focusFirst()`（第一个可聚焦后代）；
 * 3. **包含判定** `owns(target)`（"点外面关掉"、事件命中）；
 * 4. **property** `prop(name[, value])`（`value` / `checked` / `indeterminate` / `files` / 滚动量 …）；
 * 5. **量测** `rect()`（`getBoundingClientRect()`；偏移量走 `prop('offsetWidth')`）；
 * 6. **派发事件** `emit(type[, detail][, options])`（让用户监听器收到的原生 / 自定义事件）；
 * 7. **调原生方法** `invoke(name, …)`（`showModal` / `close` / `matches(':modal')` / `reset` /
 *    `requestSubmit` / `click` / 树外挂载后的 `remove`）；
 * 8. **换子节点** `replaceChildren(…)`（真清空 + 落新内容）/ `reorderChildren(ordered)`（按序落盘）；
 * 9. **挂载期真元素**（`ResizeObserver` / `IntersectionObserver` / 渲染器宿主 / 焦点陷阱 / `showModal`
 *    的宿主）→ `whenMount(host)` 的 `host.element()`，组件自己存句柄。
 *
 * 引擎自身（`packages/yoya-core/src/core/**`）不扫：口子与内部实现都在那里。
 *
 * **允许清单**（每个文件写清"为什么这是节点类型的元素机制、不是组件在碰 DOM"；只减不增）：
 * - `feedback/message-manager.js`：**管理器节点**（`extends ViewNode`，自己没有 DOM），
 *   `renderDom()` / `toHTML()` / `bindTo()` 转发给真正的视图根；
 * - `data-display/tree.js` 的 `SerializedIconNode`：**自绘片段**的节点类型（`renderDom` / `toHTML`
 *   自己产出 HTML，DOM 就是它的产物）。
 * 这两处都是"节点类型扩展"（票 16 第 96 / 105 条的判据 ①），不是组件写法。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const libraryDirs = [
  'packages/yoya-core/src/html',
  'packages/yoya-core/src/svg',
  'packages/yoya-ui/src/layout',
  'packages/yoya-ui/src/actions',
  'packages/yoya-ui/src/navigation',
  'packages/yoya-ui/src/feedback',
  'packages/yoya-ui/src/form',
  'packages/yoya-ui/src/data-display',
  'packages/yoya-ui/src/chart',
  'packages/yoya-ui/src/three',
  'packages/yoya-ui/src/async',
  'packages/yoya-ui/src/i18n',
  'packages/yoya-ui/src/router',
  'packages/yoya-ui/src/theme',
  'packages/yoya-ui/src/components',
  'packages/yoya-ui/src/effects'
];

/** 允许清单：文件 → 该文件允许的调用点数（**只减不增**；理由写在上面的注释里）。 */
const allowList = {
  'packages/yoya-ui/src/feedback/message-manager.js': 1,
  // `SerializedIconNode.renderDom()` 自己往 `_el` 里放 `template.content.firstElementChild`
  'packages/yoya-ui/src/data-display/tree.js': 3
};

/** 恰好等于调用形态 `xxx.renderDom()`（定义 `renderDom() {` 与 `super.renderDom()` 都不算）。 */
const renderDomPattern = /(?<!super)\.renderDom\s*\(\s*\)/g;

/** `_el` 的代码级出现（注释里写口径说明不算）。 */
const elementFieldPattern = /\._el\b/g;

/** 剥掉注释（块注释保留换行，行注释整段抹掉），免得口径说明被当成存量。 */
const codeOnly = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, (matched) => matched.replace(/[^\n]/g, ' '));

function listJsFiles(dir) {
  const out = [];

  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) {
      out.push(...listJsFiles(full));
    } else if (entry.endsWith('.js') && !entry.endsWith('.test.js') && !entry.endsWith('.min.js')) {
      out.push(full);
    }
  }

  return out;
}

function domAccessCounts() {
  const counts = {};

  for (const dir of libraryDirs) {
    for (const file of listJsFiles(resolve(dir))) {
      const relative = file
        .replaceAll('\\', '/')
        .replace(`${resolve('.').replaceAll('\\', '/')}/`, '');
      const source = codeOnly(readFileSync(file, 'utf8'));
      const elCount = (source.match(elementFieldPattern) ?? []).length;
      const renderCount = (source.match(renderDomPattern) ?? []).length;

      if (elCount > 0 || renderCount > 0) {
        counts[relative] = elCount + renderCount;
      }
    }
  }

  return counts;
}

describe('DOM 访问门禁（_el / renderDom）', () => {
  it('组件侧的 _el 与 renderDom() 调用只在允许清单里（只减不增）', () => {
    const actual = domAccessCounts();
    const offenders = Object.entries(actual).filter(
      ([file, count]) => count > (allowList[file] ?? 0)
    );

    expect(
      offenders,
      '组件侧出现 `_el` / `renderDom()`：改用引擎的元素级口子（isLanded / focus / focusFirst / ' +
        'owns / prop / rect / emit / invoke / replaceChildren / reorderChildren），挂载期要真元素就用 ' +
        'whenMount(host).element()；确实属于"节点类型扩展的元素机制"才写进允许清单并写明理由：' +
        offenders.map(([file, count]) => `${file}(${count})`).join(', ')
    ).toEqual([]);
  });
});
