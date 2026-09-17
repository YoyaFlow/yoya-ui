import { computed, div, ref, span, vNode, vstack } from '../../index.js';

/**
 * 错误边界演示 1：报告模式。handler 返回 null 只上报，不替换结构；
 * 业务侧用信号统计捕获次数，控制台同时输出 console.error 与完整堆栈。
 */
export function WhenFailedReportExample() {
  const failures = ref(0);
  const message = computed(() => `已捕获 ${failures.value} 次故障，内容保持原样`);

  return {
    render() {
      return vstack((stack) => {
        stack.style('gap', '10px');
        // 不需要句柄的节点就在 render 里组合，不提前建到函数作用域
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
  };
}

/**
 * 错误边界演示 2：组件自带降级。vNode 定义即节点，边界写在 api.whenFailed 上，
 * 触发后组件输出被替换为降级 UI，页面其余部分与兄弟节点完全不受影响。
 */
export function WhenFailedComponentExample() {
  const rows = ref([{ status: 'ok' }]);

  const widget = vNode((api) => {
    api.fail = () => {
      rows.value = [{ status: 'bad' }];
      return api;
    };
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
  });

  return vstack((stack) => {
    stack.style('gap', '10px');
    stack.child(widget);
    stack.vButton('触发渲染故障', (button) => {
      button.variant('primary');
      button.attr('data-when-failed-trigger', 'true');
      button.on('click', () => widget.fail());
    });
  });
}
