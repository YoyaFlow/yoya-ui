import { div } from '@yoyaflow/yoya-core/html';
import { asSignal } from '@yoyaflow/yoya-core';
import { createComponentShortcut } from '../shared.js';

/**
 * @genui 问候卡片
 * @genui.contract greeting: 文本；name: 文本
 * @genui.use 早间问候；新人引导
 * @genui.notFor 深夜模式
 * @genui.pitfall 名字为空时只显示问候
 * @genui.example {"type":"vGreeter","props":{"name":"小明"}}
 * @genui.scene 问候卡片, 新人引导
 * @genui.layer L3
 * @genui.props {"greeting":"问候语（缺省：你好）","name":"名字（必填）"}
 * @genui.live name；score
 * @genui.pairs vBadge（角标）, vAvatar（头像）
 * @genui.state 名字由外部持有（写回页面数据域），问候语是组件内默认值
 * @genui.content children
 * @genui.text greeting
 * @genui.prop name to=attr:data-name
 * @genui.prop score to=command:score read=command:getScore live=false
 * @genui.event click dom
 * @genui.event change callback payload=0
 */
export function VGreeter({ change, children, greeting = '你好', name, score, ...rest } = {}) {
  // 值通道：这一位在代码里归一过（构建期扫出来写进插件的 valueProps）
  const name$ = asSignal(name);
  const node = div({
    vn: 'VGreeter',
    ...rest,
    attrs: {
      ...(rest.attrs ?? null),
      ...(greeting !== undefined ? { 'data-greeting': greeting } : null),
      ...(name !== undefined ? { 'data-name': name$ } : null),
      ...(score !== undefined ? { 'data-score': String(score) } : null)
    }
  });

  for (const child of Array.isArray(children) ? children : children ? [children] : []) {
    node.child(child);
  }

  // 回调 prop：只为验证序列化与装配，不真接线
  if (typeof change === 'function') {
    node.change = change;
  }

  return node;
}

export const vGreeter = createComponentShortcut(VGreeter);
