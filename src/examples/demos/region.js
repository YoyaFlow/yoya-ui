import { vText, vstack } from '../../index.js';

/** 区域演示 1：声明区域 + 手动 rerun，区域外的节点不受影响。 */
export function RegionRerunExample() {
  const data = { rows: ['接口联调'] };
  let region = null;

  const api = {
    add() {
      data.rows.push(`任务 ${data.rows.length + 1}`);
      region.rerun();
      return api;
    },
    clear() {
      data.rows.length = 0;
      region.rerun();
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.input((field) => {
          field.attr({
            'data-region-outside': 'true',
            placeholder: '区域外的输入框：重跑后依然在',
            type: 'text'
          });
        });
        stack.ul((list) => {
          list.className('demo-region-list');
          list.attr('data-region-list', 'true');
          list.rebuildable();
          region = list;
          data.rows.forEach((row) => list.li(row));
        });
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

/** 区域演示 2：谓词门禁——为假时只刷值并记 pending，恢复后补一次重建。 */
export function RegionGateExample() {
  const data = { label: 'A' };
  let locked = false;
  let region = null;
  let status = null;

  const api = {
    toggleLabel() {
      data.label = data.label === 'A' ? 'B' : 'A';
      region.rerun();
      syncStatus();
      return api;
    },
    toggleLock() {
      locked = !locked;
      if (!locked && region.regionPending()) {
        region.rerun();
      }
      syncStatus();
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.div((box) => {
          box.className('demo-region-gate');
          // 先声明区域，再写值函数与其它登记
          box.rebuildable(() => !locked);
          region = box;
          box.attr({
            'data-region-gate': 'true',
            'data-region-locked': () => (locked ? 'true' : null)
          });
          box.span((line) => {
            line.attr('data-region-label', 'true');
            line.child(vText(() => data.label));
          });
        });
        stack.div((line) => {
          line.attr('data-region-pending', 'true');
          status = line;
          line.text('状态：已同步');
        });
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
    if (status) {
      status.text(region && region.regionPending() ? '状态：已跳过（待重建）' : '状态：已同步');
    }
  }

  return api;
}

/** 区域演示 3：dataSource 让带参值函数在普通区域里拿到数据来源。 */
export function RegionDataSourceExample() {
  const data = { count: 0 };
  let region = null;

  const api = {
    add() {
      data.count += 1;
      region.rerun();
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.div((box) => {
          box.className('demo-region-source');
          box.attr('data-region-source', 'true');
          box.dataSource(() => data); // 带参值函数的数据来源
          box.rebuildable();
          box.attr('data-count', (source) => String(source.count));
          box.span((line) => {
            line.child(vText((source) => `共 ${source.count} 条`));
          });
          region = box;
        });
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
