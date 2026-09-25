import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { VMenu } from '../navigation/menu.js';
import { div } from '../html/index.js';
import { vButton } from './button.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { allocateId } from '../core/id.js';
import {
  applyComponentSetup,
  createComponentShortcut,
  delegateNodeCommands,
  elementHasIdentity,
  setupButtonSlot
} from '../components/shared.js';

/**
 * 下拉菜单（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * 判据 ②（16 号第 96 条）：要的是**元素级交互 + 文档级监听的生命周期**（触发器点击 / 键盘、
 * 打开期间挂"点外面关掉"与 Esc）——闭包 + `whenDestroy` 就够，`DropdownMenuNode` 那层节点类型退场：
 *
 * - 状态（`open` / `placement` / `closeOnSelect`）在闭包里，根 `data-open` / `data-placement`、
 *   触发器的 `aria-expanded`、面板的 `aria-hidden` 全是读值绑定（R4 / R6），命令只写状态；
 * - 面板定位按 `data-placement` 交给 CSS 规则（R5，JS 不写行内 placement 样式）；
 * - **触发器 / 内层菜单各留一个取用器**（`trigger(setup)` / `menuContent(setup)`，运行期可替换，
 *   见 16 号第 103 条）；内层菜单用菜单族的 `vMenu`（组件，内容走它的 `replaceContent`），
 *   聚焦走它的**公开命令** `enabledItems()`
 *   （不再读私有方法，见 16 号第 27 条）；
 * - props 进参数表、`...rest` 摊进根元素工厂；位置参数的字符串 / 数字 = 触发器文案
 *   （迁移前 `_setupDropdownMenu` 的兜底分支同口径）。
 */
