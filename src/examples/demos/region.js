import { div, ul, vStateNode, vText, vstack } from '../../index.js';

/**
 * 区域演示 1：声明区域 + 手动 rebuild，区域外的节点不受影响。
 * 内容由区域自己的 builder 产出，所以区域节点先建一次，之后只调 rebuild()。
 */
export function RegionRebuildExample() {
  const data = { rows: ['接口联调'] };
  const list = ul((box) => {
    box.className('demo-region-list');
    box.attr('data-region-list', 'true');
    box.rebuildable();
    data.rows.forEach((row) => box.li(row));
  });

  const api = {
    add() {
      data.rows.push(`任务 ${data.rows.length + 1}`);
      list.rebuild();
      return api;
    },
    clear() {
      data.rows.length = 0;
      list.rebuild();
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.input((field) => {
          field.attr({
            'data-region-outside': 'true',
            placeholder: '区域外的输入框：重建后依然在',
            type: 'text'
          });
        });
        stack.child(list);
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('追加一行', (button) => {
            button.variant('primary');
            button.attr('data-region-add', 'true');
            button.on('click', () => api.add());
          });
          row.vButton('清空', (button) => {
            button.attr('data-region-clear', 'true');
            button.on('click', () => api.clear());
          });
        });
      });
    }
  };

  return api;
}

/**
 * 区域演示 2：谓词门禁——为假时只刷值并记 pending，恢复后补一次重建。
 * 区域节点与状态行都在 render 之外建好，方法里直接改它们；
 * 状态行持有文本节点句柄，重复同步才是替换内容（元素 .text() 是追加子节点）。
 */
export function RegionGateExample() {
  const data = { label: 'A' };
  let locked = false;
  const box = div((ele) => {
    ele.className('demo-region-gate');
    // 先声明区域，再写值函数与其它登记
    ele.rebuildable(() => !locked);
    ele.attr({
      'data-region-gate': 'true',
      'data-region-locked': () => (locked ? 'true' : null)
    });
    ele.span((line) => {
      line.attr('data-region-label', 'true');
      line.child(vText(() => data.label));
    });
  });
  const statusText = vText('状态：已同步');
  const status = div((line) => {
    line.attr('data-region-pending', 'true');
    line.child(statusText);
  });

  const api = {
    toggleLabel() {
      data.label = data.label === 'A' ? 'B' : 'A';
      box.rebuild();
      syncStatus();
      return api;
    },
    toggleLock() {
      locked = !locked;
      if (!locked && box.rebuildPending()) {
        box.rebuild();
      }
      syncStatus();
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.child(box).child(status);
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('切换标签', (button) => {
            button.variant('primary');
            button.attr('data-region-next', 'true');
            button.on('click', () => api.toggleLabel());
          });
          row.vButton('锁定 / 解锁', (button) => {
            button.attr('data-region-lock', 'true');
            button.on('click', () => api.toggleLock());
          });
        });
      });
    }
  };

  function syncStatus() {
    statusText.textContent(box.rebuildPending() ? '状态：已跳过（待重建）' : '状态：已同步');
  }

  return api;
}

/** 区域演示 3：dataSource 让带参值函数在普通区域里拿到数据来源。 */
export function RegionDataSourceExample() {
  const data = { count: 0 };
  const box = div((ele) => {
    ele.className('demo-region-source');
    ele.attr('data-region-source', 'true');
    ele.dataSource(() => data); // 带参值函数的数据来源
    ele.rebuildable();
    ele.attr('data-count', (source) => String(source.count));
    ele.span((line) => line.child(vText((source) => `共 ${source.count} 条`)));
  });

  const api = {
    add() {
      data.count += 1;
      box.rebuild();
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.child(box);
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('增加一条', (button) => {
            button.variant('primary');
            button.attr('data-region-source-add', 'true');
            button.on('click', () => api.add());
          });
        });
      });
    }
  };

  return api;
}

