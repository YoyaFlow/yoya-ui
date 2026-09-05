import { div, vStateNode, vText } from '../../index.js';
import '../devtools-inspector.css';
import {
  disableDevtools,
  enableDevtools,
  getDevtoolsDom,
  getDevtoolsScope,
  getDevtoolsSnapshot,
  subscribeDevtools
} from '../../yoya.devtools.js';

/**
 * 专用 DevTools 大弹窗：按标签页分类展示对象结构、操作日志与状态/作用域；
 * 「隐藏」只收起弹窗，不销毁任何面板状态。
 */
export function DevtoolsInspectorDemo() {
  const state = {
    activeTab: 'tree',
    enabled: false,
    events: [],
    eventFilter: 'all',
    selectedId: null,
    tree: null
  };
  const stateByNode = {};
  let detailHost = null;
  let eventHost = null;
  let highlighted = null;
  let inspectRoot = null;
  let overlay = null;
  let statusText = null;
  let stopSubscription = null;
  let toggleButton = null;
  let treeHost = null;
  let treePanel = null;
  let logPanel = null;
  let statePanel = null;
  let stateHost = null;
  let treeTabButton = null;
  let logTabButton = null;
  let stateTabButton = null;

  const target = vStateNode({
    state: () => ({ count: 0, mode: 'normal' }),
    render(stateValue, api) {
      return div((box) => {
        box.className('devtools-target-card');
        box.p('计数：', (p) => {
          p.child(vText((current) => String(current.count)));
        });
        box.p(`模式：${stateValue.mode}`);
        box.div((actions) => {
          actions.vButton('+1', (button) => {
            button.variant('primary');
            button.on('click', () => {
              api.setState({ count: stateValue.count + 1 });
            });
          });
          actions.vButton(stateValue.mode === 'normal' ? '切换高亮' : '恢复正常', (button) => {
            button.on('click', () => {
              api.setState({
                mode: stateValue.mode === 'normal' ? 'highlight' : 'normal'
              });
            });
          });
        });
      });
    },
    update(stateValue, api, changed) {
      return changed.has('mode');
    }
  });

  function toggle() {
    if (state.enabled) {
      if (stopSubscription) {
        stopSubscription();
      }
      stopSubscription = null;
      disableDevtools();
      state.enabled = false;
      if (toggleButton) {
        toggleButton.label('启用 DevTools');
        toggleButton.variant('primary');
      }
      state.events = [];
      state.selectedId = null;
      state.tree = null;
      Object.keys(stateByNode).forEach((key) => delete stateByNode[key]);
      updateStatus();
      renderEvents();
      renderDetail();
      renderStateList();
      if (treeHost) {
        treeHost.clearChildren();
        flushHost(treeHost);
      }
      return;
    }

    state.enabled = true;
    enableDevtools();
    if (toggleButton) {
      toggleButton.label('停用 DevTools');
      toggleButton.variant('secondary');
    }
    state.events = [];
    stopSubscription = subscribeDevtools((event) => {
      if (!isInsideInspectedTree(event)) {
        return;
      }
      if (event.type === 'state') {
        stateByNode[event.nodeId] = event.state;
        renderStateList();
      }
      state.events.push(event);
      if (state.events.length > 100) {
        state.events.shift();
      }
      renderEvents();
    });
    updateStatus();
    refreshTree();
    renderEvents();
    renderStateList();
  }

  function isInsideInspectedTree(event) {
    const rootElement = state.tree ? getDevtoolsDom(state.tree.id) : null;
    const domNode = getDevtoolsDom(event.nodeId);
    if (!rootElement || !domNode) {
      return false;
    }
    let current = domNode.parentNode;
    while (current) {
      if (current === rootElement) {
        return true;
      }
      current = current.parentNode;
    }
    return false;
  }

  function updateStatus() {
    if (!statusText) {
      return;
    }
    statusText.text(state.enabled ? '状态：已启用，事件仅来自被检视卡片' : '状态：未启用');
  }

  function flushHost(host) {
    if (host) {
      host.commit();
    }
  }

  function refreshTree() {
    if (!treeHost || !state.enabled) {
      return;
    }
    state.tree = getDevtoolsSnapshot(inspectRoot);
    treeHost.clearChildren();
    flushHost(treeHost);
    treeHost.child(TreeBranch(state.tree, 0));
    flushHost(treeHost);
  }

  function TreeBranch(snapshot, depth) {
    return div((row) => {
      row.className('devtools-tree-row');
      row.attr('data-devtools-tree-row', 'true');
      row.style('paddingLeft', `${depth * 16}px`);
      row.button(formatTreeLabel(snapshot), (button) => {
        button.className('devtools-tree-button');
        button.attr('data-devtools-tree-id', String(snapshot.id));
        button.on('click', () => selectNode(snapshot.id));
      });
      (snapshot.children || []).forEach((child) => {
        row.child(TreeBranch(child, depth + 1));
      });
    });
  }

  function formatTreeLabel(snapshot) {
    const parts = [snapshot.kind];
    if (snapshot.tagName) {
      parts.push(snapshot.tagName);
    }
    parts.push(`#${snapshot.id}`);
    if (snapshot.text !== undefined) {
      parts.push(JSON.stringify(snapshot.text));
    }
    return parts.join(' ');
  }

  function selectNode(id) {
    state.selectedId = id;
    clearHighlight();
    const domNode = getDevtoolsDom(id);
    if (domNode && domNode.nodeType === 1) {
      highlighted = domNode;
      highlighted.style.outline = '2px solid #2563eb';
    }
    renderDetail();
  }

  function clearHighlight() {
    if (highlighted) {
      highlighted.style.outline = '';
      highlighted = null;
    }
  }

  function renderDetail() {
    if (!detailHost) {
      return;
    }
    detailHost.clearChildren();
    flushHost(detailHost);
    if (state.selectedId === null) {
      return;
    }
    const snapshot = findSnapshotNode(state.tree, state.selectedId);
    detailHost.pre((pre) => {
      pre.className('devtools-detail-code');
      pre.code((block) => {
        block.attr('data-devtools-detail', 'true');
        block.text(
          JSON.stringify(
            {
              node: snapshot,
              scope: getDevtoolsScope(state.selectedId),
              state: stateByNode[state.selectedId] || null
            },
            null,
            2
          )
        );
      });
    });
    flushHost(detailHost);
  }

  function findSnapshotNode(root, id) {
    if (!root) {
      return null;
    }
    if (root.id === id) {
      return root;
    }
    for (const child of root.children || []) {
      const found = findSnapshotNode(child, id);
      if (found) {
        return found;
      }
    }
    return null;
  }

  function renderEvents() {
    if (!eventHost) {
      return;
    }
    eventHost.clearChildren();
    flushHost(eventHost);
    const visibleEvents = [...state.events]
      .slice(-30)
      .filter((event) => state.eventFilter === 'all' || event.type === state.eventFilter);
    visibleEvents.forEach((event) => {
      const text = `${event.seq}. ${describeEvent(event)}（#${event.nodeId}）`;
      const row = eventHost.p(text);
      row.className('devtools-event-row');
      row.attr('data-devtools-event', 'true');
      row.attr('data-devtools-event-type', event.type);
    });
    flushHost(eventHost);
  }

  function formatLogValue(value) {
    if (value === undefined || value === null) {
      return '（无）';
    }
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > 30 ? `${text.slice(0, 30)}…` : text;
  }

  function describeEvent(event) {
    const where = event.nodeLabel || `节点 #${event.nodeId}`;
    if (event.type === 'commit') {
      return `渲染 ${where}`;
    }
    if (event.type === 'destroy') {
      return `销毁 ${where}`;
    }
    if (event.type === 'attr' || event.type === 'style') {
      const noun = event.type === 'attr' ? '属性' : '样式';
      const before = formatLogValue(event.previous);
      const after = formatLogValue(event.next);
      return `${where} 的${noun} ${event.name}：${before} → ${after}`;
    }
    if (event.type === 'child') {
      const parts = [];
      if ((event.added || []).length > 0) {
        parts.push(`添加 ${event.added.length} 个子节点`);
      }
      if ((event.removed || []).length > 0) {
        parts.push(`移除 ${event.removed.length} 个`);
      }
      if (event.reordered) {
        parts.push('子节点重排');
      }
      return `${where} ${parts.join('，')}`;
    }
    if (event.type === 'text') {
      return `${where} 文本：${formatLogValue(event.from)} → ${formatLogValue(event.to)}`;
    }
    if (event.type === 'state') {
      const summary = Object.entries(event.changed || {})
        .map(
          ([key, change]) =>
            `${key}: ${formatLogValue(change.from)} → ${formatLogValue(change.to)}`
        )
        .join('，');
      const path =
        {
          bindings: '绑定写回',
          none: '',
          pending: '未挂载',
          rebuild: '重建视图',
          update: 'update 回调'
        }[event.handling] || event.handling;
      return `${where} 状态更新：${summary}（${path}）`;
    }
    return `${where} ${event.type}`;
  }

  function renderStateList() {
    if (!stateHost) {
      return;
    }
    stateHost.clearChildren();
    flushHost(stateHost);
    Object.entries(stateByNode).forEach(([nodeId, componentState]) => {
      const row = stateHost.pre();
      row.className('devtools-state-row');
      row.attr('data-devtools-state-row', 'true');
      row.text(`${nodeId}: ${JSON.stringify(componentState)}`);
    });
    flushHost(stateHost);
  }

  function switchTab(name) {
    state.activeTab = name;
    [treePanel, logPanel, statePanel].forEach((panel) => {
      if (panel) {
        panel.style('display', panel === panels[name] ? 'block' : 'none');
      }
    });
    const tabs = {
      tree: treeTabButton,
      log: logTabButton,
      state: stateTabButton
    };
    Object.entries(tabs).forEach(([key, button]) => {
      if (button) {
        button.attr('aria-selected', key === name ? 'true' : 'false');
      }
    });
  }

  const panels = {
    tree: null,
    log: null,
    state: null
  };

  function openPanel() {
    if (!overlay) {
      return;
    }
    overlay.style('display', '');
    if (!state.enabled) {
      toggle();
    }
    switchTab(state.activeTab || 'tree');
  }

  function hidePanel() {
    if (overlay) {
      overlay.style('display', 'none');
    }
  }

  function render() {
    return div((shell) => {
      shell.className('yoya-devtools-shell');

      shell.div((launcher) => {
        launcher.className('yoya-devtools-launcher');
        launcher.p('DevTools 信息集中在一个可隐藏的大弹窗里，切换标签不丢状态。');
        launcher.vButton('打开 DevTools 面板', (button) => {
          button.variant('primary');
          button.attr('data-devtools-open', 'true');
          button.on('click', openPanel);
        });
      });

      overlay = div((overlayRoot) => {
        overlayRoot.className('yoya-devtools-overlay');
        overlayRoot.attr('data-devtools-overlay', 'true');
        overlayRoot.attr('data-devtools-inspector', 'true');
        overlayRoot.style('display', 'none');
        overlayRoot.div((backdrop) => {
          backdrop.className('yoya-devtools-backdrop');
          backdrop.attr('data-devtools-backdrop', 'true');
          backdrop.on('click', hidePanel);
        });
        overlayRoot.div((dialog) => {
          dialog.className('yoya-devtools-dialog');

          dialog.div((header) => {
            header.className('devtools-dialog-header');
            header.h2('yoya-ui DevTools');
            header.p('状态：未启用', (node) => {
              statusText = node;
              node.attr('data-devtools-status', 'true');
            });
            header.vButton('启用 DevTools', (button) => {
              button.variant('primary');
              button.attr('data-devtools-toggle', 'true');
              button.on('click', toggle);
              toggleButton = button;
            });
            header.vButton('刷新快照', (button) => {
              button.attr('data-devtools-refresh', 'true');
              button.on('click', () => {
                state.selectedId = null;
                clearHighlight();
                refreshTree();
                renderDetail();
              });
            });
            header.vButton('隐藏面板', (button) => {
              button.attr('data-devtools-close', 'true');
              button.on('click', hidePanel);
            });
          });

          dialog.div((tabs) => {
            tabs.className('devtools-tabs');
            tabs.button('对象结构', (button) => {
              treeTabButton = button;
              button.attr('data-devtools-tab', 'tree');
              button.on('click', () => switchTab('tree'));
            });
            tabs.button('操作日志', (button) => {
              logTabButton = button;
              button.attr('data-devtools-tab', 'log');
              button.on('click', () => switchTab('log'));
            });
            tabs.button('状态与作用域', (button) => {
              stateTabButton = button;
              button.attr('data-devtools-tab', 'state');
              button.on('click', () => switchTab('state'));
            });
          });

          const contentBox = dialog.div();
          contentBox.className('devtools-content');

          treePanel = div((panel) => {
            panels.tree = panel;
            panel.className('devtools-panel');
            panel.attr('data-devtools-panel', 'tree');
            panel.div((stage) => {
              stage.className('devtools-stage');
              inspectRoot = div((wrapper) => {
                wrapper.className('devtools-inspect-root');
                wrapper.attr('data-devtools-inspect-root', 'true');
                wrapper.child(target);
              });
              stage.child(inspectRoot);
            });
            panel.div((layout) => {
              layout.className('devtools-tree-layout');
              layout.div((treeColumn) => {
                treeColumn.h4('视图树');
                const treeBox = div();
                treeColumn.child(treeBox);
                treeHost = treeBox;
              });
              layout.div((detailColumn) => {
                detailColumn.h4('选中详情');
                const detailBox = div();
                detailColumn.child(detailBox);
                detailHost = detailBox;
              });
            });
          });
          contentBox.child(treePanel);

          logPanel = div((panel) => {
            panels.log = panel;
            panel.className('devtools-panel');
            panel.attr('data-devtools-panel', 'log');
            panel.style('display', 'none');
            panel.div((toolbar) => {
              toolbar.className('devtools-controls');
              toolbar.label('事件筛选');
              toolbar.select((select) => {
                select.attr('data-devtools-filter', 'true');
                ['all', 'commit', 'destroy', 'attr', 'style', 'child', 'text', 'state'].forEach(
                  (kind) => {
                    select.option(kind);
                  }
                );
                select.on('change', (event) => {
                  state.eventFilter = event.target.value;
                  renderEvents();
                });
              });
            });
            const eventBox = div();
            panel.child(eventBox);
            eventHost = eventBox;
          });
          contentBox.child(logPanel);

          statePanel = div((panel) => {
            panels.state = panel;
            panel.className('devtools-panel');
            panel.attr('data-devtools-panel', 'state');
            panel.style('display', 'none');
            panel.h3('组件状态');
            const stateBox = div();
            panel.child(stateBox);
            stateHost = stateBox;
            panel.p('在「对象结构」中选择节点可查看 access / Context / i18n 详情。');
          });
          contentBox.child(statePanel);
        });
      });
      shell.child(overlay);
    });
  }

  return {
    render,
    destroy() {
      if (stopSubscription) {
        stopSubscription();
      }
      stopSubscription = null;
      if (state.enabled) {
        disableDevtools();
      }
      state.enabled = false;
    }
  };
}
