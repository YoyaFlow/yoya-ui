import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { vText } from '../core/index.js';
import { div, span } from '../html/index.js';
import { CloseOutlined } from '../svg/icons.js';
import {
  createComponentShortcut,
  createListItemKey,
  delegateNodeCommands,
  normalizeChildren,
  normalizeMessageOptions,
  replaceChildren
} from '../components/shared.js';

const messageTypes = ['success', 'error', 'warning', 'info'];

/** 倒计时的推进步长（与迁移前一致：100ms 一跳）。 */
const countdownTickMs = 100;

/**
 * 消息条（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * - **一个组件函数 = 一个边界**（R1）：`MessageNode` 那层节点类型退场，状态与命令都在闭包里，
 *   视图由最后那个 `return` 一次写清（R2），根上只留读值绑定（R4）；
 * - **倒计时是数据不是 DOM 写**（R6 / R9）：`countdownLeftState`（剩余毫秒）是唯一真源，
 *   文本与进度条各是一条绑定（原来每 100ms 手写 `textContent` / 行内 CSS 变量）；
 *   定时器归组件自己，`whenDestroy` 里清掉；
 * - **状态位进 CSS**（R5）：类型配色 / 关闭位 / 倒计时显隐都由根上的
 *   `data-type` / `data-closable` / `data-countdown` 规则管，JS 不写这些样式；
 * - **内容位保留一个取用器**（`content(setup)` 是运行期可替换的口径，见 16 号第 103 条）；
 * - props 进参数表、`...rest` 摊进根元素工厂；位置参数的字符串 / 数字 = 内容位
 *   （迁移前 `_setupMessage` 的兜底分支同口径）。
 */
export function VMessage({
  children,
  closable,
  content,
  countdown,
  duration,
  text,
  type,
  ...rest
} = {}) {
  // 状态是句柄原样 / 普通值包 ref，归一放在读时的派生上（R9）
  const typeState = asSignal(type);
  const closableState = asSignal(closable);
  const durationState = ref(Number(duration) || 0);
  /** 剩余毫秒；`null` = 没在计时（文本为空、进度变量不写、`data-countdown` 摘掉）。 */
  const countdownLeftState = ref(null);
  const closeHandlers = [];

  const typeValue = computed(() => {
    const next = typeState.value;
    return messageTypes.includes(next) ? next : 'info';
  });
  // 关闭位默认"不可关"（迁移前构造函数里那句 `data-closable='false'`）
  const closableValue = computed(() =>
    closableState.value === undefined ? false : Boolean(closableState.value)
  );
  const countdownText = computed(() =>
    countdownLeftState.value === null ? '' : `${Math.ceil(countdownLeftState.value / 1000)}s`
  );
  const countdownProgress = computed(() => {
    const left = countdownLeftState.value;
    const total = durationState.value;

    return left === null || !total ? null : `${Math.max(0, (left / total) * 100)}%`;
  });

  let closed = false;
  let contentBox = null;
  let countdownTimer = null;

  const clearCountdown = () => {
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  };

  return vNode((api) => {
    api.type = (value) => {
      if (value === undefined) {
        return typeValue.value;
      }

      typeState.value = value;
      return api;
    };

    /** 关闭位：写方法（无参 = 可关闭，与迁移前同口径）。 */
    api.closable = (value = true) => {
      closableState.value = Boolean(value);
      return api;
    };

    api.countdown = (nextDuration, enabled = true) => {
      if (nextDuration === undefined) {
        return durationState.value;
      }

      clearCountdown();
      durationState.value = Number(nextDuration) || 0;

      if (!enabled || durationState.value <= 0) {
        countdownLeftState.value = null;
        return api;
      }

      countdownLeftState.value = durationState.value;
      const startedAt = Date.now();

      countdownTimer = setInterval(() => {
        const remaining = Math.max(0, durationState.value - (Date.now() - startedAt));
        countdownLeftState.value = remaining;

        if (remaining <= 0) {
          clearCountdown();
        }
      }, countdownTickMs);

      return api;
    };

    /** 内容位（运行期可替换的取用器，见 16 号第 103 条）。 */
    api.content = (value) => {
      replaceChildren(contentBox, normalizeChildren(value));
      return api;
    };

    api.onClose = (handler) => {
      if (typeof handler === 'function') {
        closeHandlers.push(handler);
      }

      return api;
    };

    api.close = () => {
      if (closed) {
        return api;
      }

      closed = true;
      // 句柄交给使用方的是**组件节点**（与迁移前 `handler(this)` 同口径）
      closeHandlers.forEach((handler) => handler(api));
      // 关闭 = 摘下这棵视图（迁移前 `close()` 收口在节点类型的 `this.destroy()` 上，同口径）
      view.destroy();
      return api;
    };

    /** 位置参数：字符串 / 数字 = 内容位（迁移前 `_setupMessage` 的兜底分支同口径）。 */
    api.setupString = (value) => api.content(value);

    api.whenDestroy = () => {
      clearCountdown();
    };

    // 结构（R2）：整棵树写在 return 里；状态类属性是读值绑定（R4 / R6）
    const view = div(
      {
        ...rest,
        'data-closable': computed(() => (closableValue.value ? null : 'false')),
        'data-countdown': computed(() => (countdownLeftState.value === null ? null : 'true')),
        'data-type': typeValue,
        role: 'status',
        vn: 'VMessage'
      },
      (root) => {
        root.child(
          span({ vn: 'VMessageContent' }, (box) => {
            contentBox = box;
          }),

          span({ attrs: { 'aria-hidden': 'true' }, vn: 'VMessageCountdown' }, (box) =>
            box.child(vText(countdownText))
          ),

          span(
            {
              attrs: { 'aria-label': '关闭消息', role: 'button', tabindex: '0' },
              vn: 'VMessageClose'
            },
            (box) => {
              box.child(CloseOutlined());
              box.on('click', () => api.close());
              box.on('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  api.close();
                }
              });
            }
          ),

          span({
            attrs: { 'aria-hidden': 'true' },
            style: { '--yoya-message-countdown-progress': countdownProgress },
            vn: 'VMessageCountdownBar'
          })
        );

        // props：内容 → 类型 → 可关闭 → 倒计时（迁移前 `_setupMessage` 的落位顺序）
        const initialContent = content ?? text ?? children;

        if (initialContent !== undefined) {
          api.content(initialContent);
        }
        if (type !== undefined) {
          api.type(type);
        }
        if (closable !== undefined) {
          api.closable(closable);
        }
        if (duration !== undefined) {
          api.countdown(duration, countdown !== false);
        }
      }
    );

    // 元素级命令代委托（第三方仍可用 `message.attr(…)` / `message.on(…)`）
    delegateNodeCommands(api, view);

    return view;
  });
}

