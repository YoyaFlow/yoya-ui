import { div } from '../html/index.js';
import { vNode } from '../core/v-node.js';
import {
  componentClass,
  createComponentShortcut,
  themeBorder,
  themeValue
} from '../components/shared.js';

/**
 * `VCard` 是**组件定义函数**（名字 = 身份 = 导出名），`vCard` 是它的**快捷方法**
 * （`page.vCard(…)` / 直接调用都走它，由 registerChildFactories 注册到父节点上）。
 *
 * 参数分派：api 上可以覆盖 `setupString` / `setupObject`；**不覆盖时用根元素的同名实现**——
 * 这里没有覆盖，所以 `first / second / third` 直接交给根元素（字符串/数字 = 文本、对象 = options、节点 = 子节点）。
 */
export function VCard() {
  return vNode(() => {
    // 需要自定义参数语义时在这里覆盖：api.setupString / api.setupObject
    return div({
      class: `${componentClass} yoya-vcard`,
      style: {
        background: themeValue('color-surface', '#ffffff'),
        border: themeBorder('color-border', '#d8dee8'),
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
        color: themeValue('color-text-strong', '#111827'),
        overflow: 'hidden'
      },
      vn: 'VCard'
    });
  });
}

export const vCard = createComponentShortcut(VCard);

export function VCardHeader() {
  return vNode(() => {
    return div({
      class: 'yoya-vcard-header',
      style: {
        borderBottom: themeBorder('color-border-faint', '#e5e7eb'),
        fontWeight: '700',
        padding: '12px 16px'
      },
      vn: 'VCardHeader'
    });
  });
}

export const vCardHeader = createComponentShortcut(VCardHeader);

export function VCardBody() {
  return vNode(() => {
    return div({ class: 'yoya-vcard-body', style: { padding: '16px' }, vn: 'VCardBody' });
  });
}

export const vCardBody = createComponentShortcut(VCardBody);

export function VCardFooter() {
  return vNode(() => {
    return div({
      class: 'yoya-vcard-footer',
      style: {
        alignItems: 'center',
        background: themeValue('color-surface-hover', '#f8fafc'),
        borderTop: themeBorder('color-border-faint', '#e5e7eb'),
        display: 'flex',
        gap: '8px',
        justifyContent: 'flex-end',
        padding: '12px 16px'
      },
      vn: 'VCardFooter'
    });
  });
}

export const vCardFooter = createComponentShortcut(VCardFooter);
