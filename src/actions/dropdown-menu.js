import { defineComponentIdentity } from '../core/node.js';
import { createComponentShell } from '../components/component-shell.js';
import { HtmlElementNode } from '../html/index.js';
import { MenuNode } from '../navigation/menu.js';
import { vButton } from './button.js';
import { bindDocumentEvent } from '../core/document-events.js';
import { ref } from '../core/signals/handle.js';
import { allocateId } from '../core/id.js';
import {
  componentClass,
  dropdownPlacementStyles,
  elementHasIdentity,
  isPlainObject,
  setupButtonSlot,
  setupContentSlot
} from '../components/shared.js';

/** VDropdownMenu 的节点类型（不导出）；公开组件 `vDropdownMenu` 是 vNode 外壳。 */
class DropdownMenuNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._identity = 'VDropdownMenu';
    this._closeOnSelect = true;
    this._globalCloseCleanup = null;
    this._panelId = allocateId('yoya-vdropdown-panel');
    // 内部状态用 ref 持有（票 01 约定）；open 是「默认真」写方法，无参不是读
    this._open = ref(false);
    this._trigger = vButton('操作')
      .className('yoya-vdropdown-trigger')
      .attr({
        'aria-controls': this._panelId,
        'aria-expanded': 'false',
        'aria-haspopup': 'menu'
      })
      .on('click', (event) => {
        event.preventDefault();
        // 触发钮禁用态以 DOM 属性为准（票 01 后 VButton 状态走内部 ref）
        if (!this._trigger.attr('disabled')) {
          this.toggle();
        }
      });
    this._trigger.on('keydown', (event) => this._handleTriggerKeydown(event));
    this._menu = new MenuNode().className('yoya-vdropdown-content');
    this._panel = new HtmlElementNode('div')
      .id(this._panelId)
      .className('yoya-vdropdown-panel')
      .attr('aria-hidden', 'true')
      .child(this._menu);

    this.className(componentClass, 'yoya-vdropdown-menu');
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('[vn~="VMenuItem"]');
      if (
        this._closeOnSelect &&
        menuItem &&
        !menuItem.disabled &&
        !elementHasIdentity(menuItem, 'VSubMenuTrigger')
      ) {
        this.close();
        this._focusTrigger();
      }
    });
    this.child(this._trigger, this._panel);
    this.placement('bottom-start');
    this._setupDropdownMenu(setup);
  }

  trigger(setup) {
    if (setup === undefined) {
      return this._trigger;
    }

    setupButtonSlot(this._trigger, setup);
    return this;
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    return this;
  }

  placement(value) {
    if (value === undefined) {
      return this.attr('data-placement');
    }

    const placement = value || 'bottom-start';
    this.attr('data-placement', placement);
    this._panel.styles(dropdownPlacementStyles(placement));
    return this;
  }

  closeOnSelect(value = true) {
    this._closeOnSelect = Boolean(value);
    return this;
  }

  open(value = true) {
    const enabled = Boolean(value);

    this._open.value = enabled;
    this.attr('data-open', enabled ? 'true' : null);
    this._trigger.attr('aria-expanded', enabled ? 'true' : 'false');
    this._panel.attr('aria-hidden', enabled ? 'false' : 'true');

    if (enabled) {
      this._bindGlobalCloseHandlers();
      this._focusFirstEnabledItem();
    } else {
      this._releaseGlobalCloseHandlers();
    }

    return this;
  }

  close() {
    return this.open(false);
  }

  toggle() {
    return this.open(!this._open.value);
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
        const shouldRestoreFocus = this._el?.contains(event.target);
        this.close();
        if (shouldRestoreFocus) {
          this._focusTrigger();
        }
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

  _handleTriggerKeydown(event) {
    // 触发钮禁用态以 DOM 属性为准（票 01 后 VButton 状态走内部 ref）
    if (this._trigger.attr('disabled')) {
      return;
    }

    if (!['ArrowDown', 'ArrowUp', 'Enter', ' ', 'Spacebar'].includes(event.key)) {
      return;
    }

    event.preventDefault();

    if (event.key === 'ArrowUp') {
      this.open();
      this._focusLastEnabledItem();
      return;
    }

    this.open();
  }

  _focusFirstEnabledItem() {
    const firstItem = this._menu._enabledMenuItems()[0];
    firstItem?.focus?.();
  }

  _focusLastEnabledItem() {
    const items = this._menu._enabledMenuItems();
    const lastItem = items[items.length - 1];
    lastItem?.focus?.();
  }

  _focusTrigger() {
    this._trigger._el?.focus();
  }

  _setupDropdownMenu(setup) {
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
        label,
        menu,
        menuContent,
        open,
        placement,
        text,
        trigger,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      if (trigger !== undefined) {
        this.trigger(trigger);
      } else if (label !== undefined) {
        this.trigger(label);
      } else if (text !== undefined) {
        this.trigger(text);
      }

      const menuSetup = menuContent ?? menu ?? content ?? children;
      if (menuSetup !== undefined) {
        this.menuContent(menuSetup);
      }

      if (placement !== undefined) {
        this.placement(placement);
      }

      if (closeOnSelect !== undefined) {
        this.closeOnSelect(closeOnSelect);
      }

      if (open !== undefined) {
        this.open(open);
      }

      return;
    }

    this.trigger(setup);
  }
}

export function vDropdownMenu(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VDropdownMenu',
    createNode: (setup) => new DropdownMenuNode(setup),
    commands: ['trigger', 'menuContent', 'placement', 'closeOnSelect', 'open', 'close', 'toggle'],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VDropdownMenu = vDropdownMenu;
defineComponentIdentity(VDropdownMenu, 'VDropdownMenu');
