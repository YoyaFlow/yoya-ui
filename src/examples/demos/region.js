import { computed, div, ul, ref, vNode, vText, vstack } from '../../index.js';
import { componentSource } from '../component-source.js';

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

  return vNode((api) => {
    api.add = () => {
      data.rows.push(`任务 ${data.rows.length + 1}`);
      list.rebuild();
      return api;
    };
    api.clear = () => {
      data.rows.length = 0;
      list.rebuild();
      return api;
    };

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
  });
}

/**
 * 区域演示 2：时机门禁。忙碌（编辑 / 拖拽）时谓词拦截结构重建：
 * 区域内值绑定照常刷新，列表结构不动并记为 rebuildPending()；
 * 恢复空闲后一次 rebuild() 补齐全部挂起的结构变更。
 * 区域节点与状态行在 setup 之外建好，命令里直接改它们；
 * 状态行持有文本节点句柄，重复同步才是替换内容（元素 .text() 是追加子节点）。
 */
export function RegionGateExample() {
  const rows = ref(['任务 1']);
  const busy = ref(false);
  const count = computed(() => `值绑定行数：${rows.value.length}`);

  const list = div((ele) => {
    ele.className('demo-region-gate');
    ele.rebuildable(() => !busy.value);
    ele.attr({ 'data-region-locked': computed(() => (busy.value ? 'true' : null)) });
    ele.ul((listOfRows) => {
      listOfRows.attr('data-region-list', 'true');
      rows.value.forEach((row) => listOfRows.li(row));
    });
    ele.span((line) => line.attr('data-region-count', 'true').child(vText(count)));
  });
  const status = div((line) =>
    line.attr('data-region-pending', 'true').child(
      vText(() => {
        const pending = list.rebuildPending() ? '是' : '否';
        return busy.value
          ? `状态：忙碌，结构锁定；待重建：${pending}`
          : '状态：空闲，结构随信号自动重建';
      })
    )
  );

  return vNode((api) => {
    api.addRow = () => {
      rows.value = [...rows.value, `任务 ${rows.value.length + 1}`];
      status.flush();
      return api;
    };
    api.toggleBusy = () => {
      busy.value = !busy.value;
      if (!busy.value && list.rebuildPending()) {
        list.rebuild();
      }
      status.flush();
      return api;
    };

    return vstack({ gap: '12px' }, (stack) => {
      stack.child(list).child(status);
      stack.hstack({ gap: '8px' }, (row) => {
        row.vButton('添加一行', (button) => {
          button.variant('primary');
          button.attr('data-region-next', 'true');
          button.on('click', () => api.addRow());
        });
        row.vButton('忙碌 / 空闲', (button) => {
          button.attr('data-region-lock', 'true');
          button.on('click', () => api.toggleBusy());
        });
      });
    });
  });
}
/**
 * 区域演示 3：独立子树的零参闭包直接读外部数据，改动后手动 flush。
 * 只刷值时不需要 rebuildable()——它只用来声明「结构可变」。
 */
export function RegionScopeExample() {
  const data = { count: 0 };
  const box = div((ele) => {
    ele.className('demo-region-source');
    ele.attr('data-region-source', 'true');
    ele.attr('data-count', () => String(data.count));
    ele.span((line) => line.child(vText(() => `共 ${data.count} 条`)));
  });

  return vNode((api) => {
    api.add = () => {
      data.count += 1;
      box.flush(); // 只刷值：结构没变，不需要 rebuild()
      return api;
    };

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
  });
}

/**
 * 区域演示 4：flush 只刷值（元素不变），rebuild 才换结构——对照看差别。
 * 命令名不叫 flush：那是节点自己的方法，命令挂上去会撞名（vNode 直接报错）。
 */
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

  return vNode((api) => {
    api.refreshValue = () => {
      data.label = data.label === 'A' ? 'B' : 'A';
      box.flush();
      return api;
    };
    api.rebuildStructure = () => {
      box.rebuild();
      return api;
    };

    return vstack({ gap: '12px' }, (stack) => {
      stack.child(box);
      stack.hstack({ gap: '8px' }, (row) => {
        row.vButton('flush：只刷值', (button) => {
          button.variant('primary');
          button.attr('data-region-flush-next', 'true');
          button.on('click', () => api.refreshValue());
        });
        row.vButton('rebuild：重建结构', (button) => {
          button.attr('data-region-flush-rebuild', 'true');
          button.on('click', () => api.rebuildStructure());
        });
      });
    });
  });
}

/**
 * 数据来源对照：三块面板长得一样，区别只在「数据住在哪、怎么驱动」。
 * ① 组件内 ref：数据住在组件闭包里，值绑定自动写回；
 * ② 组件外 ref：数据住在组件外（跨组件共享），绑定同样自动写回；
 * ③ 区域依赖：区域构建期直读 ref，写入触发子树重建（结构随状态变化走这里）。
 */
export function RegionStateVsSourceExample() {
  return vstack({ gap: '10px' }, (list) => {
    list.className('demo-region-compare');
    list.attr('data-region-compare', 'true');
    list.child(ComponentStatePanel());
    list.child(ExternalDataSourcePanel());
    list.child(RegionSignalPanel());
  });
}

/** ① 组件内 ref：数据与驱动都在组件里，值位置直接接句柄。 */
function ComponentStatePanel() {
  const count = ref(0);

  return div((panel) => {
    panel.className('demo-region-compare-panel');
    panel.attr('data-region-state', 'true');
    panel.span((line) => line.child(vText(computed(() => `组件状态：${count.value}`))));
    panel.vButton('+1（组件状态）', (button) => {
      button.attr('data-region-state-add', 'true');
      button.on('click', () => {
        count.value += 1;
      });
    });
  });
}

/** ② 组件外 ref：数据在组件外创建（可跨组件共享），绑定自动写回，无需手动 flush。 */
function ExternalDataSourcePanel() {
  const data = { count: ref(0) };

  return div((panel) => {
    panel.className('demo-region-compare-panel');
    panel.attr('data-region-source', 'true');
    panel.span((line) => line.child(vText(computed(() => `外部数据源：${data.count.value}`))));
    panel.vButton('+1（外部数据）', (button) => {
      button.attr('data-region-source-add', 'true');
      button.on('click', () => {
        data.count.value += 1; // 写入即写回，不需要 flush()
      });
    });
  });
}

/** ③ 区域依赖：区域构建期直读 ref，写入触发重建；值绑定覆盖不到的结构变化走这里。 */
function RegionSignalPanel() {
  const count = ref(0);

  return div((panel) => {
    panel.className('demo-region-compare-panel');
    panel.attr('data-region-local', 'true');
    panel.rebuildable(() => true);
    panel.span((line) => line.child(vText(`区域信号：${count.value}`)));
    panel.vButton('+1（区域信号）', (button) => {
      button.attr('data-region-local-add', 'true');
      button.on('click', () => {
        count.value += 1; // 区域读到过 count，写入即重建子树
      });
    });
  });
}

/** 源码面板用：三块面板的函数按文件顺序展示，再展示入口组件。 */
export const regionCompareBlocksSource = [
  ComponentStatePanel,
  ExternalDataSourcePanel,
  RegionSignalPanel
]
  .map((block) => componentSource(block, []).replace(/^export /, ''))
  .join('\n\n');
