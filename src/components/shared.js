import {
  ViewNode,
  applyElementOptions as applyCoreElementOptions,
  normalizeSetupArguments
} from '../core/node.js';

export const componentClass = 'yoya-component';

export function themeValue(token, fallback) {
  return `var(--yoya-${token}, ${fallback})`;
}

export function themeBorder(token, fallback, width = '1px') {
  return `${width} solid ${themeValue(token, fallback)}`;
}

export function normalizeComponentArguments(first = null, second = null, third = null) {
  return normalizeSetupArguments(first, second, third);
}

export function applyElementOptions(node, options) {
  if (typeof node.attr === 'function' || typeof node.styles === 'function') {
    return applyCoreElementOptions(node, options);
  }

  if (typeof node.render === 'function') {
    applyCoreElementOptions(node.render(), options);
  }

  return node;
}

export function applyComponentArguments(node, options = null, callback = null) {
  applyElementOptions(node, options);

  if (typeof callback === 'function') {
    callback(node);
  }

  return node;
}

export function createComponentFactory(Component, first = null, second = null, third = null) {
  const { first: setup, options, callback } = normalizeComponentArguments(first, second, third);
  const node = setup instanceof Component ? setup : new Component(setup);
  return applyComponentArguments(node, options, callback);
}

export function applyComponentSetup(node, setup) {
  if (setup === null || setup === undefined) {
    return node;
  }

  if (typeof setup === 'function') {
    setup(node);
    return node;
  }

  if (
    setup instanceof ViewNode ||
    Array.isArray(setup) ||
    typeof setup === 'string' ||
    typeof setup === 'number'
  ) {
    node.child(setup);
    return node;
  }

  if (isPlainObject(setup)) {
    node.setup(setup);
  }

  return node;
}

export function normalizeChildren(content) {
  if (content === null || content === undefined) {
    return [];
  }

  return Array.isArray(content) ? content : [content];
}

export function replaceChildren(node, children) {
  node.children().forEach((child) => child.destroy());
  node._children = [];

  if (node._el) {
    node._el.replaceChildren();
  }

  if (children.length > 0) {
    node.child(children);
  }

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
    setup(button);
    return button;
  }

  if (isPlainObject(setup)) {
    button._setupButton(setup);
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
    setup(node);
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

export function isPlainObject(value) {
  if (Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function resolveTextValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveTextValue(item)).join('');
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value.textContent === 'function') {
    return value.textContent();
  }

  return String(value);
}
