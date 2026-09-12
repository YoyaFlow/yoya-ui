import { section } from '../index.js';
import { ComponentSource } from './component-source.js';
// 插件由使用者自己写：这里只给模板，源码直接取文件原文，避免两份拷贝。
import adapterTemplateSource from './adapter-template.js?raw';
import signalsAdapterSource from './adapter-signals-example.js?raw';
import zustandAdapterSource from './adapter-zustand-example.js?raw';
import signalsUsageSource from './adapter-signals-usage.js?raw';
import zustandUsageSource from './adapter-zustand-usage.js?raw';

const adapterSourcePanels = [
  ComponentSource({
    source: adapterTemplateSource,
    title: '插件模板（复制到你的项目里改）'
  }),
  ComponentSource({
    source: signalsAdapterSource,
    title: '演示代码：Signals 类库（@preact/signals-core）'
  }),
  ComponentSource({
    source: signalsUsageSource,
    title: '演示代码：Signals 用法（接入 + 业务代码）'
  }),
  ComponentSource({
    source: zustandAdapterSource,
    title: '演示代码：Store 类库（zustand/vanilla）'
  }),
  ComponentSource({
    source: zustandUsageSource,
    title: '演示代码：Store 用法（接入 + 业务代码）'
  })
];

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
          '内置 Signals 开箱可用，业务代码只依赖 ref / computed。想换成别的状态库，自己写一个适配器插件装进来即可——signals 类库、store 类库都一样，业务代码一行不改。'
        );
        page.section((engines) => {
          engines.className('components-signals-engines');
          engines.attr('data-signals-engines', 'true');
          engines.h2('更换底层引擎（可选）');
          engines.p(
            '默认引擎随包提供、无需安装依赖；换成第三方实现时，插件是唯一的接入点，写插件的人是你而不是库。'
          );
          engines.ul((list) => {
            list.li(
              "import { installSignals } from '@yoyaflow/yoya-ui'; — installSignals(adapter) 全局替换，installSignals(null) 回到内置引擎。"
            );
            list.li(
              '同一时刻只激活一个引擎：安装即替换，不并存（两个引擎版本同页面会让依赖追踪各说各话）。'
            );
            list.li('适配器只依赖你自己装的库：主包 0 运行时依赖不变，装不装、装哪家都由你决定。');
          });
        });
        page.section((adapter) => {
          adapter.className('components-signals-adapter');
          adapter.attr('data-signals-adapter', 'true');
          adapter.h2('插件模板（自己写适配器）');
          adapter.p(
            '适配器只做「值单元 + 变更通知」两件事：依赖收集、computed、调度与生命周期全部由 core 负责，所以换成别的状态库不会改变依赖语义与派生语义——store 类库也一样能当引擎。把下面这份模板复制到你的项目，按 TODO 填上你的库的调用即可；想看能跑的最小实现，可对照仓库里的 core/signals/engine.js。'
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
            list.li(
              'store 形态（getState / setState / subscribe）不需要 untracked——通知来自 store 而不是 effect；通知期间的重订已由 core 按「只动变化的依赖」处理，插件不必自己兜。'
            );
          });
          adapter.p(
            '再往下是四种演示代码，每类库一对：适配器 + 用法（启动装一次引擎，业务代码照旧）。signals 与 store 各一对，按契约把各自的坑都处理掉了，全部在仓库里跑一致性用例与端到端用例，可以直接抄。'
          );
          adapter.div((panels) => {
            panels.className('components-signals-adapter-sources');
            adapterSourcePanels.forEach((panel) => panels.child(panel));
          });
        });
      });
    }
  };
}
