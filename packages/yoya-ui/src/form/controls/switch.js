import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { span } from '@yoyaflow/yoya-core/html';
import { createComponentShortcut, themeBorder, themeValue } from '../../components/shared.js';
import { applyBooleanControlProps, createBooleanControl } from './shared.js';

/**
 * 开关（形态 B；2026-09-24 与 `VCheckbox` / `VRadio` 一起收成真 B，写法规格照 `VBadge`）。
 *
 * 结构与命令收在同族的 `createBooleanControl`（见 `./shared.js`）；这里写自己的三件事：
 * 身份（根 + 六块部件的 `vn` 字面量）、内层 `<input type="checkbox">`（开关在语义上就是一个复选框）、
 * 勾选态视觉（轨道配色 + 滑块位移）。滑块是**视觉盒里的常驻件**（`decorateVisual` 建一次、`syncVisual` 只改它的 `transform`）。
 */
export function VSwitch({
  checked,
  children,
  content,
  description,
  disabled,
  label: labelContent,
  name,
  optionValue,
  required,
  text,
  value,
  ...rest
} = {}) {
  return vNode((api) => {
    let thumbBox = null;

    const view = createBooleanControl(api, {
      root: { ...rest, vn: 'VSwitch' },
      input: { attrs: { type: 'checkbox' }, vn: 'VSwitchInput' },
      boxes: {
        visual: {
          style: {
            background: themeValue('color-border-strong', '#cbd5e1'),
            border: themeBorder('color-border-strong', '#cbd5e1'),
            borderRadius: '999px',
            boxSizing: 'border-box',
            display: 'inline-flex',
            height: '22px',
            padding: '2px',
            position: 'relative',
            transition: 'background 120ms ease, border-color 120ms ease',
            width: '40px'
          },
          vn: 'VSwitchVisual'
        },
        content: { vn: 'VSwitchContent' },
        label: { vn: 'VSwitchLabel' },
        description: { vn: 'VSwitchDescription' }
      },
      /** 滑块：常驻件（建一次），勾选态只改它的位移。 */
      decorateVisual: (visualBox) => {
        thumbBox = span({
          style: {
            background: themeValue('color-surface', '#ffffff'),
            borderRadius: '999px',
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.18)',
            height: '16px',
            transform: 'translateX(0)',
            transition: 'transform 120ms ease',
            width: '16px'
          },
          vn: 'VSwitchThumb'
        });

        visualBox.child(thumbBox);
      },
      /** 勾选态视觉：轨道配色 + 滑块位移（原来在 `_syncVisual` 里）。 */
      syncVisual: (visualBox, enabled) => {
        visualBox.styles({
          background: enabled
            ? themeValue('color-primary', '#2563eb')
            : themeValue('color-border-strong', '#cbd5e1'),
          borderColor: enabled
            ? themeValue('color-primary', '#2563eb')
            : themeValue('color-border-strong', '#cbd5e1')
        });
        thumbBox.style('transform', enabled ? 'translateX(18px)' : 'translateX(0)');
      }
    });

    /** 位置参数：字符串 / 数字 = 标签（迁移前 `_setupBoolean` 的兜底分支同口径）。 */
    api.setupString = (next) => {
      api.label(next);
      return api;
    };

    applyBooleanControlProps(api, {
      checked,
      children,
      content,
      description,
      disabled,
      label: labelContent,
      name,
      optionValue,
      required,
      text,
      value
    });

    return view;
  });
}

export const vSwitch = createComponentShortcut(VSwitch, { props: true });
