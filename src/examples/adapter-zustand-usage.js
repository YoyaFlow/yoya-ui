/**
 * 用法：把 store 类库引擎接进应用（适配器就是上面那份 zustand 示例）。
 * 接入方式与 Signals 版本逐字相同，业务代码一行不改。
 */
import { computed, div, installSignals, ref, vText } from '../index.js';
import { createZustandAdapter } from './adapter-zustand-example.js';

/** 第一步：应用启动时装一次（全局只有一个引擎，别在组件里装）。 */
export function installZustandEngine() {
  return installSignals(createZustandAdapter());
}

/** 第二步：业务代码不用改——ref 持有、computed 派生、值位置直接传句柄。 */
export function ZustandCounter() {
  const count = ref(0);
  const double = computed(() => count.value * 2);

  return {
    render() {
      return div((box) => {
        box.attr('data-count', count);
        box.span((line) =>
          line.child(vText(computed(() => `${count.value} × 2 = ${double.value}`)))
        );
      });
    },
    increment() {
      count.value += 1;
      return this;
    }
  };
}
