import { vNode } from '../core/v-node.js';
import { span } from '../html/index.js';
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
 * 徽标（形态 B，票 15 §4）：视图根是外壳 `span` + 内容框 + 角标 + 文本位。
 *
 * - 身份写在结构里：根 `vn: 'VBadge'`、内容框 `vn: 'VBadgeContent'`、角标 `vn: 'VBadgeCount'`、
 *   文本 `vn: 'VBadgeText'`；
 * - **匿名内容进内容框**：内容框声明成默认占位（`vn_slot: ''`），`child()` / 字符串进来的内容按
 *   引擎的 part 通道落进它（与旧节点类型覆盖 `child()` 的落位路径一致，见 §11.4 第 16 条）；
 * - 角标与文本都是**区域**（rebuildable）：内容由各自的 setup 产出，同步时只 rebuild；
 * - props 分派：本组件的键走命令，其余按元素 options 写；数字 / 数字字符串 = count、
 *   其它字符串（或节点 / 数组）= 内容（与旧 `_setupBadge` 同口径）。
 */
export function VBadge() {
  return vNode((api, self) => {
    const state = {
      badgeDotMode: false,
      color: null,
      count: null,
      dot: false,
      offsetX: 0,
      offsetY: 0,
      overflowCount: 99,
      showZero: false,
      status: null,
      textContent: null
    };

    const contentBox = span({ vn: 'VBadgeContent', vn_slot: '' }).styles({
      alignItems: 'center',
      display: 'inline-flex',
      minWidth: '0'
    });
    const badgeBox = span({ vn: 'VBadgeCount' }).styles({
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
    });
    const textBox = span({ vn: 'VBadgeText' }).styles({
      color: themeValue('color-text-secondary', '#475569'),
      display: 'none',
      fontSize: '12px',
      lineHeight: '1'
    });
    const node = span({ vn: 'VBadge' })
      .styles({
        alignItems: 'center',
        boxSizing: 'border-box',
        display: 'inline-flex',
        gap: '6px',
        lineHeight: '1',
        position: 'relative',
        verticalAlign: 'middle'
      })
      .child(contentBox, badgeBox, textBox);

    const badgeText = () => {
      const numeric = Number(state.count);

      if (Number.isFinite(numeric) && state.count !== '') {
        const max = Number(state.overflowCount) || 99;

        return numeric > max ? `${max}+` : String(state.count);
      }

      return String(state.count);
    };

    const countVisible = () => {
      if (state.count === null || state.count === undefined || state.count === '') {
        return false;
      }

      const numeric = Number(state.count);

      if (Number.isFinite(numeric) && numeric === 0) {
        return Boolean(state.showZero);
      }

      return true;
    };

    /**
     * 有没有内容：投递进来的内容在解析前只是**排在组件节点上**（`children()` 未解析时如实报排队内容），
     * 所以两个来源都看——内容框自己的子节点（`content()` 写的）+ 组件排队的内容（`child()` 投递的）。
     * 组件句柄要等 setup 返回后才存在（`self.node()` 期间取会抛），setup 期的首屏快照按"还没有内容"算。
     */
    const queuedContent = () => {
      try {
        return self.node().children();
      } catch {
        return [];
      }
    };
    const hasContent = () => contentBox.children().length > 0 || queuedContent().length > 0;

    const syncBadge = () => {
      const withContent = hasContent();
      const status = state.status;
      const dotMode = Boolean(status || state.dot);
      const visible = dotMode || countVisible();
      const background =
        state.color || (status ? statusColors[status] : themeValue('color-danger', '#ff4d4f'));

      contentBox.style('display', withContent ? 'inline-flex' : 'none');
      textBox.style(
        'display',
        state.textContent !== null && state.textContent !== '' ? 'inline-flex' : 'none'
      );
      badgeBox.style('display', visible ? 'inline-flex' : 'none');
      badgeBox.style('background', visible ? background : null);
      badgeBox.style('position', withContent ? 'absolute' : 'static');
      badgeBox.style(
        'transform',
        withContent
          ? `translate(calc(50% + ${state.offsetX}px), calc(-50% + ${state.offsetY}px))`
          : null
      );
      badgeBox.attr(
        'aria-label',
        visible ? (dotMode ? state.status || '通知' : badgeText()) : null
      );

      if (dotMode) {
        badgeBox.styles({
          borderRadius: '999px',
          height: '8px',
          lineHeight: '1',
          minWidth: '8px',
          padding: '0',
          width: '8px'
        });
      } else {
        badgeBox.styles({
          borderRadius: '10px',
          height: '18px',
          lineHeight: '1',
          minWidth: '18px',
          padding: '0 6px',
          width: null
        });
      }

      state.badgeDotMode = dotMode;
      badgeBox.rebuild();
      node.attr('data-standalone', withContent ? null : 'true');
    };

    // 角标与文本都是区域：内容由各自的 setup 产出，同步时只 rebuild
    badgeBox.setup((box) => {
      box.rebuildable();
      box.child(state.badgeDotMode ? [] : normalizeChildren(badgeText()));
    });
    textBox.setup((box) => {
      box.rebuildable();
      box.child(state.textContent === null ? [] : normalizeChildren(state.textContent));
    });

    api.content = (value) => {
      if (value === undefined) {
        return contentBox.children();
      }

      replaceChildren(contentBox, normalizeChildren(value));
      syncBadge();
      return api;
    };

    api.count = (value) => {
      if (value === undefined) {
        return state.count;
      }

      state.count = value === null || value === undefined || value === '' ? null : value;
      node.attr('data-count', state.count === null ? null : String(state.count));
      syncBadge();
      return api;
    };

    api.overflowCount = (value) => {
      if (value === undefined) {
        return state.overflowCount;
      }

      const nextValue = Number(value);

      state.overflowCount = Number.isFinite(nextValue) ? nextValue : 99;
      node.attr('data-overflow-count', String(state.overflowCount));
      syncBadge();
      return api;
    };

    api.showZero = (value) => {
      if (value === undefined) {
        return state.showZero;
      }

      state.showZero = Boolean(value);
      node.attr('data-show-zero', state.showZero ? 'true' : null);
      syncBadge();
      return api;
    };

    api.dot = (value) => {
      if (value === undefined) {
        return state.dot;
      }

      state.dot = Boolean(value);
      node.attr('data-dot', state.dot ? 'true' : null);
      syncBadge();
      return api;
    };

    api.status = (value) => {
      if (value === undefined) {
        return state.status;
      }

      state.status = value || null;
      node.attr('data-status', state.status);
      syncBadge();
      return api;
    };

    api.color = (value) => {
      if (value === undefined) {
        return state.color;
      }

      state.color = value || null;
      node.attr('data-color', state.color);
      syncBadge();
      return api;
    };

    api.text = (value) => {
      if (value === undefined) {
        return state.textContent;
      }

      state.textContent = value === null || value === undefined ? null : value;
      textBox.rebuild();
      syncBadge();
      return api;
    };

    api.label = (value) => api.text(value);

    api.title = (value) => {
      if (value === undefined) {
        return badgeBox.attr('title');
      }

      badgeBox.attr('title', value ?? null);
      return api;
    };

    api.offset = (value) => {
      if (value === undefined) {
        return { x: state.offsetX, y: state.offsetY };
      }

      const x = Number(value?.x ?? 0);
      const y = Number(value?.y ?? 0);

      state.offsetX = Number.isFinite(x) ? x : 0;
      state.offsetY = Number.isFinite(y) ? y : 0;
      syncBadge();
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
      syncBadge();
      return api;
    };

    /** props：本组件的键走命令，其余按引擎的元素分派落根元素（与旧 `_setupBadge` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const {
        children,
        color,
        content,
        count,
        dot,
        label,
        offset,
        overflowCount,
        showZero,
        status,
        text,
        title,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (overflowCount !== undefined) {
        api.overflowCount(overflowCount);
      }
      if (showZero !== undefined) {
        api.showZero(showZero);
      }
      if (count !== undefined) {
        api.count(count);
      }
      if (dot !== undefined) {
        api.dot(dot);
      }
      if (status !== undefined) {
        api.status(status);
      }
      if (color !== undefined) {
        api.color(color);
      }
      if (offset !== undefined) {
        api.offset(offset);
      }
      if (title !== undefined) {
        api.title(title);
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

      // 内容投递会改变"有没有内容"（角标定位 / data-standalone），投递完再收一次快照
      return syncBadge();
    };

    syncBadge();
    return node;
  });
}

export const vBadge = createComponentShortcut(VBadge);
