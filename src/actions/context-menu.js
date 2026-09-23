import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { MenuNode } from '../navigation/menu.js';
import { div } from '../html/index.js';
import { bindDocumentEvent } from '../core/document-events.js';
import {
  createComponentShortcut,
  delegateNodeCommands,
  elementHasIdentity,
  normalizePoint,
  setupContentSlot
} from '../components/shared.js';

/**
 * 右键菜单（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * 判据 ②（16 号第 96 条）：要的是**元素级交互 + 文档级监听的生命周期**（目标区 `contextmenu`、
 * 打开期间挂"点外面关掉"与 Esc）——闭包 + `whenDestroy` 就够，`ContextMenuNode` 那层节点类型退场：
 *
 * - 状态（`open` / `closeOnSelect`）在闭包里，根上的 `data-open` 是读值绑定，命令只写状态；
 * - **面板坐标是量测值**（`openAt(x, y)` 算出后写行内 `left` / `top`）——16 号第 97 条登记的豁免项；
 * - 目标区 / 内层菜单各留一个取用器（`target(setup)` / `menuContent(setup)`）；
 * - props 进参数表、`...rest` 摊进根元素工厂；位置参数的字符串 / 数字 = 目标区内容
 *   （迁移前 `_setupContextMenu` 的兜底分支同口径）。
 */
export function VContextMenu({
  children,
  closeOnSelect,
  content,
  menu,
  menuContent,
  open,
  target,
  x,
  y,
  ...rest
} = {}) {
  // 状态是句柄原样 / 普通值包 ref，归一放在读时的派生上（R9）
  const openState = ref(false);
  const closeOnSelectState = asSignal(closeOnSelect);

  const closeOnSelectValue = computed(() =>
    closeOnSelectState.value === undefined ? true : Boolean(closeOnSelectState.value)
  );

  let globalCloseCleanup = null;
  let menuBox = null;
  let panelBox = null;
  let targetNodeBox = null;
  let view = null;

  return vNode((api) => {
    const releaseGlobalClose = () => {
      globalCloseCleanup?.();
    };

    /** 打开期间才挂文档级监听：点外面 / Esc。 */
    const bindGlobalClose = () => {
      if (globalCloseCleanup) {
        return;
      }

      const handlePointer = (event) => {
        if (!view?._el?.contains(event.target)) {
          api.close();
        }
      };
      const handleKey = (event) => {
        if (event.key === 'Escape') {
          api.close();
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

    api.target = (setup) => {
      if (setup === undefined) {
        return targetNodeBox;
      }

      setupContentSlot(targetNodeBox, setup);
      return api;
    };

    api.menuContent = (setup) => {
      if (setup === undefined) {
        return menuBox;
      }

      setupContentSlot(menuBox, setup);
      return api;
    };

    /** 选中即关：写方法（无参 = 开，与迁移前同口径）。 */
    api.closeOnSelect = (value = true) => {
      closeOnSelectState.value = Boolean(value);
      return api;
    };

    /** 打开在某个坐标（事件或 `x, y`）：坐标是**量测值**，写行内（第 97 条豁免）。 */
    api.openAt = (pointOrX = 0, atY = 0) => {
      const point = normalizePoint(pointOrX, atY);

      panelBox?.styles({ left: `${point.x}px`, top: `${point.y}px` });
      return api.open(true);
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

    /** 位置参数：字符串 / 数字 = 目标区内容（迁移前 `_setupContextMenu` 的兜底分支同口径）。 */
    api.setupString = (value) => api.target(value);

    api.whenDestroy = () => {
      api.close();
    };

    // 结构（R2）：整棵树写在 return 里；状态类属性是读值绑定（R4 / R6）
    view = div(
      {
        ...rest,
        'data-open': computed(() => (openState.value ? 'true' : null)),
        vn: 'VContextMenu'
      },
      (root) => {
        // 目标区：右键就打开（坐标取事件）
        const targetNode = div({ vn: 'VContextTarget' }, (box) => {
          targetNodeBox = box;
          box.on('contextmenu', (event) => {
            event.preventDefault();
            api.openAt(event);
          });
        });

        menuBox = new MenuNode().setup({ vn: 'VContextContent VMenu' });
        menuBox.on('click', (event) => {
          const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');

          if (
            closeOnSelectValue.value &&
            menuItem &&
            !menuItem.disabled &&
            !elementHasIdentity(menuItem, 'VSubMenuTrigger')
          ) {
            api.close();
          }
        });

        panelBox = div({ vn: 'VContextPanel' }, (panel) => panel.child(menuBox));
        root.child(targetNode, panelBox);

        // props：目标区 → 菜单内容 → 选中即关 → 打开态（迁移前 `_setupContextMenu` 的顺序）
        const menuSetup = menuContent ?? menu ?? content ?? children;

        if (target !== undefined) {
          api.target(target);
        }
        if (menuSetup !== undefined) {
          api.menuContent(menuSetup);
        }
        if (closeOnSelect !== undefined) {
          api.closeOnSelect(closeOnSelect);
        }
        if (open !== undefined) {
          if (open) {
            api.openAt(x ?? 0, y ?? 0);
          } else {
            api.close();
          }
        }
      }
    );

    // 元素级命令代委托（第三方仍可用 `menu.attr(…)` / `menu.on(…)`）
    delegateNodeCommands(api, view);

    return view;
  });
}

export const vContextMenu = createComponentShortcut(VContextMenu, { props: true });
