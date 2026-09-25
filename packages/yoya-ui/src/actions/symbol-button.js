import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { button } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

/**
 * vSymbolButton 是只显示符号/图标的轻量按钮：无边框、无轮廓、
 * 透明背景，hover 时给出细微底色。适合工具栏、源码/复制等场景。
 */
/**
 * 符号按钮（形态 B）：只显示符号 / 图标的轻量按钮——无边框、透明背景，hover 时给细微底色。
 *
 * - 静态样式与 hover 底色全在 `yoya.ui.css`（R5）：JS 里一条行内样式都不留；
 * - 内容位只有一处（R11）：按钮根自己就是内容位，`icon()` 换的就是根的子节点；
 * - props 走调用、嵌套走 `.setup()`：`vSymbolButton({ icon, ariaLabel, title })`。
 */
export function VSymbolButton({ ariaLabel, icon, title, ...rest } = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;
  let rootNode = null;
  let iconContent = icon;

  return vNode((api) => {
    /** 内容命令：直接换根的子节点（迁移前 `replaceChildren(this, …)` 同口径）。 */
    api.icon = (content) => {
      iconContent = content;
      if (rootNode) {
        replaceChildren(rootNode, normalizeChildren(content ?? ''));
      }
      return api;
    };

    /** 读写无障碍标签。 */
    api.ariaLabel = (value) =>
      value === undefined
        ? rootNode?.attr('aria-label')
        : (rootNode?.attr('aria-label', value), api);

    /** 位置参数：字符串 / 数字 / 节点 = 图标内容（迁移前 `_setupSymbolButton` 的兜底分支同口径）。 */
    api.setupString = (content) => api.icon(content);

    return button(
      {
        ...elementConfig,
        attrs: {
          'aria-label': ariaLabel,
          title,
          type: 'button',
          ...restAttrs
        },
        style: restStyle ?? {},
        vn: 'VSymbolButton'
      },
      (root) => {
        rootNode = root;
        if (iconContent !== undefined) {
          root.child(normalizeChildren(iconContent));
        }
      }
    );
  });
}

export const vSymbolButton = createComponentShortcut(VSymbolButton, { props: true });
