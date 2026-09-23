/**
 * DOM 访问门禁（**只减不增**）：组件代码不许为了"判定落地 / 量测 / 取元素"去调 `renderDom()`。
 *
 * `renderDom()` 是**构建**入口：没落地时它会把 DOM 建出来（SSR 路径里还会碰 `document`），
 * 所以组件侧只允许这三种写法：
 *
 * 1. **判定落地**：只读 `_el`（`if (!node._el) return`，票 16 第 21 条的口径）；
 * 2. **量测**：从事件拿元素（`event.currentTarget`，见 `rate` 的星标点击），或只读已经落地的 `_el`
 *    （`color-picker` / `cascader` 的 `positionPanel()` 是样板）；
 * 3. **真要拿自己的元素做"真实的事"**：挂 `IntersectionObserver`、焦点陷阱、派发 DOM 事件、
 *    把菜单挂到 `document.body` 这类**树外挂载**——留一条豁免，就是下面这份清单（只减不增）。
 *
 * 引擎自身（`src/core/**`）不扫：`renderDom()` 的实现与引擎内部调用归节点引擎。
 * 新增一处要么改写法，要么在清单里**写明理由**再加一行——门禁逼着做选择。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const libraryDirs = [
  'src/html',
  'src/svg',
  'src/layout',
  'src/actions',
  'src/navigation',
  'src/feedback',
  'src/form',
  'src/data-display',
  'src/chart',
  'src/three',
  'src/async',
  'src/i18n',
  'src/router',
  'src/theme',
  'src/components',
  'src/effects'
];

/** 恰好等于调用形态 `xxx.renderDom()`（定义 `renderDom() {` 与 `super.renderDom()` 都不算）。 */
const callPattern = /(?<!super)\.renderDom\s*\(\s*\)/g;

/**
 * 豁免清单（每个文件都写清"为什么必须要真元素"；**只减不增**）：
 * - `button` / `tabs`：把焦点交给真元素；
 * - `lazy-image`：`IntersectionObserver` 观察自己的元素；
 * - `carousel`：在自己的根上派发 DOM `change` 事件；
 * - `menu`：把事件目标与各项元素比对（找出被点的是哪一项）；
 * - `message-manager` / `theme-shell`：`renderDom()` **覆盖**里转发给真正的视图根；
 * - `vconfirm`：焦点陷阱需要真元素；
 * - `router`：溢出弹窗 / 标题右键菜单**挂到树外**（`document.body`）并量测（票 16 第 97 条的量测豁免）。
 */
const baseline = {
  'src/actions/button.js': 1,
  'src/async/lazy-image.js': 1,
  'src/data-display/carousel.js': 1,
  'src/feedback/message-manager.js': 1,
  'src/feedback/vconfirm.js': 1,
  'src/layout/theme-shell.js': 1,
  'src/navigation/menu.js': 2,
  'src/navigation/tabs.js': 2,
  'src/router/router.js': 9
};

function listJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listJsFiles(full));
    } else if (entry.endsWith('.js') && !entry.endsWith('.test.js')) {
      out.push(full);
    }
  }
  return out;
}

function renderDomCallCounts() {
  const counts = {};

  for (const dir of libraryDirs) {
    for (const file of listJsFiles(resolve(dir))) {
      const source = readFileSync(file, 'utf8');
      const count = source.match(callPattern)?.length ?? 0;

      if (count > 0) {
        counts[file.replaceAll('\\', '/').replace(`${resolve('.').replaceAll('\\', '/')}/`, '')] =
          count;
      }
    }
  }

  return counts;
}

describe('renderDom() usage gate', () => {
  it('keeps component-side renderDom() calls on the documented allow-list (only-decrease)', () => {
    const actual = renderDomCallCounts();

    const grown = Object.entries(actual).filter(([file, count]) => count > (baseline[file] ?? 0));
    expect(
      grown,
      `组件侧多出了 renderDom() 调用（判定落地读 \`_el\`、量测从事件拿元素；` +
        `真要拿真元素做真实的事才写豁免并注明理由）：${grown.map(([file, count]) => `${file}(${count})`).join(', ')}`
    ).toEqual([]);
  });
});