export function VDropdownMenu({
  children,
  closeOnSelect,
  content,
  label,
  menu,
  menuContent,
  open,
  placement,
  text,
  trigger,
  ...rest
} = {}) {
  // 状态是句柄原样 / 普通值包 ref，归一放在读时的派生上（R9）
  const openState = ref(false);
  const closeOnSelectState = asSignal(closeOnSelect);
  const placementState = asSignal(placement);
  const panelId = allocateId('yoya-dropdown-panel');

  const placementValue = computed(() => placementState.value || 'bottom-start');
  const closeOnSelectValue = computed(() =>
    closeOnSelectState.value === undefined ? true : Boolean(closeOnSelectState.value)
  );

  let globalCloseCleanup = null;
  let menuBox = null;
  let triggerBox = null;
  let view = null;

  return vNode((api) => {
    const releaseGlobalClose = () => {
      globalCloseCleanup?.();
    };

    /** 打开期间才挂文档级监听：点外面 / Esc（Esc 之后把焦点还给触发器）。 */
    const bindGlobalClose = () => {
      if (globalCloseCleanup) {
        return;
      }

      const handlePointer = (event) => {
        if (!view?.owns(event.target)) {
          api.close();
        }
      };
      const handleKey = (event) => {
        if (event.key !== 'Escape') {
          return;
        }

        const shouldRestoreFocus = Boolean(view?.owns(event.target));
        api.close();

        if (shouldRestoreFocus) {
          triggerBox?.focus?.();
        }
      };

      const unbindPointer = bindDocumentEvent('click', handlePointer);
      const unbindKey = bindDocumentEvent('keydown', handleKey);

      globalCloseCleanup = () => {
        unbindPointer();
        unbindKey();
        globalCloseCleanup = null;
      };
    };

    const focusItem = (fromEnd) => {
      const items = menuBox?.enabledItems?.() ?? [];
      const item = fromEnd ? items[items.length - 1] : items[0];

      item?.focus?.();
    };

    api.trigger = (setup) => {
      if (setup === undefined) {
        return triggerBox;
      }

      setupButtonSlot(triggerBox, setup);
      return api;
    };

    api.menuContent = (setup) => {
      if (setup === undefined) {
        return menuBox;
      }

      // 替换语义（迁移前 `setupContentSlot`）：菜单是组件了，内容走它自己的内容命令
      menuBox.replaceContent(setup);
      return api;
    };

    api.placement = (value) => {
      if (value === undefined) {
        return placementValue.value;
      }

      placementState.value = value;
      return api;
    };

    /** 选中即关：写方法（无参 = 开，与迁移前同口径）。 */
    api.closeOnSelect = (value = true) => {
      closeOnSelectState.value = Boolean(value);
      return api;
    };

    api.open = (value = true) => {
      const enabled = Boolean(value);

      openState.value = enabled;

      if (enabled) {
        bindGlobalClose();
        focusItem(false);
      } else {
        releaseGlobalClose();
      }

      return api;
    };

    api.close = () => api.open(false);
    api.toggle = () => api.open(!openState.value);

    /** 位置参数：字符串 / 数字 = 触发器文案（迁移前 `_setupDropdownMenu` 的兜底分支同口径）。 */
    api.setupString = (value) => api.trigger(value);

    api.whenDestroy = () => {
      api.close();
    };

    // 结构（R2）：整棵树写在 return 里；状态类属性是读值绑定（R4 / R6）
    view = div(
      {
        ...rest,
        'data-open': computed(() => (openState.value ? 'true' : null)),
        'data-placement': placementValue,
        vn: 'VDropdownMenu'
      },
      (root) => {
        triggerBox = vButton('操作')
          .setup({ vn: 'VDropdownTrigger VButton' })
          .attr({
            'aria-controls': panelId,
            'aria-expanded': computed(() => (openState.value ? 'true' : 'false')),
            'aria-haspopup': 'menu'
          })
          .on('click', (event) => {
            event.preventDefault();
            // 触发钮禁用态以 DOM 属性为准（票 01 后 VButton 状态走内部 ref）
            if (!triggerBox.attr('disabled')) {
              api.toggle();
            }
          })
          .on('keydown', (event) => {
            if (triggerBox.attr('disabled')) {
              return;
            }

            if (!['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Spacebar'].includes(event.key)) {
              return;
            }

            event.preventDefault();
            api.open();

            if (event.key === 'ArrowUp') {
              focusItem(true);
            }
          });

        menuBox = applyComponentSetup(VMenu(), { vn: 'VDropdownContent VMenu' });
        menuBox.on('click', (event) => {
          const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');

          if (
            closeOnSelectValue.value &&
            menuItem &&
            !menuItem.disabled &&
            !elementHasIdentity(menuItem, 'VSubMenuTrigger')
          ) {
            api.close();
            triggerBox.focus?.();
          }
        });

        root.child(
          triggerBox,
          div(
            {
              attrs: { 'aria-hidden': computed(() => (openState.value ? 'false' : 'true')) },
              id: panelId,
              vn: 'VDropdownPanel'
            },
            (panel) => panel.child(menuBox)
          )
        );

        // props：触发器 → 菜单内容 → 定位 → 选中即关 → 打开态（迁移前 `_setupDropdownMenu` 的顺序）
        const triggerSetup = trigger ?? label ?? text;
        const menuSetup = menuContent ?? menu ?? content ?? children;

        if (triggerSetup !== undefined) {
          api.trigger(triggerSetup);
        }
        if (menuSetup !== undefined) {
          api.menuContent(menuSetup);
        }
        if (placement !== undefined) {
          api.placement(placement);
        }
        if (closeOnSelect !== undefined) {
          api.closeOnSelect(closeOnSelect);
        }
        if (open !== undefined) {
          api.open(open);
        }
      }
    );

    // 元素级命令代委托（第三方仍可用 `menu.attr(…)` / `menu.on(…)`）
    delegateNodeCommands(api, view);

    return view;
  });
}

export const vDropdownMenu = createComponentShortcut(VDropdownMenu, { props: true });
