/**
 * 中性夹具：**命名根 / 赋值流**（票 21 §2.1 第 3 / 5 条）——基础元素的组合块，
 * 视图先存进变量再交出，写法不影响能不能编。
 *
 * 只存在于测试里、中性命名（AGENTS「双向隔离」）。
 *
 * 判定口径：**只有那段块**——先存变量、被赋几次、在哪儿交出都不影响能不能编；
 * "被读"只切通道（产物必须是节点），"同层之外的赋值"不算候选。
 */
import { div, span, vNode, vText } from '../../yoya.core.js';

/** 命名根：`const view = div(…); return view;` */
export function NamedCard(props = {}) {
  const view = div({ class: 'card' }, (root) => {
    root.child(span((label) => label.child(vText(props.label))));
  });

  return view;
}

/** vNode 里的命名根（命令体保留，只替换内层视图表达式）。 */
export function NamedWidget(props = {}) {
  return vNode((api, self) => {
    const view = div({ class: 'widget' }, (root) => root.child(vText(props.label)));

    api.mark = () => {
      self.node().attr('data-mark', 'yes');
      return api;
    };

    return view;
  });
}

/** 视图变量在别处被读过（`view.attr(…)`）→ 照编，但产物必须是节点（自动切节点通道）。 */
export function ReusedCard(props = {}) {
  const view = div({ class: 'card' }, (root) => root.child(vText(props.label)));

  view.attr('data-kind', 'demo');
  return view;
}

/** 重新赋值（`let` + 两次赋值）→ 取**源码最后那一处**（运行期真正生效的那份）。 */
export function ReassignedCard(props = {}) {
  // eslint-disable-next-line no-useless-assignment -- 夹具刻意写"先给一个再覆盖"，验证编译器回落
  let view = div({ class: 'a' }, (root) => root.child(vText(props.label)));

  view = div({ class: 'b' }, (root) => root.child(vText(props.label)));
  return view;
}

/** 赋值流：`let view = null; view = div(…); return view;` */
export function AssignedCard(props = {}) {
  // eslint-disable-next-line no-useless-assignment -- 夹具刻意写"先占位后赋值"，验证编译器照编
  let view = null;

  view = div({ class: 'assigned' }, (root) => root.child(vText(props.label)));
  return view;
}

/** 命令里读视图变量（节点通道允许：产物就是节点，就地替换后命令照旧）。 */
export function CommandReadsView(props = {}) {
  return vNode((api) => {
    const view = div({ class: 'cmd' }, (root) => root.child(vText(props.label)));

    api.tag = () => {
      view.attr('data-tag', 'yes');
      return api;
    };

    return view;
  });
}

/** 形态 B（组件对象）：`render()` 里命名根 + 另一个命令成员。 */
export function RenderObjectCard(props = {}) {
  return {
    render() {
      const view = div({ class: 'render-card' }, (root) => root.child(vText(props.label)));

      return view;
    },
    touch() {
      return props;
    }
  };
}

/** 形态 B（组件对象）：那块视图声明在**组件体**里（render 之外），render 只交出它。 */
export function OuterRootCard(props = {}) {
  const view = div({ class: 'outer-root' }, (root) => root.child(vText(props.label)));

  return {
    render() {
      return view;
    }
  };
}

/**
 * 同层之外的赋值不算"那一块"：闭包 / 别的方法里的赋值运行期未必执行（也未必是 render 交出的那份），
 * 所以候选只有**同层**这一处。取错块不会有 DOM 差异，但会编出一个永远不用的块（白付编译代价）。
 */
export function SameLevelCard(props = {}) {
  let view = null;

  view = div({ class: 'same-level' }, (root) => root.child(vText(props.label)));
  const pack = () => div({ class: 'closure' }, (root) => root.child(vText(props.label)));

  return {
    render() {
      return view;
    },
    refresh() {
      view = div({ class: 'other-method' }, (root) => root.child(vText(props.label)));
      return pack;
    }
  };
}
