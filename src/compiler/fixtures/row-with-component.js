/**
 * 调用点夹具：一行里挂了两个叶子组件（形态 A + vNode），用来验证「命中注册表就链接、
 * 未命中就回落通用路径」。不是演示代码、也不随包发布。
 */
import { tr } from '../../yoya.core.js';
import { StatusDot, StatusTag } from './status-dot.js';

export function buildRow(row) {
  return tr((line) => {
    line.attr('data-row-id', String(row.id));
    line.td((cell) => cell.className('col-md-1').child(String(row.id)));
    line.td((cell) => cell.className('col-md-2').child(StatusDot(row.dot)));
    line.td((cell) => cell.className('col-md-2').child(StatusTag(row.tag)));
  });
}
