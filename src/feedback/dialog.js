import { HtmlElementNode } from '../html/index.js';
import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import {
  createComponentShortcut,
  delegateNodeCommands,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

/** 对话框的节点类型（不导出）；公开组件 `vDialog` 是 vNode 外壳。 */
class DialogNode extends HtmlElementNode {
  constructor(setup = null) {
    super('dialog', { vn: 'VDialog' });
    // 内部状态用 ref 持有（票 01 约定）；open 是「默认真」写方法，无参不是读
    this._open = ref(false);
    // 静态样式在 `yoya.ui.css` 的 `[vn~='VDialog*']` 规则里（R5）
    this.attr('aria-modal', 'true');
    this.attr('role', 'dialog');
    this._pendingOpenSync = false;
    this._closable = true;
    this._closeHandler = null;
    this._closeButton = new HtmlElementNode('button', { vn: 'VDialogClose' })
      .attr({ type: 'button', 'aria-label': '关闭' })
      .child('×')
      .on('click', () => this.close());
    this._header = new HtmlElementNode('div', { vn: 'VDialogHeader' });
    this._header.child(this._closeButton);
    this._content = new HtmlElementNode('div', { vn: 'VDialogContent' });
    this.child(this._header, this._content);
    this.on('cancel', (event) => {
      event.preventDefault();
      this.close();
    });
    this.on('close', () => {
      this._open.value = false;
      this.attr('data-open', null);
      this.attr('open', null);
    });
    this._setupDialog(setup);
  }

  content(value) {
    replaceChildren(this._content, []);

    if (typeof value === 'function') {
      value(this._content);
      return this;
    }

    replaceChildren(this._content, normalizeChildren(value));
    return this;
  }

  open(value = true) {
    const enabled = Boolean(value);
    const wasOpen = this._open.value;

    this._open.value = enabled;
    this.attr('data-open', enabled ? 'true' : null);

    if (enabled) {
      this._openElement();
    } else {
      if (wasOpen && typeof this._closeHandler === 'function') {
        this._closeHandler();
      }
      this._closeElement();
    }

    return this;
  }

  close() {
    return this.open(false);
  }

  // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
  isOpen() {
    return this._open.value;
  }

  onClose(handler) {
    if (handler === undefined) {
      return this._closeHandler;
    }

    this._closeHandler = typeof handler === 'function' ? handler : null;
    return this;
  }

  closable(value = true) {
    this._closable = Boolean(value);
    // 关闭按钮那一行整体的显隐交给 CSS（`[data-closable='false']`），不再写行内 display
    this.attr('data-closable', this._closable ? null : 'false');
    return this;
  }

  renderDom() {
    const element = super.renderDom();

    if (this._open.value) {
      this._scheduleOpenSync();
    }

    return element;
  }

  _setupDialog(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, closable, content, onClose, open, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (children !== undefined) {
        this.content(children);
      }

      if (closable !== undefined) {
        this.closable(closable);
      }

      if (onClose !== undefined) {
        this.onClose(onClose);
      }

      if (open !== undefined) {
        this.open(open);
      }

      return;
    }

    this.content(setup);
  }

  _openElement({ defer = true } = {}) {
    this.style('display', null);

    if (!this._el) {
      this.attr('open', null);
      return;
    }

    if (typeof this._el.showModal !== 'function') {
      this.attr('open', true);
      return;
    }

    if (!this._el.isConnected) {
      this.attr('open', null);
      if (defer) {
        this._scheduleOpenSync();
      }
      return;
    }

    try {
      if (this._el.open && !this._isModal()) {
        this.attr('open', null);
      }

      if (!this._el.open) {
        this._el.showModal();
      }

      this.attr('open', true);
    } catch {
      this.attr('open', true);
    }
  }

  _closeElement() {
    if (this._el && typeof this._el.close === 'function') {
      try {
        if (this._el.open) {
          this._el.close();
        }
      } catch {
        // 忽略不支持的关闭行为。
      }
    }

    this.attr('open', null);

    if (this._el && typeof this._el.showModal !== 'function') {
      this.style('display', 'none');
    } else {
      this.style('display', null);
    }
  }

  _scheduleOpenSync() {
    if (this._pendingOpenSync) {
      return;
    }

    this._pendingOpenSync = true;
    queueMicrotask(() => {
      this._pendingOpenSync = false;

      if (this._open.value) {
        this._openElement({ defer: false });
      }
    });
  }

  _isModal() {
    if (!this._el || typeof this._el.matches !== 'function') {
      return false;
    }

    try {
      return this._el.matches(':modal');
    } catch {
      return false;
    }
  }
}

/**
 * 对话框（形态 B）：视图根是节点类型扩展 `DialogNode`（原生 `<dialog>` 的 `showModal` / `close`
 * 与"不支持 showModal 时的 display 兜底"都归它），外层 `vNode` 用 `delegateNodeCommands` 补齐
 * 命令面（`content` / `open` / `close` / `isOpen` / `onClose` / `closable`）与元素 DSL。
 */
export function VDialog(props = {}) {
  return vNode((api) => {
    const node = new DialogNode(props);
    delegateNodeCommands(api, node);
    // 位置参数里的字符串 / 数字：迁移前走 `_setupDialog(setup)` 的兜底分支 = 内容位
    // （组件化后位置参数回落到"视图根的 setup 分派"，不回构造函数，所以要显式补这一条）
    api.setupString = (value) => {
      node.content(value);
      return api;
    };
    return node;
  });
}

export const vDialog = createComponentShortcut(VDialog, { props: true });
