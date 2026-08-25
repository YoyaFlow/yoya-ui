import { HtmlElementNode } from '../html/index.js';
import { VMenu } from '../navigation/menu.js';
import {
  createComponentFactory,
  componentClass,
  isPlainObject,
  normalizePoint,
  setupContentSlot
} from '../components/shared.js';

export class VContextMenu extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._closeOnSelect = true;
    this._globalCloseCleanup = null;
    this._target = new HtmlElementNode('div')
      .className('yoya-vcontext-target')
      .on('contextmenu', (event) => {
        event.preventDefault();
        this.openAt(event);
      });
    this._menu = new VMenu().className('yoya-vcontext-content');
    this._panel = new HtmlElementNode('div').className('yoya-vcontext-panel').child(this._menu);

    this.className(componentClass, 'yoya-vcontext-menu');
    this._menu.on('click', (event) => {
      const menuItem = event.target?.closest?.('.yoya-vmenu-item');
      if (
        this._closeOnSelect &&
        menuItem &&
        !menuItem.disabled &&
        !menuItem.classList.contains('yoya-vsubmenu-trigger')
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

    this.setState('open', enabled);
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
    if (this._globalCloseCleanup || typeof document === 'undefined') {
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

    document.addEventListener('click', handlePointer);
    document.addEventListener('keydown', handleKey);
    this._globalCloseCleanup = () => {
      document.removeEventListener('click', handlePointer);
      document.removeEventListener('keydown', handleKey);
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

export function vContextMenu(first = null, second = null, third = null) {
  return createComponentFactory(VContextMenu, first, second, third);
}
