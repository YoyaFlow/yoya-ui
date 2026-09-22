import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { ViewNode, vText } from '../core/index.js';
import { span } from '../html/index.js';
import { createComponentShortcut, themeValue } from '../components/shared.js';

const statusColors = {
  default: themeValue('color-text-muted', '#8c8c8c'),
  error: themeValue('color-danger', '#f5222d'),
  processing: themeValue('color-info', '#1677ff'),
  success: themeValue('color-success', '#52c41a'),
  warning: themeValue('color-warning', '#faad14')
};

/** 值位置上的活文本：`null` / `undefined` 统一成空串（句柄走的是文本通道，会 `String(...)`）。 */
const asText = (value) => computed(() => value.value ?? '');

/**
 * 徽标（形态 B，`AGENTS.md`「Component Writing Rules」R1–R12 的参考实现）。
 *
 * - **一个业务组件函数 = 一个边界**（R1）；整棵树写在最后那个 `return` 里，子节点用回调往下嵌（R2）。
 * - **props 在参数表里解构、`...rest` 摊进根元素工厂**（R3）；属性 / 样式写进工厂参数（R4）。
 * - **静态样式与状态几何都在 `yoya.ui.css`**（R5 / R10）：JS 只留随状态变的绑定，
 *   偏移这类几何走 CSS 变量。
 * - **数据驱动**（R6 / R9）：`count` / `status` / `text` / `children` 给句柄就是活值；
 *   读句柄的派生一律 `computed`；命令只写数据，**不搬结构**（没有部件句柄、没有 `replaceChildren`）。
 * - **节点内容只在构建期落位**：运行期换节点请重建组件（要换的是文本就传句柄或走 `text()`）。
 * - **非必要不用 `rebuild`**（R7）：点模式"没有文本"用 `mountable()`。
 * - **构建之后落位的写入要收口**（R8）：由命令那一层统一 `flush()` 一次（幂等）。
 */
