import { HtmlElementNode } from '../html/index.js';
import { vText } from '../core/index.js';
import { vNode } from '../core/v-node.js';
import { CloseOutlined } from '../svg/icons.js';
import {
  createComponentShortcut,
  delegateNodeCommands,
  isPlainObject,
  normalizeChildren,
  normalizeMessageOptions,
  removeChild,
  replaceChildren
} from '../components/shared.js';

const messageTypes = ['success', 'error', 'warning', 'info'];

/** VMessage 的节点类型（不导出）；公开组件 `vMessage` 是 vNode 外壳。 */
class MessageNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VMessage' });
    this._closeHandlers = [];
    this._countdownDuration = 0;
    this._countdownTimer = null;
    this._contentBox = new HtmlElementNode('span', { vn: 'VMessageContent' });
    this._countdownBox = new HtmlElementNode('span', { vn: 'VMessageCountdown' }).attr(
      'aria-hidden',
      'true'
    );
    this._countdownText = vText('');
    this._countdownBox.child(this._countdownText);
    this._closeButton = new HtmlElementNode('span', { vn: 'VMessageClose' })
      .attr({ role: 'button', tabindex: '0', 'aria-label': '关闭消息' })
      .child(CloseOutlined())
      .on('click', () => this.close())
      .on('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.close();
        }
      });
    this._progressBar = new HtmlElementNode('span', { vn: 'VMessageCountdownBar' }).attr(
      'aria-hidden',
      'true'
    );

    // 静态样式与类型配色都在 `yoya.ui.css`（R5）；状态位：`data-type` / `data-closable` / `data-countdown`
    this.attr({ role: 'status', 'data-closable': 'false' });
    this.child(this._contentBox, this._countdownBox, this._closeButton, this._progressBar);
    this.type('info');
    this._setupMessage(setup);
  }

  content(content) {
    replaceChildren(this._contentBox, normalizeChildren(content));
    return this;
  }

  type(value) {
    if (value === undefined) {
      return this.attr('data-type');
    }

    const nextType = messageTypes.includes(value) ? value : 'info';
    this.attr('data-type', nextType);
    return this;
  }

  closable(value = true) {
    this.attr('data-closable', value ? null : 'false');
    return this;
  }

  countdown(duration, enabled = true) {
    if (duration === undefined) {
      return this._countdownDuration;
    }

    this._clearCountdown();
    this._countdownDuration = Number(duration) || 0;
    const show = Boolean(enabled) && this._countdownDuration > 0;
    this.attr('data-countdown', show ? 'true' : null);

    if (!show) {
      return this;
    }

    this._countdownText.textContent(`${Math.ceil(this._countdownDuration / 1000)}s`);
    this._progressBar.style('--yoya-message-countdown-progress', '100%');
    const startedAt = Date.now();
    this._countdownTimer = setInterval(() => {
      const remaining = Math.max(0, this._countdownDuration - (Date.now() - startedAt));
      this._countdownText.textContent(`${Math.ceil(remaining / 1000)}s`);
      this._progressBar.style(
        '--yoya-message-countdown-progress',
        `${Math.max(0, (remaining / this._countdownDuration) * 100)}%`
      );
      if (remaining <= 0) {
        this._clearCountdown();
      }
    }, 100);

    return this;
  }

  onClose(handler) {
    if (typeof handler === 'function') {
      this._closeHandlers.push(handler);
    }

    return this;
  }

  close() {
    if (this._deleted) {
      return this;
    }

    this._closeHandlers.forEach((handler) => handler(this));
    return this.destroy();
  }

  destroy() {
    this._clearCountdown();
    return super.destroy();
  }

  _clearCountdown() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
  }

  _setupMessage(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, closable, content, countdown, duration, text, type, ...elementConfig } =
        setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (text !== undefined) {
        this.content(text);
      } else if (children !== undefined) {
        this.content(children);
      }

      if (type !== undefined) {
        this.type(type);
      }

      if (closable !== undefined) {
        this.closable(closable);
      }

      if (duration !== undefined) {
        this.countdown(duration, countdown !== false);
      }

      return;
    }

    this.content(setup);
  }
}

