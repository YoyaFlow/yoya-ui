import { computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { span } from '../html/index.js';
import { vText } from '../core/index.js';
import {
  createComponentShortcut,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeValue
} from '../components/shared.js';

const statusColors = {
  default: themeValue('color-text-muted', '#8c8c8c'),
  error: themeValue('color-danger', '#f5222d'),
  processing: themeValue('color-info', '#1677ff'),
  success: themeValue('color-success', '#52c41a'),
  warning: themeValue('color-warning', '#faad14')
};

/**
 * VBadge 的**参考实现**：业务组件函数 + 有名子结构函数 + 读值绑定。
 *
 * 口径（`AGENTS.md`「业务组件函数」与「State → View: Read-Value Bindings First」两节、
 * `docs/component-authoring{,.zh-CN}.md` §6.0、16 号清单第 44–46 条）：
 *
 * 1. **业务组件函数决定组件边界**，一律用有名函数声明：`function VXxx() { … return vNode((api) => 视图) }`；
 *    子结构同样用**有名函数**定义（本文件内、不导出），父组件里只写组合；
 * 2. **结构用 setupFunction 嵌套**：`span({ vn, style }, (box) => { box.style(绑定); box.child(…); })`——
 *    静态部分写在工厂参数里，绑定与子节点写在回调里，不把 `.style(...)` 挂到工厂调用之外；
 * 3. **状态 → 视图走读值绑定**：状态是 `ref`，映射写在结构里（`style(name, () => …)` /
 *    `attr(name, () => …)` / `child(vText(() => …))`），命令只改状态；
 * 4. **非必要不用 `rebuild`**：角标数字是值绑定，点模式"没有文本"用 `mountable()`（条件挂载），
 *    文本位内容由命令 `replaceChildren()` 直接写——都不到"整块结构必须重建"；
 * 5. **props 通道要收口**：绑定构建期只求值一次、落地才订阅（引擎契约，
 *    见 `src/core/binding-landing.test.js`），而 props 正好落在"构建 → 落地"之间，
 *    所以写状态的命令末尾调一次 `self.node().flush()`（幂等；落地后订阅接管，不必再调）。
 */

/** 子结构：内容框——默认占位（`vn_slot: ''`），匿名内容与 `child()` 落在这里。无行为，形态 A。 */
function VBadgeContent() {
  return span({
    style: { alignItems: 'center', display: 'inline-flex', minWidth: '0' },
    vn: 'VBadgeContent',
    vn_slot: ''
  });
}

/** 子结构：角标位——显隐、配色、定位与数字全是读值绑定。 */
function VBadgeCount(view) {
  return span(
    {
      style: {
        alignItems: 'center',
        background: themeValue('color-danger', '#ff4d4f'),
        borderRadius: '10px',
        boxSizing: 'border-box',
        color: themeValue('color-text-inverse', '#ffffff'),
        display: 'none',
        fontSize: '12px',
        fontWeight: '700',
        height: '18px',
        justifyContent: 'center',
        lineHeight: '1',
        minWidth: '18px',
        padding: '0 6px',
        position: 'absolute',
        right: '0',
        textAlign: 'center',
        top: '0',
        transform: 'translate(50%, -50%)',
        whiteSpace: 'nowrap',
        zIndex: '1'
      },
      vn: 'VBadgeCount'
    },
    (box) => {
      box.style('display', () => (view.visible.value ? 'inline-flex' : 'none'));
      box.style('background', () => (view.visible.value ? view.background.value : null));
      box.style('position', () => (view.hasContent.value ? 'absolute' : 'static'));
      box.style('transform', () =>
        view.hasContent.value
          ? `translate(calc(50% + ${view.offsetX.value}px), calc(-50% + ${view.offsetY.value}px))`
          : null
      );
      box.style('borderRadius', () => (view.dotMode.value ? '999px' : '10px'));
      box.style('height', () => (view.dotMode.value ? '8px' : '18px'));
      box.style('minWidth', () => (view.dotMode.value ? '8px' : '18px'));
      box.style('padding', () => (view.dotMode.value ? '0' : '0 6px'));
      box.style('width', () => (view.dotMode.value ? '8px' : null));
      box.attr('aria-label', () =>
        view.visible.value
          ? view.dotMode.value
            ? view.status.value || '通知'
            : view.badgeText.value
          : null
      );
      box.attr('title', view.title);
      // 点模式"没有文本"= 条件挂载（不在 DOM，节点还活着），不重建结构
      box.child(
        vText(() => (view.dotMode.value ? '' : view.badgeText.value)).mountable(
          () => !view.dotMode.value
        )
      );
    }
  );
}

/** 子结构：文本位——显隐是读值绑定，内容由 `text()` 命令写进这个节点。 */
function VBadgeText(view) {
  return span(
    {
      style: {
        color: themeValue('color-text-secondary', '#475569'),
        display: 'none',
        fontSize: '12px',
        lineHeight: '1'
      },
      vn: 'VBadgeText'
    },
    (box) => {
      box.style('display', () => (view.textVisible.value ? 'inline-flex' : 'none'));
    }
  );
}

export function VBadge() {
  return vNode((api, self) => {
    const count = ref(null);
    const overflowCount = ref(99);
    const overflowWritten = ref(false);
    const showZero = ref(false);
    const dot = ref(false);
    const status = ref(null);
    const color = ref(null);
    const offsetX = ref(0);
    const offsetY = ref(0);
    const title = ref(null);
    const textContent = ref(null);
    const hasContent = ref(false);

    const countVisible = computed(() => {
      if (count.value === null || count.value === undefined || count.value === '') {
        return false;
      }

      const numeric = Number(count.value);

      return Number.isFinite(numeric) && numeric === 0 ? showZero.value : true;
    });
    const dotMode = computed(() => Boolean(status.value || dot.value));

    /** 交给子结构的那一份"视图事实"（子结构的 props）。 */
    const view = {
      badgeText: computed(() => {
        const numeric = Number(count.value);

        if (Number.isFinite(numeric) && count.value !== '') {
          const max = Number(overflowCount.value) || 99;

          return numeric > max ? `${max}+` : String(count.value);
        }

        return String(count.value);
      }),
      background: computed(
        () =>
          color.value ||
          (status.value ? statusColors[status.value] : themeValue('color-danger', '#ff4d4f'))
      ),
      dotMode,
      hasContent,
      offsetX,
      offsetY,
      status,
      textVisible: computed(() => textContent.value !== null && textContent.value !== ''),
      title,
      visible: computed(() => dotMode.value || countVisible.value)
    };

    // 内容位与文本位是命令目标（`content()` / `text()` 往里写内容），句柄只能在构建期拿
    const contentBox = VBadgeContent();
    const textBox = VBadgeText(view);

    // 视图：父组件只写组合，子结构各自带自己的结构与绑定
    const root = span(
      {
        style: {
          alignItems: 'center',
          boxSizing: 'border-box',
          display: 'inline-flex',
          gap: '6px',
          lineHeight: '1',
          position: 'relative',
          verticalAlign: 'middle'
        },
        vn: 'VBadge'
      },
      (box) => {
        box.attr('data-count', () => (count.value === null ? null : String(count.value)));
        box.attr('data-overflow-count', () =>
          overflowWritten.value ? String(overflowCount.value) : null
        );
        box.attr('data-show-zero', () => (showZero.value ? 'true' : null));
        box.attr('data-dot', () => (dot.value ? 'true' : null));
        box.attr('data-status', status);
        box.attr('data-color', color);
        box.attr('data-standalone', () => (hasContent.value ? null : 'true'));
        box.child(contentBox, VBadgeCount(view), textBox);
      }
    );

    /** 投递进来的内容在解析前只排在组件节点上；`self.node()` 在 setup 期取会抛。 */
    const queuedContent = () => {
      try {
        return self.node().children();
      } catch {
        return [];
      }
    };
    const refreshContentFlag = () => {
      hasContent.value = contentBox.children().length + queuedContent().length > 0;
    };

    /** props 落在"构建 → 落地"窗口里，写完状态收口一次（落地后订阅接管，幂等）。 */
    const refresh = () => {
      self.node().flush();
    };

    api.content = (value) => {
      if (value === undefined) {
        return contentBox.children();
      }

      replaceChildren(contentBox, normalizeChildren(value));
      refreshContentFlag();
      refresh();
      return api;
    };

    api.count = (value) => {
      if (value === undefined) {
        return count.value;
      }

      count.value = value === null || value === undefined || value === '' ? null : value;
      refresh();
      return api;
    };

    api.overflowCount = (value) => {
      if (value === undefined) {
        return overflowCount.value;
      }

      const nextValue = Number(value);

      overflowCount.value = Number.isFinite(nextValue) ? nextValue : 99;
      overflowWritten.value = true;
      refresh();
      return api;
    };

    api.showZero = (value) => {
      if (value === undefined) {
        return showZero.value;
      }

      showZero.value = Boolean(value);
      refresh();
      return api;
    };

    api.dot = (value) => {
      if (value === undefined) {
        return dot.value;
      }

      dot.value = Boolean(value);
      refresh();
      return api;
    };

    api.status = (value) => {
      if (value === undefined) {
        return status.value;
      }

      status.value = value || null;
      refresh();
      return api;
    };

    api.color = (value) => {
      if (value === undefined) {
        return color.value;
      }

      color.value = value || null;
      refresh();
      return api;
    };

    api.text = (value) => {
      if (value === undefined) {
        return textContent.value;
      }

      textContent.value = value === null || value === undefined ? null : value;
      // 内容通道：直接写内容位（显隐由绑定管），不是结构重建
      replaceChildren(
        textBox,
        value === null || value === undefined ? [] : normalizeChildren(value)
      );
      refresh();
      return api;
    };

    api.label = (value) => api.text(value);

    api.title = (value) => {
      if (value === undefined) {
        return title.value;
      }

      title.value = value ?? null;
      refresh();
      return api;
    };

    api.offset = (value) => {
      if (value === undefined) {
        return { x: offsetX.value, y: offsetY.value };
      }

      const x = Number(value?.x ?? 0);
      const y = Number(value?.y ?? 0);

      offsetX.value = Number.isFinite(x) ? x : 0;
      offsetY.value = Number.isFinite(y) ? y : 0;
      refresh();
      return api;
    };

    /** 数字 / 数字字符串 = count，其它字符串 = 内容（旧 `_setupBadge` 的兜底分支）。 */
    api.setupString = (value) => {
      if (
        typeof value === 'number' ||
        (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value)))
      ) {
        return api.count(value);
      }

      self.node().child(value);
      refreshContentFlag();
      refresh();
      return api;
    };

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupBadge` 同口径）。 */
    api.setupObject = (config) => {
      if (!isPlainObject(config)) {
        return api;
      }

      const {
        children,
        color: colorOption,
        content,
        count: countOption,
        dot: dotOption,
        label,
        offset,
        overflowCount: overflowOption,
        showZero: showZeroOption,
        status: statusOption,
        text,
        title: titleOption,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        root.setupObject(elementConfig);
      }
      if (overflowOption !== undefined) {
        api.overflowCount(overflowOption);
      }
      if (showZeroOption !== undefined) {
        api.showZero(showZeroOption);
      }
      if (countOption !== undefined) {
        api.count(countOption);
      }
      if (dotOption !== undefined) {
        api.dot(dotOption);
      }
      if (statusOption !== undefined) {
        api.status(statusOption);
      }
      if (colorOption !== undefined) {
        api.color(colorOption);
      }
      if (offset !== undefined) {
        api.offset(offset);
      }
      if (titleOption !== undefined) {
        api.title(titleOption);
      }
      if (text !== undefined) {
        api.text(text);
      } else if (label !== undefined) {
        api.text(label);
      }
      if (children !== undefined) {
        self.node().child(children);
      } else if (content !== undefined) {
        self.node().child(content);
      }

      // 内容投递会改变"有没有内容"（角标定位 / data-standalone），投递完再收一次
      refreshContentFlag();
      refresh();
      return api;
    };

    // 固定分派投递（`vBadge(节点 / 数组)`、`badge.child(x)`）在挂载时补一次内容标记
    api.whenMount = () => {
      refreshContentFlag();
      refresh();
    };

    refreshContentFlag();
    return root;
  });
}

export const vBadge = createComponentShortcut(VBadge);
