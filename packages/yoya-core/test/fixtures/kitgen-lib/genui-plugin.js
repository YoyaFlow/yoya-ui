/**
 * 由 yoya-kitgen 生成——勿手改。接线写在组件源码 JSDoc 的 @genui* 运行时标签里，重跑生成。
 * manifest：与本文件同一次扫描产出（版本一致），给模型看的目录在那边。
 */
import { createPlugin } from '@yoyaflow/yoya-core/genui';
import { vGreeter, vPlain } from './ui.js';

export const namespace = 'fixture/kitgen-lib';
export const version = '1.2.3';

export const components = {
  Greeter: {
    factory: vGreeter,
    aliases: ['vGreeter', 'VGreeter'],
    childrenProp: 'children',
    props: {
      name: { to: 'attr:data-name' },
      score: { to: 'command:score', read: 'command:getScore', live: false }
    },
    events: {
      click: { channel: 'dom', event: 'click' },
      change: { channel: 'callback', prop: 'change', payload: '0' }
    },
    textProp: 'greeting'
  },
  Plain: {
    factory: vPlain,
    aliases: ['vPlain', 'VPlain']
  }
};

export const plugin = createPlugin({
  id: 'fixture/kitgen-lib@1.2.3',
  components
});

export default plugin;
