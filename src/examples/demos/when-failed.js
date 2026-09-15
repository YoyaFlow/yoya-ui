import { computed, div, ref, span, vstack } from '../../index.js';

/**
 * 错误边界演示 1：报告模式。handler 返回 null 只上报，不替换结构；
 * 业务侧用信号统计捕获次数，控制台同时输出 console.error 与完整堆栈。
 */
export function WhenFailedReportExample() {
  const failures = ref(0);
  const message = computed(() => `已捕获 ${failures.value} 次故障，内容保持原样`);
  const box = div((node) => {
    node.className('demo-when-failed');
    node.attr('data-when-failed-box', 'true');
    node.whenFailed(() => {
      failures.value += 1;
      return null;
    });
    node.p('业务内容正常运行；打开控制台可见每次捕获的 console.error。');
    node.button('触发事件故障', (button) => {
      button.attr('data-when-failed-trigger', 'true');
      button.on('click', () => {
        throw new Error(`事件处理器故障 #${failures.value + 1}（phase=${'event'}）`);
      });
    });
  });

  return {
    render() {
      return vstack((stack) => {
        stack.style('gap', '10px');
        stack.child(box);
        stack.p((line) => line.child(message));
      });
    }
  };
}

/**
 * 错误边界演示 2：组件协议降级。whenFailed 与 render 同层，
 * 触发后组件输出被替换为降级 UI，页面其余部分与兄弟节点完全不受影响。
 */
export function WhenFailedComponentExample() {
  const rows = ref([{ status: 'ok' }]);
  const widget = {
    fail() {
      rows.value = [{ status: 'bad' }];
      return this;
    },
    whenFailed(error) {
      return span(`组件降级：${error.message}`);
    },
    render() {
      return div((box) => {
        box.attr('data-risky-widget', 'true');
        box.keyed(rows, (row) => row.status, (row) => {
          if (row.status === 'bad') {
            throw new Error('业务渲染故障');
          }
          return span('组件正常运行，故障由 whenFailed 成员兜底');
        });
      });
    }
  };

  return {
    render() {
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
  };
}
