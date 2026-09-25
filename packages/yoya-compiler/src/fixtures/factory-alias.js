/**
 * 中性夹具：**别名导入**（本地名 ≠ 规范名）+ 别名包装。
 *
 * 口径：编译器按"绑定来源 + 导出名"认核心契约，不按本地拼写 —— 作者起什么名字都不该影响
 * 能不能编、也不该影响产物里的标签。只存在于测试里、中性命名（AGENTS「双向隔离」）。
 */
import { div, div as box, span, span as cell, vText, vText as txt } from '@yoyaflow/yoya-core';
import { vNode as wrapComponent } from '@yoyaflow/yoya-core/internal/core/v-node.js';

/** 别名版本：`box` / `cell` / `text` 都是别名。 */
export function AliasedCard(props = {}) {
  return box({ class: 'card' }, (root) => {
    root.attr('data-kind', 'demo');
    root.child(
      cell((label) => {
        label.className('label');
        label.child(txt(props.label));
      })
    );
  });
}

/** 对照版本：同一棵树，全用规范名。 */
export function PlainCard(props = {}) {
  return div({ class: 'card' }, (root) => {
    root.attr('data-kind', 'demo');
    root.child(
      span((label) => {
        label.className('label');
        label.child(vText(props.label));
      })
    );
  });
}

/** 别名包装（`vNode as wrapComponent`）+ 别名工厂：形状与来源都在，本地名叫什么都不该影响。 */
export function AliasedWidget(props = {}) {
  return wrapComponent((api, self) => {
    api.ping = () => {
      self.node().attr('data-ping', 'yes');
      return api;
    };
    return box({ class: 'widget' }, (root) => root.child(txt(props.label)));
  });
}
