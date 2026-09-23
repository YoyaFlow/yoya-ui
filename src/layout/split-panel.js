import { registerChildFactories } from '../core/node.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { div, HtmlElementNode } from '../html/index.js';
import {
  createComponentShortcut,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

/**
 * 可拖拽分隔条的面板（票 15 §4；2026-09-23 按 **B 形态**重写）。
 *
 * - **结构一次写清**：`div[VSplitPanel] > div[VSplitPanelFirst] + div[VSplitPanelDivider] +
 *   div[VSplitPanelSecond]`；状态（`direction` / `size` / `minSize`）在闭包里，命令与内容投递
 *   （`first` / `second`）写在**各自部件的构建回调里**（回调参数就是那个部件，外面不留部件变量）；
 * - **R5**：静态样式与"按方向走的几何"都在 `yoya.ui.css`——方向走根上的 `data-direction`、
 *   首面板尺寸走 `--yoya-split-first-size`（JS 只写状态与这一个变量）、分隔条悬停走 `:hover` 规则；
 * - **元素级行为就地绑**：分隔条上的 `mousedown` / `dblclick` / `keydown` 在结构里绑；
 *   拖拽期间的文档级监听用 `bindDocumentEvent`，`whenDestroy` 时收口（幂等）；
 * - 位置参数里的字符串 / 数字 = 首面板内容（迁移前 `_setupSplitPanel` 的兜底分支）。
 */

export function VSplitPanel({
  direction = 'horizontal',
  first,
  minSize = 40,
  second,
  size = '50%',
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // props 全是数据：句柄原样收下，归一放在读时的 `computed`
  const directionState = asSignal(direction);
  const sizeState = asSignal(size);
  const minSizeState = asSignal(minSize);

  const directionValue = computed(() =>
    directionState.value === 'vertical' ? 'vertical' : 'horizontal'
  );
  const sizeValue = computed(() => normalizeLength(sizeState.value));
  const minSizeValue = computed(() => {
    const parsed = Number(minSizeState.value);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 40;
  });
  const verticalAttr = computed(() => (directionValue.value === 'vertical' ? 'vertical' : null));
  const orientationAttr = computed(() => directionValue.value);

  /** 拖拽会话（内部状态，不进视图）：文档级监听在 `whenDestroy` 收口。 */
  let drag = null;
  let unbindMove = null;
  let unbindUp = null;

  let firstBox = null;

  return vNode((api, self) => {
    /** 容器当前尺寸（拖拽 / 键盘调整都要量，方向决定量哪个轴）。 */
    const containerSize = () => {
      // 量测只读已经落地的元素（`_el`）：不为了量一次就提前 `renderDom()` 把 DOM 建出来
      const element = self.node()._el;

      if (!element) {
        return 0;
      }

      return directionValue.value === 'horizontal' ? element.offsetWidth : element.offsetHeight;
    };

    /** 首面板尺寸写回状态（px 取整；clamp 到 `minSize` 与"容器 - minSize"之间）。 */
    const applySize = (next) => {
      sizeState.value = `${Math.round(clampSize(next, minSizeValue.value, containerSize() - minSizeValue.value))}px`;
    };

    const endDrag = () => {
      unbindMove?.();
      unbindUp?.();
      unbindMove = null;
      unbindUp = null;
      drag = null;
    };

    const onDrag = (event) => {
      if (!drag) {
        return;
      }

      const horizontal = directionValue.value === 'horizontal';
      const delta = (horizontal ? event.clientX : event.clientY) - drag.start;

      applySize(drag.startSize + delta);
    };

    const startDrag = (event) => {
      const element = self.node()._el;
      const firstElement = firstBox?._el;

      if (event.button !== 0 || !element || !firstElement) {
        return;
      }

      event.preventDefault();
      const horizontal = directionValue.value === 'horizontal';
      const rect = firstElement.getBoundingClientRect();

      drag = {
        containerSize: horizontal ? element.offsetWidth : element.offsetHeight,
        start: horizontal ? event.clientX : event.clientY,
        startSize: horizontal ? rect.width : rect.height
      };
      unbindMove = bindDocumentEvent('mousemove', onDrag);
      unbindUp = bindDocumentEvent('mouseup', endDrag);
    };

    const handleKeydown = (event) => {
      const delta =
        event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -16
          : event.key === 'ArrowRight' || event.key === 'ArrowDown'
            ? 16
            : 0;

      // 落地判定只读 `_el`（不要为了"建没建"去 `renderDom()` 把 DOM 建出来）
      if (!delta || !self.node()._el) {
        return;
      }

      event.preventDefault();
      applySize((Number.parseFloat(sizeValue.value) || 0) + delta);
    };

    api.direction = (value) => {
      if (value === undefined) {
        return directionValue.value;
      }

      directionState.value = value;
      return api;
    };

    api.size = (value) => {
      if (value === undefined) {
        return sizeValue.value;
      }

      sizeState.value = value;
      return api;
    };

    api.minSize = (value) => {
      if (value === undefined) {
        return minSizeValue.value;
      }

      minSizeState.value = value;
      return api;
    };

    api.reset = () => api.size('50%');

    api.whenDestroy = () => {
      endDrag();
    };

    // 位置参数里的字符串 / 数字 = 首面板内容（迁移前 `_setupSplitPanel` 的兜底分支）
    api.setupString = (value) => {
      api.first(value);
      return api;
    };

    return div(
      {
        ...elementConfig,
        attrs: { ...restAttrs },
        'data-direction': verticalAttr,
        vn: 'VSplitPanel'
      },
      (root) =>
        root.child(
          // 首面板：`first(setup)` 投递内容（无参 = 清空，与迁移前的写方法口径一致）
          div(
            {
              'data-vsplit-first': 'true',
              style: { '--yoya-split-first-size': sizeValue },
              vn: 'VSplitPanelFirst'
            },
            (box) => {
              firstBox = box;
              api.first = (setup) => {
                deliverContent(box, setup);
                return api;
              };

              if (first !== undefined) {
                api.first(first);
              }
            }
          ),

          // 分隔条：元素级行为就地绑（拖拽 / 双击复位 / 键盘微调）
          div(
            {
              attrs: {
                'aria-orientation': orientationAttr,
                role: 'separator',
                tabindex: '0',
                title: '拖拽调整面板大小，双击恢复 50%'
              },
              'data-vsplit-divider': 'true',
              vn: 'VSplitPanelDivider'
            },
            (divider) => {
              divider.on('mousedown', (event) => startDrag(event));
              divider.on('dblclick', () => api.reset());
              divider.on('keydown', (event) => handleKeydown(event));
            }
          ),

          // 次面板：`second(setup)` 投递内容（同上）
          div(
            {
              'data-vsplit-second': 'true',
              vn: 'VSplitPanelSecond'
            },
            (box) => {
              api.second = (setup) => {
                deliverContent(box, setup);
                return api;
              };

              if (second !== undefined) {
                api.second(second);
              }
            }
          )
        )
    );
  });
}

export const vSplitPanel = createComponentShortcut(VSplitPanel, { props: true });

registerChildFactories(HtmlElementNode, { vSplitPanel });

/** 面板内容投递（无参 / `null` = 清空，与迁移前的写方法口径一致）。 */
function deliverContent(box, setup) {
  replaceChildren(box, []);

  if (typeof setup === 'function') {
    setup(box);
    return;
  }

  replaceChildren(box, normalizeChildren(setup));
}

function normalizeLength(value) {
  return typeof value === 'number' ? `${value}px` : value;
}

function clampSize(value, min, max) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), Math.max(max, min));
}
