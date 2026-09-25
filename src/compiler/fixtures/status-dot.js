/**
 * 叶子组件的测试夹具（形态 A 薄工厂，不收 children）：编译路径把它的视图编成
 * 「片段 + 位置写」，调用点只做链接。不是演示代码、也不随包发布。
 */
import { span, vNode, vText } from '../../yoya.core.js';

export function StatusDot(props) {
  return span((dot) => {
    dot.className('status-dot');
    dot.attr('data-tone', props.tone);
    dot.child(vText(props.label));
  });
}

/** vNode 组件：setup 只 return 视图、不用 api（带命令方法的本轮不编）。 */
export function StatusTag(props) {
  return vNode(() => span((tag) => tag.className('status-tag').child(vText(props.label))));
}

/** 收 children 的容器组件：本轮不编（依赖票 42 的槽）。 */
export function StatusBox(props, children) {
  return span((box) => {
    box.className('status-box');
    box.child(children);
    box.attr('data-tone', props.tone);
  });
}
