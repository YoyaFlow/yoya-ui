// 组件**实现细节**（按族划分的样式构造 / 槽位装配 / 列表与几何助手）。
//
// 契约级助手（`createComponentShortcut` / `applyComponentArguments` / `themeValue` …）在
// `@yoyaflow/yoya-core`（票 06 §一）：第三方组件作者只装 core 就能写组件；这里把它们
// 再导出一次，官方组件继续从 `../components/shared.js` 一处导入。
export * from '@yoyaflow/yoya-core/internal/core/component-authoring.js';
// `applyElementOptions` 的实现只在 core 的节点层（同绑定再导出，见 core 侧注释），
// component-authoring 的聚合面不含它，所以这里显式补一条。
export { applyElementOptions } from '@yoyaflow/yoya-core/internal/core/node.js';
// 同模块内部助手（ui 保留下来的槽位装配要用它）
import { runBuilder } from '@yoyaflow/yoya-core/internal/core/component-authoring.js';
import {
  themeValue,
  applyComponentSetup,
  isPlainObject
} from '@yoyaflow/yoya-core/internal/core/component-authoring.js';
import { viewRootOf } from '@yoyaflow/yoya-core/internal/core/node.js';

export function createListItemKey(prefix = 'item') {
  const keys = new WeakMap();
  let serial = 0;

  return (item) => {
    let key = keys.get(item);

    if (key === undefined) {
      key = `${prefix}:${serial}`;
      serial += 1;
      keys.set(item, key);
    }

    return key;
  };
}

export function replaceChildren(node, children) {
  // 引擎的元素级口子：真清空（连带 DOM）+ 落新内容（组件代码不碰 `_el`）
  node.replaceChildren(children);
  return node;
}

export function removeChild(parent, child) {
  parent._children = parent.children().filter((existingChild) => existingChild !== child);
  return parent;
}

export function setupButtonSlot(button, setup) {
  if (setup === null || setup === undefined) {
    return button;
  }

  if (typeof setup === 'function') {
    runBuilder(button, setup);
    return button;
  }

  if (isPlainObject(setup)) {
    // 按钮可能是 vNode 组件（成员是 ComponentNode）：私有构造入口在**视图根**（节点类型）上
    (viewRootOf(button) ?? button)._setupButton(setup);
    return button;
  }

  button.label(setup);
  return button;
}

export function setupContentSlot(node, setup) {
  replaceChildren(node, []);

  if (setup === null || setup === undefined) {
    return node;
  }

  if (typeof setup === 'function') {
    runBuilder(node, setup);
    return node;
  }

  applyComponentSetup(node, setup);
  return node;
}

export function dropdownPlacementStyles(placement) {
  const base = {
    bottom: null,
    left: null,
    right: null,
    top: null
  };
  const placements = {
    'bottom-end': { right: '0', top: 'calc(100% + 6px)' },
    'bottom-start': { left: '0', top: 'calc(100% + 6px)' },
    'top-end': { bottom: 'calc(100% + 6px)', right: '0' },
    'top-start': { bottom: 'calc(100% + 6px)', left: '0' }
  };

  return { ...base, ...(placements[placement] || placements['bottom-start']) };
}

export function normalizePoint(pointOrX, y) {
  if (pointOrX && typeof pointOrX === 'object') {
    return {
      x: Number(pointOrX.clientX ?? pointOrX.x ?? 0),
      y: Number(pointOrX.clientY ?? pointOrX.y ?? 0)
    };
  }

  return {
    x: Number(pointOrX || 0),
    y: Number(y || 0)
  };
}

export function buttonVariantStyles(variant) {
  const variants = {
    danger: {
      background: themeValue('color-danger', '#dc2626'),
      borderColor: themeValue('color-danger-hover', '#b91c1c'),
      boxShadow: '0 1px 2px rgba(185, 28, 28, 0.16)',
      color: themeValue('color-text-inverse', '#ffffff'),
      outline: 'none',
      outlineOffset: '2px',
      opacity: '1',
      transform: 'translateY(0px)'
    },
    ghost: {
      background: 'transparent',
      borderColor: 'transparent',
      boxShadow: 'none',
      color: themeValue('color-primary', '#2563eb'),
      outline: 'none',
      outlineOffset: '2px',
      opacity: '1',
      transform: 'translateY(0px)'
    },
    primary: {
      background: themeValue('color-primary', '#2563eb'),
      borderColor: themeValue('color-primary-hover', '#1d4ed8'),
      boxShadow: '0 1px 2px rgba(37, 99, 235, 0.18)',
      color: themeValue('color-text-inverse', '#ffffff'),
      outline: 'none',
      outlineOffset: '2px',
      opacity: '1',
      transform: 'translateY(0px)'
    },
    secondary: {
      background: themeValue('color-surface', '#ffffff'),
      borderColor: themeValue('color-border-strong', '#cbd5e1'),
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
      color: themeValue('color-text', '#1f2937'),
      outline: 'none',
      outlineOffset: '2px',
      opacity: '1',
      transform: 'translateY(0px)'
    }
  };

  return variants[variant] || variants.secondary;
}

