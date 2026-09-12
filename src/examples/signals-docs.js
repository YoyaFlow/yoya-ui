import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
// 适配器源码直接取真实文件原文，避免在文档里维护第二份拷贝。
import preactAdapterSource from '../signals/preact/index.js?raw';

const adapterSourcePanel = ComponentSource({
  source: preactAdapterSource,
  title: 'Preact Signals 适配器（signals/preact/index.js）'
});

/**
 * Signals 文档页：只回答「怎么换引擎、怎么写自己的适配器」。
 * 信号本身的用法（ref / computed / 区域）见状态节点与区域指南，这里不重复。
 */
export function SignalsDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-signals-page');
        page.attr('data-signals-page', 'true');
        page.h1('Signals 状态管理');
        page.p(
          '内置 Signals 开箱可用，业务代码只依赖 ref / computed。想跟随第三方信号库时，装一个适配器即可替换底层引擎，业务代码一行不改；下面给出完整适配器源码。'
        );
        page.section((engines) => {
          engines.className('components-signals-engines');
          engines.attr('data-signals-engines', 'true');
          engines.h2('更换底层引擎（可选）');
          engines.p('默认引擎随包提供、无需安装依赖；换成第三方实现时，适配器是唯一的接入点。');
          engines.ul((list) => {
            list.li(
              "import { installSignals } from 'yoya-ui'; — installSignals(adapter) 全局替换，installSignals(null) 回到内置引擎。"
            );
            list.li(
              '同一时刻只激活一个引擎：安装即替换，不并存（两个引擎版本同页面会让依赖追踪各说各话）。'
            );
            list.li(
              "import { createPreactAdapter } from 'yoya-ui/signals-preact'; — 现成的第三方适配器，接收第三方信号库模块，主包 0 运行时依赖不变。"
            );
          });
        });
        page.section((adapter) => {
          adapter.className('components-signals-adapter');
          adapter.attr('data-signals-adapter', 'true');
          adapter.h2('适配器源码（照着写你自己的引擎）');
          adapter.p(
            '适配器只做「值单元 + 变更通知」两件事：依赖收集、computed、调度与生命周期全部由 core 负责，所以换成别的信号库不会改变依赖语义与派生语义。下面这份源码取自仓库真实文件，内置引擎的适配器在 core/signals/engine.js，可当最小骨架对照。'
          );
          adapter.ul((list) => {
            list.li(
              '必需四个方法：createSignal(initial) / read(source) / write(source, value) / subscribe(source, listener)。'
            );
            list.li(
              '订阅不跑首次：多数引擎的 subscribe 会立即回调一次，契约要求吞掉这一次（绑定在构建期已经求值过）。'
            );
            list.li(
              '监听器内部读值不能登记成依赖：用引擎的 untracked 包一层，否则重建期间的读取会把订阅自我放大。'
            );
            list.li(
              '可选方法 batch / untracked / effect / isSource 有就转发，没有 core 会退回自己的默认实现。'
            );
          });
          adapter.div((panels) => {
            panels.className('components-signals-adapter-sources');
            panels.child(adapterSourcePanel);
          });
        });
      });
    }
  };
}
