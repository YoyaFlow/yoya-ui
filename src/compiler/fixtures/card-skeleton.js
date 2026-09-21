/**
 * 类骨架通道的测试夹具（「节点类型 + 工厂转发」的中性形状）。
 *
 * 编译器把构造体当作视图来读，调用点只做链接与内容回落——能力的标本用夹具而不是库内组件，
 * 这样组件写法收敛（A / B）之后这条通道仍可独立验收。不随包发布。
 */
import { HtmlElementNode } from '../../html/index.js';
import { applyComponentSetup, createComponentFactory } from '../../components/shared.js';

export class CardSkeleton extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('card-skeleton');
    applyComponentSetup(this, setup);
  }
}

export function cardSkeleton(first = null, second = null, third = null) {
  return createComponentFactory(CardSkeleton, first, second, third, arguments);
}
