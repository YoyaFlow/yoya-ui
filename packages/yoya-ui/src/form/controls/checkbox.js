import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import {
  createComponentShortcut,
  replaceChildren,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { applyBooleanControlProps, createBooleanControl } from './shared.js';

/**
 * 复选框（形态 B；2026-09-24 与 `VRadio` / `VSwitch` 一起收成真 B，写法规格照 `VBadge`）。
 *
 * 结构与命令收在同族的 `createBooleanControl`（见 `./shared.js`），这里只写**自己的三件事**：
 * 身份（根 + 五块部件的 `vn` 字面量）、内层 `<input type="checkbox">`、勾选态视觉（✓ 与配色）。
 */
export function VCheckbox({
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
    const view = createBooleanControl(api, {
      root: { ...rest, vn: 'VCheckbox' },
      input: { attrs: { type: 'checkbox' }, vn: 'VCheckboxInput' },
      boxes: {
        visual: {
          style: {
            alignItems: 'center',
            background: themeValue('color-surface', '#ffffff'),
            border: themeBorder('color-border-strong', '#cbd5e1'),
            borderRadius: '4px',
            boxSizing: 'border-box',
            color: themeValue('color-text-inverse', '#ffffff'),
            display: 'inline-flex',
            height: '16px',
            justifyContent: 'center',
            lineHeight: '1',
            transition: 'background 120ms ease, border-color 120ms ease',
            width: '16px'
          },
          vn: 'VCheckboxVisual'
        },
        content: { vn: 'VCheckboxContent' },
        label: { vn: 'VCheckboxLabel' },
        description: { vn: 'VCheckboxDescription' }
      },
      /** 勾选态视觉：底色 / 描边 / 勾号（原来在 `_syncVisual` 里）。 */
      syncVisual: (visualBox, enabled) => {
        visualBox.styles({
          background: enabled
            ? themeValue('color-primary', '#2563eb')
            : themeValue('color-surface', '#ffffff'),
          borderColor: enabled
            ? themeValue('color-primary', '#2563eb')
            : themeValue('color-border-strong', '#cbd5e1'),
          color: enabled ? themeValue('color-text-inverse', '#ffffff') : 'transparent'
        });
        replaceChildren(visualBox, enabled ? ['✓'] : []);
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

export const vCheckbox = createComponentShortcut(VCheckbox, { props: true });
