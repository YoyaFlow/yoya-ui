import { vNode } from '../../core/v-node.js';
import { span } from '../../html/index.js';
import {
  createComponentShortcut,
  replaceChildren,
  themeBorder,
  themeValue
} from '../../components/shared.js';
import { applyBooleanControlProps, createBooleanControl } from './shared.js';

/**
 * 单选框（形态 B；2026-09-24 与 `VCheckbox` / `VSwitch` 一起收成真 B，写法规格照 `VBadge`）。
 *
 * 结构与命令收在同族的 `createBooleanControl`（见 `./shared.js`）；这里写自己的三件事 + **同名互斥**：
 * 同名（`name()`）的独立单选框分在一组，勾选其中一个时把同组其余的清掉——原来靠"包一层 `this.checked`"
 * 实现，闭包化后包的是 `api.checked`（`hydrateSnapshot` 走同一个 `api.checked`，所以 SSR 回读也走互斥）。
 */
export function VRadio({
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
      root: { ...rest, vn: 'VRadio' },
      input: { attrs: { type: 'radio' }, vn: 'VRadioInput' },
      boxes: {
        visual: {
          style: {
            alignItems: 'center',
            background: themeValue('color-surface', '#ffffff'),
            border: themeBorder('color-border-strong', '#cbd5e1'),
            borderRadius: '999px',
            boxSizing: 'border-box',
            display: 'inline-flex',
            height: '16px',
            justifyContent: 'center',
            lineHeight: '1',
            transition: 'background 120ms ease, border-color 120ms ease',
            width: '16px'
          },
          vn: 'VRadioVisual'
        },
        content: { vn: 'VRadioContent' },
        label: { vn: 'VRadioLabel' },
        description: { vn: 'VRadioDescription' }
      },
      /** 勾选态视觉：描边 + 中间那颗点（原来在 `_syncVisual` 里）。 */
      syncVisual: (visualBox, enabled) => {
        visualBox.styles({
          borderColor: enabled
            ? themeValue('color-primary', '#2563eb')
            : themeValue('color-border-strong', '#cbd5e1')
        });
        replaceChildren(visualBox, enabled ? [createRadioDot()] : []);
      }
    });

    /** 同名互斥：勾上自己之前先把同组其他项清掉（迁移前包 `checked` 的同一口径）。 */
    const baseChecked = api.checked;

    api.checked = (next) => {
      if (next !== undefined && next && api.name()) {
        const group = radioGroups.get(api.name());

        group?.forEach((other) => {
          if (other !== api && other.checked()) {
            other.checked(false);
          }
        });
      }

      return baseChecked(next);
    };

    /** `name` 换名要换组（先退旧组、再进新组），读写仍走 `createBooleanControl` 装的那份。 */
    const baseName = api.name;

    api.name = (next) => {
      if (next === undefined) {
        return baseName();
      }

      unregisterRadio(api);
      baseName(next);
      registerRadio(api);
      return api;
    };

    api.whenDestroy = () => {
      unregisterRadio(api);
    };

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

    registerRadio(api);

    return view;
  });
}

/** 同名单选框的分组表（`vRadio({ name })` 之间互斥；`destroy()` 时退组）。 */
export const radioGroups = new Map();

function registerRadio(radio) {
  const name = radio.name();
  if (!name) {
    return;
  }

  let group = radioGroups.get(name);
  if (!group) {
    group = new Set();
    radioGroups.set(name, group);
  }
  group.add(radio);
}

function unregisterRadio(radio) {
  const name = radio.name();
  if (!name) {
    return;
  }

  const group = radioGroups.get(name);
  group?.delete(radio);
  if (group && group.size === 0) {
    radioGroups.delete(name);
  }
}

function createRadioDot() {
  return span({
    style: {
      background: themeValue('color-primary', '#2563eb'),
      borderRadius: '999px',
      height: '8px',
      width: '8px'
    },
    vn: 'VRadioDot'
  });
}

export const vRadio = createComponentShortcut(VRadio, { props: true });

export { registerRadio, unregisterRadio, createRadioDot };
