/**
 * 操作识别的**中性夹具**：一个带 `mountable` 的中间节点（前后各有一个静态兄弟），
 * 用来验证"离场 → 回场后位置正确"这条语义在编译路径与通用路径上一致。
 *
 * 纪律（AGENTS.md 双向隔离）：夹具只用中性命名，不照抄任何应用的结构或名字。
 */
import { div, span, vText } from '@yoyaflow/yoya-core';

export function Panel(props) {
  return div((root) => {
    root.className('panel');
    root.span((head) => head.className('panel-head').child('head'));
    root.span((body) => {
      body.className('panel-body');
      body.mountable(props.visible);
      body.child(vText(props.label));
    });
    root.span((tail) => tail.className('panel-tail').child('tail'));
  });
}

export { div, span, vText };
