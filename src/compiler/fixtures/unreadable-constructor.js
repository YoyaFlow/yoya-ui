/**
 * 「构造体读不懂」的夹具（与 `card-skeleton.js` 配对）：同样是"节点类型 + 工厂转发"的中性形状，
 * 但构造体里有**动态接线**（按运行期取值决定建哪块结构），编译器读不出视图 → 应当给出可定位的
 * bail 理由（`调用链不是从 setup 参数出发`）。
 *
 * 为什么要夹具：库内组件正在全部收敛到 A（薄工厂）/ B（vNode）两种形态，**没有一个库内组件会长期
 * 停留在"读不懂的形态 C"**；拿库内组件当样例会让这条用例跟着每次迁移反复换。能力标本用夹具
 * （中性形状、只存在于测试里、不随包发布）。
 */
import { HtmlElementNode } from '../../html/index.js';
import { applyComponentSetup, createComponentFactory } from '../../components/shared.js';

export class WidgetSkeleton extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('widget-skeleton');
    this._size = readSize(setup);

    // 动态接线：子结构由"自己算"的调用链产出，尺寸取的是构造期字段（不是从 setup 参数直线出发）
    this.child(this._buildBar());
    applyComponentSetup(this, setup);
  }

  _buildBar() {
    return new HtmlElementNode('span')
      .className('widget-skeleton-bar')
      .style('height', `${this._size}px`);
  }
}

function readSize(setup) {
  const parsed = Number(setup?.size);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
}

export function widgetSkeleton(first = null, second = null, third = null) {
  return createComponentFactory(WidgetSkeleton, first, second, third, arguments);
}