/** 区域演示 4：flush 只刷值（元素不变），rebuild 才换结构——对照看差别。 */
export function RegionFlushExample() {
  const data = { label: 'A' };
  const box = div((ele) => {
    ele.className('demo-region-flush');
    ele.attr('data-region-flush', 'true');
    ele.rebuildable();
    ele.span((line) => {
      line.attr('data-region-flush-label', 'true');
      line.child(vText(() => data.label));
    });
  });

  const api = {
    flush() {
      data.label = data.label === 'A' ? 'B' : 'A';
      box.flush();
      return api;
    },
    rebuild() {
      box.rebuild();
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.child(box);
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('flush：只刷值', (button) => {
            button.variant('primary');
            button.attr('data-region-flush-next', 'true');
            button.on('click', () => api.flush());
          });
          row.vButton('rebuild：重建结构', (button) => {
            button.attr('data-region-flush-rebuild', 'true');
            button.on('click', () => api.rebuild());
          });
        });
      });
    }
  };

  return api;
}

const comparePanelStyle = {
  alignItems: 'center',
  border: '1px solid var(--yoya-color-border, #d8dee8)',
  borderRadius: '6px',
  display: 'flex',
  gap: '8px',
  padding: '8px 10px'
};

/**
 * 数据来源对照：三块面板长得一样，区别只在「数据住在哪、谁来驱动」。
 * ① 组件状态：数据住在 vStateNode 里，setState 后引擎自动把函数值绑定写回；
 * ② 外部数据 + dataSource：数据住在组件外，dataSource 只声明读来源，
 *    改完要自己 flush()（结构变了才 rebuild()）；
 * ③ 节点状态：节点自己的 setState 只推给本节点注册的处理器，
 *    绑定读不到它，必须像下面这样手写接线。
 */
export function RegionStateVsSourceExample() {
  return vstack({ gap: '10px' }, (list) => {
    list.className('demo-region-compare');
    list.attr('data-region-compare', 'true');
    list.child(ComponentStatePanel());
    list.child(ExternalDataSourcePanel());
    list.child(NodeStatePanel());
  });
}

/** ① 组件状态：数据与驱动都在组件里，绑定参数 s 就是组件状态。 */
function ComponentStatePanel() {
  return vStateNode({
    state: () => ({ count: 0 }),
    render(state, api) {
      return div((panel) => {
        panel.className('demo-region-compare-panel');
        panel.attr('data-region-state', 'true');
        panel.styles(comparePanelStyle);
        panel.span((line) => line.child(vText((s) => `组件状态：${s.count}`)));
        panel.vButton('+1（组件状态）', (button) => {
          button.attr('data-region-state-add', 'true');
          button.on('click', () => api.setState({ count: state.count + 1 }));
        });
      });
    }
  });
}

/** ② 外部数据源：数据在组件外，dataSource 提供读来源，改动后手动 flush（pull）。 */
function ExternalDataSourcePanel() {
  const data = { count: 0 };

  return div((panel) => {
    panel.className('demo-region-compare-panel');
    panel.attr('data-region-source', 'true');
    panel.styles(comparePanelStyle);
    panel.rebuildable();
    panel.dataSource(() => data); // (d) => value 里的 d 就是它的返回值
    panel.span((line) => line.child(vText((d) => `外部数据源：${d.count}`)));
    panel.vButton('+1（外部数据）', (button) => {
      button.attr('data-region-source-add', 'true');
      button.on('click', () => {
        data.count += 1;
        panel.flush(); // 拉一次绑定；只改值不调它，DOM 一动不动
      });
    });
  });
}

/** ③ 节点状态：setState 只跑本节点注册的处理器，引擎不会替它更新任何绑定。 */
function NodeStatePanel() {
  const label = vText('节点状态：0');

  return div((panel) => {
    panel.className('demo-region-compare-panel');
    panel.attr('data-region-local', 'true');
    panel.styles(comparePanelStyle);
    panel.registerStateHandler('count', (value) => {
      label.textContent(`节点状态：${value}`); // 手写接线：不接这里，文案不会变
    });
    panel.span((line) => line.child(label));
    panel.vButton('+1（节点状态）', (button) => {
      button.attr('data-region-local-add', 'true');
      button.on('click', () => panel.setState('count', panel.getNumberState('count') + 1));
    });
  });
}
