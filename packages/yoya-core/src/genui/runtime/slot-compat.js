import { div, span, HtmlElementNode } from '../../html/index.js';
import { vNode } from '../../index.js';
import { SLOT_KEY, TO_SLOT_KEY } from '../protocol/constants.js';

/**
 * 槽位语义 ↔ yoya 版本的兼容垫片。
 *
 * 协议侧的语义是两边分开的：
 * - **声明（占位）**：节点上写 `vn_slot="aa"`（`""` = 默认/匿名位）
 * - **投递（内容）**：节点上写 `to_slot="aa"`（`""` = 投默认位）
 *
 * 而 yoya 的**已发布版本**里，内容侧读的是 `vn_slot`（`partNameOf`）——所以我们现在把
 * `to_slot` 翻译成 `vn_slot` 再投递；等新版发布（内容侧读 `to_slot`、`vn_slot` 只做声明），
 * 能力探测会自动切过去。整套翻译集中在这个文件里，将来只改这里。
 */
export const PLACEHOLDER_ATTRIBUTE = SLOT_KEY;
export const PROTOCOL_DELIVERY_ATTRIBUTE = TO_SLOT_KEY;
/** 已发布 yoya 版本里内容侧实际读取的属性。 */
export const LEGACY_DELIVERY_ATTRIBUTE = SLOT_KEY;

/**
 * 本地 vSlot（结构侧子集，语义源自 yoya-ui 的 v-slot.js）：零布局占位——
 * span + display:contents + vn_slot 落点标记。genui 是组件无关的运行时，
 * 不依赖组件库；组件库里完整的 vSlot（含 setup 分派）随库的插件注册。
 */
function vSlot({ name } = {}) {
  return new HtmlElementNode('span')
    .style('display', 'contents')
    .setup({ vn: 'VSlot', vn_slot: name ?? '' });
}
let cachedToSlotSupport = null;

/**
 * 能力探测（跑一次、缓存）：yoya 的内容侧是否已经认 `to_slot`。
 *
 * 用行为探测而不是版本号：造一个带占位的宿主，投一份只带 `to_slot` 的内容——
 * 被投递过的话 yoya 会把内容上的标记摘掉（`projectPart` 的语义）。
 */
export function supportsToSlotDelivery() {
  if (cachedToSlotSupport !== null) {
    return cachedToSlotSupport;
  }

  try {
    const host = vNode(() => div((root) => root.child(vSlot({ name: 'probe' }))));
    const content = span({ to_slot: 'probe' });

    // 关键：组件节点是**懒解析**的——必须先让它解析出落点表，`child()` 才会真的投递；
    // 不解析的话内容只是排队，标记不会被摘，探测会得到假阴性。
    // 另外注意：yoya 摘标记后 `attr()` 返回 `undefined`（不是 null），两个都要算"已摘"。
    host.toHTML();
    host.child(content);
    cachedToSlotSupport = content.attr(TO_SLOT_KEY) == null;
  } catch {
    cachedToSlotSupport = false;
  }

  return cachedToSlotSupport;
}

/** 占位节点：`vn_slot="aa"` → `vSlot('aa')`（`""` = 默认位）。 */
export function createPlaceholder(slotName = '') {
  return vSlot(slotName === '' ? {} : { name: slotName });
}

/**
 * 给内容打投递标记（当前版本写 `vn_slot`，新版写 `to_slot`）。
 *
 * **空名不打标记**：`""` = 匿名位，而"没有标记"本身就是匿名内容（yoya 会把它放进匿名落点）；
 * 打了标记反而摘不掉——匿名分支不走投影，标记会留在 DOM 上，看起来像"没投进去"。
 */
export function markDelivery(node, slotName) {
  if (slotName === '') {
    return node;
  }

  const attribute = supportsToSlotDelivery()
    ? PROTOCOL_DELIVERY_ATTRIBUTE
    : LEGACY_DELIVERY_ATTRIBUTE;
  node.attr(attribute, slotName);
  return node;
}
