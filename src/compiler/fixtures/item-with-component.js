/**
 * 调用点夹具：一个列表项里挂了两个叶子组件（形态 A + vNode），用来验证「命中注册表就链接、
 * 未命中就回落通用路径」。中性命名、不是演示代码、也不随包发布。
 */
import { li, vText } from '../../yoya.core.js';
import { StatusDot, StatusTag } from './status-dot.js';

export function Item(item) {
  return li((line) => {
    line.attr('data-item-id', String(item.id));
    line.span((cell) => cell.className('item-id').child(String(item.id)));
    line.span((cell) => cell.className('item-dot').child(StatusDot(item.dot)));
    line.span((cell) => cell.className('item-tag').child(StatusTag(item.tag)));
    line.span((cell) => cell.className('item-label').child(vText(item.label)));
  });
}
