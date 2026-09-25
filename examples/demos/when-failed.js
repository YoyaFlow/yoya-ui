import { computed, div, ref, span, vNode, vstack } from '@yoyaflow/yoya-ui';

/**
 * 错误边界演示 1：报告模式。handler 返回 null 只上报，不替换结构；
 * 业务侧用信号统计捕获次数，控制台同时输出 console.error 与完整堆栈。
 */
export function WhenFailedReportExample() {
  const failures = ref(0);
  const message = computed(() => `已捕获 ${failures.value} 次故障，内容保持原样`);

  return vstack((stack) => {
    stack.style('gap', '10px');
    // 不需要句柄的节点就在视图里组合，不提前建到函数作用域
    stack.div((box) => {
      box.className('demo-when-failed');
      box.attr('data-when-failed-box', 'true');
      box.whenFailed(() => {
        failures.value += 1;
        return null;
      });
      box.p('业务内容正常运行；打开控制台可见每次捕获的 console.error。');
      box.button('触发事件故障', (button) => {
        button.attr('data-when-failed-trigger', 'true');
        button.on('click', () => {
          throw new Error(`事件处理器故障 #${failures.value + 1}（phase=${'event'}）`);
        });
      });
    });
    stack.p((line) => line.child(message));
  });
}

/**
 * 错误边界演示 2：组件自带降级 + 边界外恢复。vNode 产物就是节点，直接写在树里；
 * 边界写在 api.whenFailed 上，触发/恢复按钮都在边界外，所以可以反复观察。
 */
export function WhenFailedComponentExample() {
  const rows = ref([{ status: 'ok' }]);
  const attempt = ref(0);

  return vstack((stack) => {
    stack.style('gap', '10px');
    stack.rebuildable();
    // 读一次 attempt.value = 成为区域依赖：恢复时重建整块，拿到全新的组件实例
    stack.attr('data-attempt', attempt.value);
    stack.child(
      vNode((api) => {
        api.whenFailed = (error) => span(`组件降级：${error.message}`);

        return div((box) => {
          box.attr('data-risky-widget', 'true');
          box.keyed(rows, (row) => row.status, (row) => {
            if (row.status === 'bad') {
              throw new Error('业务渲染故障');
            }
            return span('组件正常运行，故障由 whenFailed 兜底');
          });
        });
      })
    );
    stack.hstack((row) => {
      row.style('gap', '8px');
      row.vButton('触发渲染故障', (button) => {
        button.variant('primary');
        button.attr('data-when-failed-trigger', 'true');
        button.on('click', () => {
          rows.value = [{ status: 'bad' }];
        });
      });
      row.vButton('恢复（重建组件）', (button) => {
        button.attr('data-when-failed-recover', 'true');
        button.on('click', () => {
          rows.value = [{ status: 'ok' }];
          attempt.value += 1;
        });
      });
    });
    stack.p('两个按钮都在边界外：降级只替换组件自身输出，所以可以反复触发与恢复。');
  });
}
