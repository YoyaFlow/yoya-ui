import { createComponentShortcut } from '../components/shared.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { div } from '@yoyaflow/yoya-core/html';
import { vSlot } from '../layout/v-slot.js';

/**
 * VCard 家族：**身份 = `vn`**（不再有 `yoya-component` / `yoya-vcard*` 类名），
 * part 走 **`to_slot` → `vn_slot` 通道**（内容声明投递目标，结构用 VSlot 零布局落点），
 * 结构位置由组件自己定。
 *
 * - part 是 A 形态薄工厂（直接返回元素）：`to_slot` 标记 = 它在卡片里的位置（结构侧的 `vn_slot` 落点由卡片声明）；
 * - `vCardHeader/Body/Footer` 是快捷方法：走 setupFunction / setupString / setupObject 分派；
 * - `VCard` 是 B 形态：结构里放三个 VSlot 落点，命令把 part 投进对应落点（替换语义）。
 * - 静态样式全在 `yoya.ui.css`（R5）：根一条 + 每个 part 一条。part 可以脱离卡片单独用
 *   （`vCardBody(…)` 常常当普通容器），所以 part 规则不带祖先选择器。
 */
export function VCardHeader() {
  return div({
    vn: 'VCardHeader',
    to_slot: 'header'
  });
}

export function VCardBody() {
  return div({ vn: 'VCardBody', to_slot: 'body' });
}

export function VCardFooter() {
  return div({ vn: 'VCardFooter', to_slot: 'footer' });
}

/**
 * @genui 卡片头部区
 * @genui.contract children: 节点数组
 * @genui.use 卡片标题行
 * @genui.notFor 正文内容（放 vCardBody）
 * @genui.example {"type":"vCardHeader","children":[{"type":"h3","text":"标题"}]}
 */
export const vCardHeader = createComponentShortcut(VCardHeader);
/**
 * @genui 卡片正文区
 * @genui.contract children: 节点数组
 * @genui.use 卡片主体内容
 * @genui.notFor 标题/操作栏（用 Header/Footer）
 * @genui.example {"type":"vCardBody","children":[{"type":"p","text":"内容"}]}
 */
export const vCardBody = createComponentShortcut(VCardBody);
/**
 * @genui 卡片底部区（常放操作）
 * @genui.contract children: 节点数组
 * @genui.use 提交/次要按钮排
 * @genui.notFor 正文内容
 * @genui.example {"type":"vCardFooter","children":[]}
 */
export const vCardFooter = createComponentShortcut(VCardFooter);

export function VCard() {
  return vNode((api, self) => {
    // part 命令：part 自带 `to_slot` 标记，child() 进来后由引擎放进同名 `vn_slot` 落点
    // （一落点一份，重复调用即替换）。
    // 命令里不找落点、不存 `let root`——位置由结构里的 VSlot 落点与 part 自己的标记共同决定。
    api.vCardHeader = (setup) => self.node().child(vCardHeader(setup));
    api.vCardBody = (setup) => self.node().child(vCardBody(setup));
    api.vCardFooter = (setup) => self.node().child(vCardFooter(setup));

    // 结构 + 落点：三个零布局落点，位置由结构决定（与调用顺序无关）
    return div({ vn: 'VCard' }, (element) => {
      element.child(vSlot({ name: 'header' }), vSlot({ name: 'body' }), vSlot({ name: 'footer' }));
    });
  });
}

/**
 * @genui 卡片容器（含 Header/Body/Footer 三个结构子组件）
 * @genui.contract children: vCardHeader / vCardBody / vCardFooter
 * @genui.use 信息分组呈现；详情页/面板骨架
 * @genui.notFor 纯排版（直接用 vstack 更轻）
 * @genui.pitfall 内容不要直接塞 vCard——先包一层 vCardBody
 * @genui.example {"type":"vCard","children":[{"type":"vCardHeader","children":[{"type":"h3","text":"标题"}]},{"type":"vCardBody","children":[{"type":"p","text":"内容"}]}]}
 */
export const vCard = createComponentShortcut(VCard);