/** VMessageContainer 的节点类型（不导出）；公开组件 `vMessageContainer` 是 vNode 外壳。 */
class MessageContainerNode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', { vn: 'VMessageContainer' });
    this._nextId = 1;
    this._messages = new Map();
    this._inline = false;
    // 容器几何与 placement 都在 `yoya.ui.css`（R5）；`data-placement` / `data-inline` 是状态位
    this.attr({ 'aria-live': 'polite', 'data-placement': 'top-right' });
    this._setupContainer(setup);
  }

  placement(value) {
    if (value === undefined) {
      return this.attr('data-placement');
    }

    this.attr('data-placement', value || 'top-right');
    return this;
  }

  /** 内嵌模式：容器静态定位并占满宽度，适合放在卡片/局部区域；false 恢复浮层定位。 */
  inline(value = true) {
    this._inline = Boolean(value);
    this.attr('data-inline', this._inline ? 'true' : null);

    if (!this._inline) {
      this.placement(this.placement() || 'top-right');
    }

    return this;
  }

  show(content, options = {}) {
    const normalized = normalizeMessageOptions(options);
    const id = normalized.id || `message-${this._nextId++}`;

    if (this._messages.has(id)) {
      this.close(id);
    }

    const message = vMessage(content)
      .type(normalized.type || 'info')
      .closable(normalized.closable ?? true)
      .onClose(() => {
        const entry = this._messages.get(id);
        if (entry?.timer) {
          clearTimeout(entry.timer);
        }
        removeChild(this, message);
        this._messages.delete(id);
      });

    this._messages.set(id, { message, timer: null });
    this.child(message);

    if (normalized.duration !== 0) {
      const duration = normalized.duration ?? 3000;
      message.countdown(duration, normalized.countdown !== false);
      const timer = setTimeout(() => this.close(id), duration);
      this._messages.set(id, { message, timer });
    }

    return id;
  }

  success(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'success' });
  }

  error(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'error' });
  }

  warning(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'warning' });
  }

  info(content, options = {}) {
    return this.show(content, { ...normalizeMessageOptions(options), type: 'info' });
  }

  close(id) {
    const entry = this._messages.get(id);
    if (!entry) {
      return this;
    }

    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    entry.message.close();
    this._messages.delete(id);
    return this;
  }

  clear() {
    [...this._messages.keys()].forEach((id) => this.close(id));
    return this;
  }

  destroy() {
    this.clear();
    return super.destroy();
  }

  _setupContainer(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { inline, placement, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (placement !== undefined) {
        this.placement(placement);
      }
      if (inline !== undefined) {
        this.inline(inline);
      }
    }
  }
}

/**
 * 消息条（形态 B）：视图根是节点类型扩展 `MessageNode`（倒计时定时器 / 关闭处理器归它），
 * 外层 `vNode` 用 `delegateNodeCommands` 补齐命令面与元素 DSL；类型配色 / 关闭位 / 倒计时
 * 都由根上的状态位（`data-type` / `data-closable` / `data-countdown`）交给 CSS（R5）。
 */
export function VMessage(props = {}) {
  return vNode((api) => {
    const node = new MessageNode(props);
    delegateNodeCommands(api, node);
    return node;
  });
}

export const vMessage = createComponentShortcut(VMessage, { props: true });

/** 消息容器（形态 B）：`placement` / `inline` 是状态位（`data-placement` / `data-inline`），
 * 定位与内嵌布局在 `yoya.ui.css`；`show` / `close` / `clear` 等仍归节点类型。 */
export function VMessageContainer(props = {}) {
  return vNode((api) => {
    const node = new MessageContainerNode(props);
    delegateNodeCommands(api, node);
    return node;
  });
}

export const vMessageContainer = createComponentShortcut(VMessageContainer, { props: true });

export const toast = {
  _container: null,

  use(container) {
    this._container = container;
    return this;
  },

  container() {
    if (!this._container) {
      this._container = vMessageContainer();
      if (typeof document !== 'undefined' && document.body) {
        this._container.bindTo(document.body);
      }
    }

    return this._container;
  },

  show(content, options = {}) {
    return this.container().show(content, options);
  },

  success(content, options = {}) {
    return this.container().success(content, options);
  },

  error(content, options = {}) {
    return this.container().error(content, options);
  },

  warning(content, options = {}) {
    return this.container().warning(content, options);
  },

  info(content, options = {}) {
    return this.container().info(content, options);
  },

  close(id) {
    return this.container().close(id);
  },

  clear() {
    return this.container().clear();
  }
};