export const vMessage = createComponentShortcut(VMessage, { props: true });

/**
 * 消息容器（形态 B；2026-09-24 与 `VMessage` 同刀重写）。
 *
 * - **消息账 = 一份 `ref([])` + `keyed` 对账**（第 96 条判据 ③）：`show` 只往账里加、
 *   `close(id)` 只把账里那一条摘掉，增删排序交给引擎；原来的 `_messages` Map + `removeChild`
 *   手工摘除退场（`data-row-key` 是 `keyed` 的行键镜像，与 `VButtons` / `VAnchor` 同口径）；
 * - 自动关闭的 `setTimeout` 归这一条账（摘掉时 `clearTimeout`），消息自己的倒计时间隔归消息
 *   （`whenDestroy` 里清）；容器销毁时把还没到期的定时器一并清掉；
 * - `placement` / `inline` 是读值绑定（`data-placement` / `data-inline`），定位与内嵌布局在
 *   `yoya.ui.css`（R5）。
 */
export function VMessageContainer({ inline, placement, ...rest } = {}) {
  const inlineState = asSignal(inline);
  const placementState = asSignal(placement);
  const inlineValue = computed(() => Boolean(inlineState.value));
  const placementValue = computed(() => placementState.value || 'top-right');

  /** 消息账：`{ id, message, timer }`（真源就是这一份，结构交给 `keyed`）。 */
  const entries = ref([]);
  const keyOfEntry = createListItemKey('message');
  let nextId = 1;

  return vNode((api) => {
    /** 摘掉一条账（清掉它的自动关闭定时器）。 */
    const dropEntry = (id) => {
      const entry = entries.value.find((item) => item.id === id);

      if (entry?.timer) {
        clearTimeout(entry.timer);
      }

      entries.value = entries.value.filter((item) => item.id !== id);
    };

    api.placement = (value) => {
      if (value === undefined) {
        return placementValue.value;
      }

      placementState.value = value;
      return api;
    };

    /** 内嵌模式：写方法（无参 = 内嵌，与迁移前同口径）。 */
    api.inline = (value = true) => {
      inlineState.value = Boolean(value);
      return api;
    };

    api.show = (content, options = {}) => {
      const normalized = normalizeMessageOptions(options);
      const id = normalized.id || `message-${nextId++}`;

      if (entries.value.some((entry) => entry.id === id)) {
        api.close(id);
      }

      const message = vMessage(content)
        .type(normalized.type || 'info')
        .closable(normalized.closable ?? true)
        .onClose(() => {
          dropEntry(id);
        });

      const entry = { id, message, timer: null };
      entries.value = [...entries.value, entry];

      if (normalized.duration !== 0) {
        const duration = normalized.duration ?? 3000;

        message.countdown(duration, normalized.countdown !== false);
        entry.timer = setTimeout(() => api.close(id), duration);
      }

      return id;
    };

    api.success = (content, options = {}) =>
      api.show(content, { ...normalizeMessageOptions(options), type: 'success' });
    api.error = (content, options = {}) =>
      api.show(content, { ...normalizeMessageOptions(options), type: 'error' });
    api.warning = (content, options = {}) =>
      api.show(content, { ...normalizeMessageOptions(options), type: 'warning' });
    api.info = (content, options = {}) =>
      api.show(content, { ...normalizeMessageOptions(options), type: 'info' });

    api.close = (id) => {
      const entry = entries.value.find((item) => item.id === id);

      if (!entry) {
        return api;
      }

      // 消息自己收口（`close()` 会跑它登记的 onClose → 摘账）
      entry.message.close();
      return api;
    };

    api.clear = () => {
      [...entries.value].forEach((entry) => api.close(entry.id));
      return api;
    };

    api.whenDestroy = () => {
      entries.value.forEach((entry) => {
        if (entry.timer) {
          clearTimeout(entry.timer);
        }
      });
    };

    const view = div(
      {
        ...rest,
        'aria-live': 'polite',
        'data-inline': computed(() => (inlineValue.value ? 'true' : null)),
        'data-placement': placementValue,
        vn: 'VMessageContainer'
      },
      (root) => root.keyed(entries, keyOfEntry, (entry) => entry.message)
    );

    if (placement !== undefined) {
      api.placement(placement);
    }

    if (inline !== undefined) {
      api.inline(inline);
    }

    // 元素级命令代委托（第三方仍可用 `container.attr(…)` / `container.on(…)`）
    delegateNodeCommands(api, view);

    return view;
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