export function buttonInteractionStyles(variant, interaction = 'rest') {
  const base = buttonVariantStyles(variant);
  const variants = {
    danger: {
      active: {
        background: themeValue('color-danger-active', '#991b1b'),
        borderColor: themeValue('color-danger-deep', '#7f1d1d'),
        boxShadow: 'inset 0 1px 2px rgba(127, 29, 29, 0.24)',
        transform: 'translateY(0px)'
      },
      focus: {
        outline: `3px solid ${themeValue('color-danger-ring', 'rgba(220, 38, 38, 0.24)')}`
      },
      hover: {
        background: themeValue('color-danger-hover', '#b91c1c'),
        borderColor: themeValue('color-danger-active', '#991b1b'),
        boxShadow: '0 8px 18px rgba(220, 38, 38, 0.22)',
        transform: 'translateY(-1px)'
      }
    },
    ghost: {
      active: {
        background: themeValue('color-primary-active-subtle', '#dbeafe'),
        borderColor: themeValue('color-primary-border', '#bfdbfe'),
        boxShadow: 'none',
        transform: 'translateY(0px)'
      },
      focus: {
        outline: `3px solid ${themeValue('color-primary-ring', 'rgba(37, 99, 235, 0.22)')}`
      },
      hover: {
        background: themeValue('color-primary-subtle', '#eff6ff'),
        borderColor: themeValue('color-primary-border', '#bfdbfe'),
        boxShadow: 'none',
        transform: 'translateY(-1px)'
      }
    },
    primary: {
      active: {
        background: themeValue('color-primary-active', '#1e40af'),
        borderColor: themeValue('color-primary-deep', '#1e3a8a'),
        boxShadow: 'inset 0 1px 2px rgba(30, 58, 138, 0.28)',
        transform: 'translateY(0px)'
      },
      focus: {
        outline: `3px solid ${themeValue('color-primary-ring', 'rgba(37, 99, 235, 0.28)')}`
      },
      hover: {
        background: themeValue('color-primary-hover', '#1d4ed8'),
        borderColor: themeValue('color-primary-active', '#1e40af'),
        boxShadow: '0 8px 18px rgba(37, 99, 235, 0.24)',
        transform: 'translateY(-1px)'
      }
    },
    secondary: {
      active: {
        background: themeValue('color-surface-active', '#eef2f7'),
        borderColor: themeValue('color-border-muted', '#94a3b8'),
        boxShadow: 'inset 0 1px 2px rgba(15, 23, 42, 0.12)',
        transform: 'translateY(0px)'
      },
      focus: {
        outline: `3px solid ${themeValue('color-border-ring', 'rgba(100, 116, 139, 0.24)')}`
      },
      hover: {
        background: themeValue('color-surface-hover', '#f8fafc'),
        borderColor: themeValue('color-border-muted', '#94a3b8'),
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.10)',
        transform: 'translateY(-1px)'
      }
    }
  };

  if (interaction === 'disabled') {
    return {
      ...base,
      boxShadow: 'none',
      cursor: 'not-allowed',
      opacity: '0.58',
      outline: 'none',
      transform: 'translateY(0px)'
    };
  }

  const variantStates = variants[variant] || variants.secondary;
  return {
    ...base,
    ...(variantStates[interaction] || {})
  };
}

export function buttonSizeStyles(size) {
  const sizes = {
    large: {
      fontSize: '15px',
      minHeight: '38px',
      padding: '0 16px'
    },
    medium: {
      fontSize: '14px',
      minHeight: '34px',
      padding: '0 14px'
    },
    small: {
      fontSize: '13px',
      minHeight: '30px',
      padding: '0 10px'
    }
  };

  return sizes[size] || sizes.medium;
}

export function messageTypeStyles(type) {
  const styles = {
    error: {
      background: themeValue('color-danger-subtle', '#fef2f2'),
      borderColor: themeValue('color-danger-border', '#fecaca'),
      color: themeValue('color-danger-text', '#991b1b')
    },
    info: {
      background: themeValue('color-info-subtle', '#eff6ff'),
      borderColor: themeValue('color-info-border', '#bfdbfe'),
      color: themeValue('color-info-text', '#1e3a8a')
    },
    success: {
      background: themeValue('color-success-subtle', '#ecfdf5'),
      borderColor: themeValue('color-success-border', '#bbf7d0'),
      color: themeValue('color-success-text', '#166534')
    },
    warning: {
      background: themeValue('color-warning-subtle', '#fffbeb'),
      borderColor: themeValue('color-warning-border', '#fde68a'),
      color: themeValue('color-warning-text', '#92400e')
    }
  };

  return styles[type] || styles.info;
}

export function placementStyles(placement) {
  const base = {
    bottom: null,
    left: null,
    right: null,
    top: null,
    transform: null
  };
  const placements = {
    'bottom-left': { bottom: '16px', left: '16px' },
    'bottom-right': { bottom: '16px', right: '16px' },
    bottom: { bottom: '16px', left: '50%', transform: 'translateX(-50%)' },
    'top-left': { left: '16px', top: '16px' },
    'top-right': { right: '16px', top: '16px' },
    top: { left: '50%', top: '16px', transform: 'translateX(-50%)' }
  };

  return { ...base, ...(placements[placement] || placements['top-right']) };
}

export function normalizeMessageOptions(options = {}) {
  if (typeof options === 'number') {
    return { duration: options };
  }

  return options || {};
}
