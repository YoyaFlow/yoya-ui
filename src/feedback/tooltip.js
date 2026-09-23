import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { div, span } from '../html/index.js';
import { allocateId } from '../core/id.js';
import { createComponentShortcut, setupContentSlot } from '../components/shared.js';

const tooltipPlacementAliases = {
  'bottom-left': 'bottom-start',
  bottomLeft: 'bottom-start',
  'bottom-right': 'bottom-end',
  bottomRight: 'bottom-end',
  'left-bottom': 'left-end',
  leftBottom: 'left-end',
  'left-top': 'left-start',
  leftTop: 'left-start',
  'right-bottom': 'right-end',
  rightBottom: 'right-end',
  'right-top': 'right-start',
  rightTop: 'right-start',
  'top-left': 'top-start',
  topLeft: 'top-start',
  'top-right': 'top-end',
  topRight: 'top-end'
};

const tooltipTriggers = ['click', 'focus', 'manual'];

/** Esc 之后把焦点还给目标区里第一个可聚焦元素（迁移前 `_focusTarget` 的选择器）。 */
const focusableSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * 文字提示（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * 判据 ②（16 号第 96 条）：这个组件要的是**元素级交互 + 文档级监听的生命周期**（悬停 / 聚焦 / 点击
 * 三种触发、打开期间挂 `document` 的"点外面关掉"与 Esc）——闭包 + `whenDestroy` 就够，**不需要类**：
 *
 * - 状态（`open` / `placement` / `trigger`）都在闭包里：根上的 `data-open` / `data-placement` /
 *   `data-trigger` 与面板的 `aria-hidden` 全是读值绑定（R4 / R6），命令只写状态；
 * - 面板定位按 `data-placement` 交给 CSS 规则（R5，JS 不写行内 placement 样式）；
 * - **目标区 / 内容位各保留一个取用器**（`target(setup)` / `content(setup)`，运行期可替换，
 *   见 16 号第 103 条）——与 `VAnchorItem` 的子列表同口径：要装多个子节点时才留取用器；
 * - 元素级行为就地绑在目标区上（`box.on(…)`），文档级监听在 `whenDestroy` 里释放；
 * - props 进参数表、`...rest` 摊进根元素工厂；位置参数的字符串 / 数字 = 目标区
 *   （迁移前 `_setupTooltip` 的兜底分支同口径）。
 */
export function VTooltip({ children, content, open, placement, target, trigger, ...rest } = {}) {
  // 状态是句柄原样 / 普通值包 ref，归一放在读时的派生上（R9）
  const placementState = asSignal(placement);
  const triggerState = asSignal(trigger);
  const openState = ref(false);
  const panelId = allocateId('yoya-tooltip-panel');

  const placementValue = computed(() => {
    const requested = placementState.value || 'top';
    return tooltipPlacementAliases[requested] || requested;
  });
  const triggerValue = computed(() => {
    const next = String(triggerState.value || 'hover');
    return tooltipTriggers.includes(next) ? next : 'hover';
  });

  let view = null; // 视图根
  let targetBox = null; // 目标区（取用器）
  let globalCloseCleanup = null;

  return vNode((api) => {
    const focusTarget = () => {
      const element = targetBox?._el;
      const focusable = element?.querySelector?.(focusableSelector);

      (focusable || element)?.focus?.();
    };

    const handlePointer = (event) => {
      if (!view?._el?.contains(event.target)) {
        api.close();
      }
    };

    const handleKey = (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      const shouldRestoreFocus = Boolean(view?._el?.contains(event.target));
      api.close();

      if (shouldRestoreFocus) {
        focusTarget();
      }
    };

    /** 打开期间才挂文档级监听：点击（仅 click 触发）与 Esc。 */
    const bindGlobalClose = () => {
      if (globalCloseCleanup) {
        return;
      }

      let clickBound = false;
      let unbindPointer = () => {};

      if (triggerValue.value === 'click') {
        unbindPointer = bindDocumentEvent('click', handlePointer);
        clickBound = true;
      }

      const unbindKey = bindDocumentEvent('keydown', handleKey);

      globalCloseCleanup = () => {
        if (clickBound) {
          unbindPointer();
        }
        unbindKey();
        globalCloseCleanup = null;
      };
    };

    const releaseGlobalClose = () => {
      globalCloseCleanup?.();
    };

    api.placement = (value) => {
      if (value === undefined) {
        return placementValue.value;
      }

      placementState.value = value;
      return api;
    };

    api.trigger = (value) => {
      if (value === undefined) {
        return triggerValue.value;
      }

      triggerState.value = value;
      return api;
    };

    api.open = (value = true) => {
      const enabled = Boolean(value);

      openState.value = enabled;

      if (enabled) {
        bindGlobalClose();
      } else {
        releaseGlobalClose();
      }

      return api;
    };

    api.close = () => api.open(false);
    api.toggle = () => api.open(!openState.value);

    /** 位置参数：字符串 / 数字 = 目标区（迁移前 `_setupTooltip` 的兜底分支同口径）。 */
    api.setupString = (value) => api.target(value);

    api.whenDestroy = () => {
      api.close();
    };

    if (placement !== undefined) {
      api.placement(placement);
    }

    if (trigger !== undefined) {
      api.trigger(trigger);
    }

    const initialTarget = target ?? children;

    // 结构（R2）：整棵树写在 return 里；状态类属性是读值绑定（R4 / R6）
    return div(
      {
        ...rest,
        'data-open': computed(() => (openState.value ? 'true' : null)),
        'data-placement': placementValue,
        'data-trigger': triggerValue,
        vn: 'VTooltip'
      },
      (root) => {
        view = root;

        root.child(
          // 目标区：悬停 / 聚焦 / 点击三种触发就地绑
          span({ attrs: { 'aria-describedby': panelId }, vn: 'VTooltipTarget' }, (box) => {
            targetBox = box;

            api.target = (value) => {
              if (value === undefined) {
                return box;
              }

              setupContentSlot(box, value);
              return api;
            };

            box.on('mouseenter', () => {
              if (triggerValue.value === 'hover') {
                api.open(true);
              }
            });
            box.on('mouseleave', () => {
              if (triggerValue.value === 'hover') {
                api.close();
              }
            });
            box.on('focusin', () => {
              if (triggerValue.value === 'hover' || triggerValue.value === 'focus') {
                api.open(true);
              }
            });
            box.on('focusout', (event) => {
              if (triggerValue.value !== 'hover' && triggerValue.value !== 'focus') {
                return;
              }

              if (event.relatedTarget && box._el?.contains(event.relatedTarget)) {
                return;
              }

              api.close();
            });
            box.on('click', () => {
              if (triggerValue.value === 'click') {
                api.toggle();
              }
            });

            if (initialTarget !== undefined) {
              api.target(initialTarget);
            }
          }),

          // 面板：定位走 `data-placement` 规则；`aria-hidden` 跟着开合状态
          div(
            {
              attrs: {
                'aria-hidden': computed(() => (openState.value ? 'false' : 'true')),
                role: 'tooltip'
              },
              id: panelId,
              vn: 'VTooltipPanel'
            },
            (box) => {
              api.content = (value) => {
                if (value === undefined) {
                  return box.children();
                }

                setupContentSlot(box, value);
                return api;
              };

              if (content !== undefined) {
                api.content(content);
              }
            }
          )
        );

        if (open !== undefined) {
          api.open(open);
        }
      }
    );
  });
}

export const vTooltip = createComponentShortcut(VTooltip, { props: true });
