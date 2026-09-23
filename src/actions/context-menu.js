import { HtmlElementNode } from '../html/index.js';
import { MenuNode } from '../navigation/menu.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import {
  createComponentShortcut,
  delegateNodeCommands,
  elementHasIdentity,
  isPlainObject,
  normalizePoint,
  setupContentSlot
} from '../components/shared.js';

/** VContextMenu 的节点类型（不导出）；公开组件 `vContextMenu` 是 vNode 外壳。 */
class ContextMenuNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VContextMenu' });
    this._closeOnSelect = true;
    this._globalCloseCleanup = null;
    // 内部状态用 ref 持有（票 01 约定）；open 是「默认真」写方法，无参不是读
    this._open = ref(false);
    this._target = new HtmlElementNode('div', { vn: 'VContextTarget' }).on(
      'contextmenu',
      (event) => {
        event.preventDefault();
        this.openAt(event);
      }
    );
    this._menu = new MenuNode().setup({ vn: 'VContextContent VMenu' });
    this._panel = new HtmlElementNode('div', { vn: 'VContextPanel' }).child(this._menu);

    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');
      if (
        this._closeOnSelect &&
        menuItem &&
        !menuItem.disabled &&
        !elementHasIdentity(menuItem, 'VSubMenuTrigger')
      ) {
        this.close();
      }
    });
    this.child(this._target, this._panel);
    this._setupContextMenu(setup);
  }

  target(setup) {
    if (setup === undefined) {
      return this._target;
    }

    setupContentSlot(this._target, setup);
    return this;
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    return this;
  }

  closeOnSelect(value = true) {
    this._closeOnSelect = Boolean(value);
    return this;
  }

  openAt(pointOrX = 0, y = 0) {
    const point = normalizePoint(pointOrX, y);

    this._panel.styles({
      left: `${point.x}px`,
      top: `${point.y}px`
    });
    return this.open(true);
  }

  open(value = true) {
    const enabled = Boolean(value);

    this._open.value = enabled;
    this.attr('data-open', enabled ? 'true' : null);

    if (enabled) {
      this._bindGlobalCloseHandlers();
    } else {
      this._releaseGlobalCloseHandlers();
    }

    return this;
  }

  close() {
    return this.open(false);
  }

  destroy() {
    this.close();
    return super.destroy();
  }

  _bindGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      return;
    }

    const handlePointer = (event) => {
      if (!this._el?.contains(event.target)) {
        this.close();
      }
    };
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    };

    const unbindPointer = bindDocumentEvent('click', handlePointer);
    const unbindKey = bindDocumentEvent('keydown', handleKey);
    this._globalCloseCleanup = () => {
      unbindPointer();
      unbindKey();
      this._globalCloseCleanup = null;
    };
  }

  _releaseGlobalCloseHandlers() {
    if (this._globalCloseCleanup) {
      this._globalCloseCleanup();
    }
  }

  _setupContextMenu(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        closeOnSelect,
        content,
        menu,
        menuContent,
        open,
        target,
        x,
        y,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      if (target !== undefined) {
        this.target(target);
      }

      const menuSetup = menuContent ?? menu ?? content ?? children;
      if (menuSetup !== undefined) {
        this.menuContent(menuSetup);
      }

      if (closeOnSelect !== undefined) {
        this.closeOnSelect(closeOnSelect);
      }

      if (open !== undefined) {
        if (open) {
          this.openAt(x ?? 0, y ?? 0);
        } else {
          this.close();
        }
      }

      return;
    }

    this.target(setup);
  }
}

/**
 * 右键菜单（形态 B）：视图根是节点类型扩展 `ContextMenuNode`（目标区 / 面板 / 内层菜单是它的子节点、
 * 全局关闭监听挂在它的 `destroy()` 上）；外层 `vNode` 用 `delegateNodeCommands` 补齐命令面与元素 DSL。
 * 面板坐标是**量测出来的**（`openAt` 的 `left` / `top`），仍写行内。
 */
export function VContextMenu(props = {}) {
  return vNode((api) => {
    const node = new ContextMenuNode(props);
    delegateNodeCommands(api, node);
    // 位置参数里的字符串 / 数字：迁移前走 `_setupContextMenu(setup)` 的兜底分支 = 目标区内容
    // （组件化后位置参数回落到"视图根的 setup 分派"，不回构造函数，所以要显式补这一条）
    api.setupString = (value) => {
      node.target(value);
      return api;
    };
    return node;
  });
}

export const vContextMenu = createComponentShortcut(VContextMenu, { props: true });
