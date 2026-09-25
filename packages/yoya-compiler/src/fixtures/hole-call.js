/**
 * 中性夹具：**认不出的父方法调用当"洞"**（票 21 §2.1.7）。
 *
 * `helper` 模拟布局库的 `hstack`：函数体不是"一段块"（多句 + 分支），编译器认不出它的形状；
 * 它按父方法注册（`registerChildFactories`），所以调用点写 `root.helper(…)`。
 *
 * 只存在于测试里、中性命名（AGENTS「双向隔离」）；注册发生在测试进程内，不影响其他用例。
 */
import { ElementNode, div, registerChildFactories } from '@yoyaflow/yoya-core';

/** "不是一段块"的库内助手：多句 + 分支 → 编译器不摊平，调用点按洞处理。 */
export function helper(first = null) {
  const node = div({ class: 'helper' });
  if (first !== null && first !== undefined) {
    node.setup(first);
  }
  return node;
}

registerChildFactories(ElementNode, { helper });

export function Panel() {
  return div({ vn: 'XPanel' }, (root) => {
    root.span('前');
    // `helper` **不在本模块绑定**里（它是原型方法）——洞按"调通用路径那个方法"处理，不需要认识名字
    root.helper((node) => node.child('洞'));
    root.span('后');
  });
}
