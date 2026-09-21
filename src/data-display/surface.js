import { createComponentShortcut, themeBorder, themeValue } from '../components/shared.js';
import { vNode } from '../core/v-node.js';
import { div } from '../html/index.js';
import { vSlot } from '../layout/v-slot.js';

/**
 * VCard 家族：**身份 = `vn`**（不再有 `yoya-component` / `yoya-vcard*` 类名），
 * part 走 **`vn_slot` 通道**（VSlot 零布局占位），结构位置由组件自己定。
 *
 * - part 是 A 形态薄工厂（直接返回元素）：`vn_slot` 标记 = 它在卡片里的位置；
 * - `vCardHeader/Body/Footer` 是快捷方法：走 setupFunction / setupString / setupObject 分派；
 * - `VCard` 是 B 形态：结构里放三个 VSlot 占位，命令把 part 投进对应占位（替换语义）。
 */
export function VCardHeader() {
  return div({
    style: {
      borderBottom: themeBorder('color-border-faint', '#e5e7eb'),
      fontWeight: '700',
      padding: '12px 16px'
    },
    vn: 'VCardHeader',
    vn_slot: 'header'
  });
}

export function VCardBody() {
  return div({
    style: { padding: '16px' },
    vn: 'VCardBody',
    vn_slot: 'body'
  });
}

export function VCardFooter() {
  return div({
    style: {
      alignItems: 'center',
      background: themeValue('color-surface-hover', '#f8fafc'),
      borderTop: themeBorder('color-border-faint', '#e5e7eb'),
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
      padding: '12px 16px'
    },
    vn: 'VCardFooter',
    vn_slot: 'footer'
  });
}

export const vCardHeader = createComponentShortcut(VCardHeader);
export const vCardBody = createComponentShortcut(VCardBody);
export const vCardFooter = createComponentShortcut(VCardFooter);

export function VCard() {
  return vNode((api, self) => {
    // part 命令：part 自带 `vn_slot` 标记，child() 进来后由引擎放进同名占位（一占位一份，重复调用即替换）。
    // 命令里不找占位、不存 `let root`——位置由结构里的 VSlot 占位与 part 自己的标记共同决定。
    api.vCardHeader = (setup) => self.node().child(vCardHeader(setup));
    api.vCardBody = (setup) => self.node().child(vCardBody(setup));
    api.vCardFooter = (setup) => self.node().child(vCardFooter(setup));

    // 结构 + 槽位：三个零布局占位，位置由结构决定（与调用顺序无关）
    return div(
      {
        style: {
          background: themeValue('color-surface', '#ffffff'),
          border: themeBorder('color-border', '#d8dee8'),
          borderRadius: '8px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
          color: themeValue('color-text-strong', '#111827'),
          overflow: 'hidden'
        },
        vn: 'VCard'
      },
      (element) => {
        element.child(
          vSlot({ name: 'header' }),
          vSlot({ name: 'body' }),
          vSlot({ name: 'footer' })
        );
      }
    );
  });
}

export const vCard = createComponentShortcut(VCard);