export function VBadge({
  children,
  color = null,
  content,
  count = null,
  dot = false,
  label,
  offset,
  overflowCount,
  showZero = false,
  status = null,
  text,
  title = null,
  ...rest
} = {}) {
  const value = asSignal(count === '' ? null : count);
  // 归一化的 props 也要保活：**状态**是"句柄原样 / 普通值包 ref"，归一放在**读时**的 computed 上
  // （构建期直接 `Boolean(…)` / `Number(…)` 会把传进来的句柄吃成常量，静默丢活值）。
  const overflowState = asSignal(overflowCount);
  const showZeroState = asSignal(showZero);
  const dotState = asSignal(dot);
  const overflow = computed(() => {
    const numeric = Number(overflowState.value);

    return Number.isFinite(numeric) ? numeric : 99;
  });
  const showZeroValue = computed(() => Boolean(showZeroState.value));
  const dotValue = computed(() => Boolean(dotState.value));
  const overflowWritten = ref(overflowCount !== undefined);
  const statusValue = asSignal(status || null);
  const colorValue = asSignal(color || null);
  const offsetX = ref(Number.isFinite(Number(offset?.x)) ? Number(offset.x) : 0);
  const offsetY = ref(Number.isFinite(Number(offset?.y)) ? Number(offset.y) : 0);
  const titleValue = asSignal(title);

  // 内容：节点 → 构建期落位；文本 / 句柄 → 数据（`content()` 只写这份数据）
  const initialContent = children ?? content ?? null;
  const contentNode = initialContent instanceof ViewNode ? initialContent : null;
  const contentValue = asSignal(contentNode === null ? initialContent : null);
  const contentText = asText(contentValue);
  // 文本位：同上
  const textValue = asSignal(text !== undefined ? text : (label ?? null));
  const textText = asText(textValue);

  // 派生（读句柄 → computed）
  const countVisible = computed(() => {
    if (value.value === null || value.value === undefined || value.value === '') {
      return false;
    }

    const numeric = Number(value.value);

    return Number.isFinite(numeric) && numeric === 0 ? Boolean(showZeroValue.value) : true;
  });
  const dotMode = computed(() => Boolean(statusValue.value || dotValue.value));
  const visible = computed(() => dotMode.value || countVisible.value);
  const countText = computed(() => {
    const numeric = Number(value.value);

    if (Number.isFinite(numeric) && value.value !== '') {
      const max = Number(overflow.value) || 99;

      return numeric > max ? `${max}+` : String(value.value);
    }

    return String(value.value);
  });
  /** 有没有内容 —— 看**数据**（不读结构）：有内容时角标浮到右上角（CSS 用这个属性开关）。 */
  const hasContent = computed(
    () => contentNode !== null || (contentValue.value !== null && contentValue.value !== '')
  );
  // 几何 → CSS 变量（R10）：`var(--yoya-badge-offset-x, 0px)` 兜默认值，JS 不拼 transform
  const offsetXText = computed(() => `${offsetX.value}px`);
  const offsetYText = computed(() => `${offsetY.value}px`);

  return vNode((api) => {
    api.content = (next) => {
      if (next === undefined) {
        return contentValue.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vBadge.content(node)：节点内容请在构建期用 props.children 给（content() 只写数据）。'
        );
      }

      contentValue.value = next ?? null;
      return api;
    };

    api.count = (next) => {
      if (next === undefined) {
        return value.value;
      }

      value.value = next === null || next === undefined || next === '' ? null : next;
      return api;
    };

    api.overflowCount = (next) => {
      if (next === undefined) {
        return overflow.value;
      }

      const parsed = Number(next);

      overflowState.value = Number.isFinite(parsed) ? parsed : 99;
      overflowWritten.value = true;
      return api;
    };

    api.showZero = (next) => {
      if (next === undefined) {
        return showZeroValue.value;
      }

      showZeroState.value = Boolean(next);
      return api;
    };

    api.dot = (next) => {
      if (next === undefined) {
        return dotValue.value;
      }

      dotState.value = Boolean(next);
      return api;
    };

    api.status = (next) => {
      if (next === undefined) {
        return statusValue.value;
      }

      statusValue.value = next || null;
      return api;
    };

    api.color = (next) => {
      if (next === undefined) {
        return colorValue.value;
      }

      colorValue.value = next || null;
      return api;
    };

    api.text = (next) => {
      if (next === undefined) {
        return textValue.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError('vBadge.text(node)：text 只收文本（节点内容请用 props.children）。');
      }

      textValue.value = next ?? null;
      return api;
    };

    api.label = (next) => api.text(next);

    api.title = (next) => {
      if (next === undefined) {
        return titleValue.value;
      }

      titleValue.value = next ?? null;
      return api;
    };

    api.offset = (next) => {
      if (next === undefined) {
        return { x: offsetX.value, y: offsetY.value };
      }

      const x = Number(next?.x ?? 0);
      const y = Number(next?.y ?? 0);

      offsetX.value = Number.isFinite(x) ? x : 0;
      offsetY.value = Number.isFinite(y) ? y : 0;
      return api;
    };

    /** 位置参数：数字 / 数字串 = 数量，其余字符串 = 内容（迁移前 `_setupBadge` 的兜底分支同口径）。 */
    api.setupString = (next) => {
      const numeric =
        typeof next === 'number' ||
        (typeof next === 'string' && next.trim() !== '' && !Number.isNaN(Number(next)));

      return numeric ? api.count(next) : api.content(next);
    };

    /**
     * 命令的收口（R8）：还没落地时写完状态补一次求值，首屏就是终值；落地之后订阅接管，
     * 这里只剩一次 `_el` 读。覆盖 `vBadge(5)` 这类位置参数与"建好就配置"的写法。
     */
    // 结构（R2）：一个 return 装下整棵树；属性 / 样式在工厂参数里（R4），子节点在回调里往下嵌
    return span(
      {
        ...rest,
        'data-color': colorValue,
        'data-count': computed(() => (value.value === null ? null : String(value.value))),
        'data-dot': computed(() => (dotValue.value ? 'true' : null)),
        'data-overflow-count': computed(() =>
          overflowWritten.value ? String(overflow.value) : null
        ),
        'data-show-zero': computed(() => (showZeroValue.value ? 'true' : null)),
        'data-standalone': computed(() => (hasContent.value ? null : 'true')),
        'data-status': statusValue,
        vn: 'VBadge'
      },
      (root) => {
        root.child(
          // 内容位：位置由组件写死（R11：单内容位不做部件投递）。
          // 节点在构建期落位；文本 / 句柄是活值 —— 都只是"把数据放到位置上"，没有部件句柄
          span({ vn: 'VBadgeContent' }, (box) => {
            if (contentNode !== null) {
              box.child(contentNode);
            }
            // 文本活值：没有文本时不挂（避免留一个空文本节点）
            box.child(vText(contentText).mountable(computed(() => contentText.value !== '')));
          }),

          // 角标位：随状态变的样式 / 属性在工厂参数里；子节点在回调里
          span(
            {
              attrs: {
                'aria-label': computed(() =>
                  visible.value
                    ? dotMode.value
                      ? statusValue.value || '通知'
                      : countText.value
                    : null
                ),
                title: titleValue
              },
              style: {
                '--yoya-badge-offset-x': offsetXText,
                '--yoya-badge-offset-y': offsetYText,
                background: computed(() =>
                  visible.value
                    ? colorValue.value ||
                      (statusValue.value
                        ? statusColors[statusValue.value]
                        : themeValue('color-danger', '#ff4d4f'))
                    : null
                ),
                display: computed(() => (visible.value ? 'inline-flex' : 'none'))
              },
              vn: 'VBadgeCount'
            },
            (box) => {
              // 点模式"没有文本"= 条件挂载（节点在、只是不在 DOM），不重建结构（R7）
              box.child(vText(countText).mountable(computed(() => !dotMode.value)));
            }
          ),

          // 文本位：显隐是绑定，内容是数据（`text()` 命令只写这份数据）
          span(
            {
              style: {
                display: computed(() =>
                  textValue.value === null || textValue.value === '' ? 'none' : 'inline-flex'
                )
              },
              vn: 'VBadgeText'
            },
            (box) => box.child(vText(textText).mountable(computed(() => textText.value !== '')))
          )
        );
      }
    );
  });
}

export const vBadge = createComponentShortcut(VBadge, { props: true });
