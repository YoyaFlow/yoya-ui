import { div, vStateNode, vText } from '../../index.js';
import {
  disableDevtools,
  enableDevtools,
  getDevtoolsDom,
  getDevtoolsScope,
  getDevtoolsSnapshot,
  subscribeDevtools
} from '../../yoya.devtools.js';

/**
 * 参考调试面板：只消费 devtools 公开入口，展示树、详情、事件与 DOM 高亮。
 */
export function DevtoolsInspectorDemo() {
  const state = {
    enabled: false,
    events: [],
    selectedId: null,
    tree: null,
    eventFilter: 'all'
  };
  let stopSubscription = null;
  let toggleButton = null;
  let inspectRoot = null;
  let statusText = null;
  let treeHost = null;
  let detailHost = null;
  let eventHost = null;
  let highlighted = null;
  const stateByNode = {};

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
      updateStatus();
      renderEvents();
      renderDetail();
      if (treeHost) {
        treeHost.clearChildren();
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
    statusText.text(state.enabled ? '状态：已启用，事件仅来自下方被检视卡片' : '状态：未启用');
  }

  function refreshTree() {
    if (!treeHost || !state.enabled) {
      return;
    }
    state.tree = getDevtoolsSnapshot(inspectRoot);
    treeHost.clearChildren();
    treeHost.child(TreeBranch(state.tree, 0));
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
    const visibleEvents = [...state.events]
      .slice(-30)
      .filter((event) => state.eventFilter === 'all' || event.type === state.eventFilter);
    visibleEvents.forEach((event) => {
      const text = `${event.seq} ${event.type} ${describeEvent(event)} #${event.nodeId}`;
      const row = eventHost.p(text);
      row.className('devtools-event-row');
      row.attr('data-devtools-event', 'true');
    });
  }

  function describeEvent(event) {
    if (event.type === 'attr' || event.type === 'style') {
      return event.name;
    }
    if (event.type === 'text') {
      return `${event.from} -> ${event.to}`;
    }
    if (event.type === 'state') {
      return `state ${Object.keys(event.changed || {}).join(',')}`;
    }
    return '';
  }

  function render() {
    return div((root) => {
      root.className('yoya-devtools-inspector');
      root.attr('data-devtools-inspector', 'true');
      root.style('display', 'grid');
      root.style('gap', '12px');

      root.div((bar) => {
        bar.className('devtools-controls');
        bar.vButton(state.enabled ? '停用 DevTools' : '启用 DevTools', (button) => {
          button.variant(state.enabled ? 'default' : 'primary');
          button.attr('data-devtools-toggle', 'true');
          button.on('click', toggle);
          toggleButton = button;
        });
        bar.vButton('刷新快照', (button) => {
          button.on('click', () => {
            state.selectedId = null;
            clearHighlight();
            refreshTree();
            renderDetail();
          });
        });
        bar.label('事件筛选');
        bar.select((select) => {
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

      root.p('状态：未启用', (node) => {
        statusText = node;
        node.attr('data-devtools-status', 'true');
      });

      root.div((stage) => {
        stage.className('devtools-stage');
        inspectRoot = div((wrapper) => {
          wrapper.className('devtools-inspect-root');
          wrapper.attr('data-devtools-inspect-root', 'true');
          wrapper.child(target);
        });
        stage.child(inspectRoot);
      });

      root.div((columns) => {
        columns.className('devtools-columns');
        columns.style('display', 'grid');
        columns.style('gridTemplateColumns', 'repeat(3, 1fr)');
        columns.style('gap', '12px');
        columns.h4('视图树');
        const treeBox = div();
        columns.child(treeBox);
        treeHost = treeBox;
        columns.h4('选中详情');
        const detailBox = div();
        columns.child(detailBox);
        detailHost = detailBox;
        columns.h4('事件时间线');
        const eventBox = div();
        columns.child(eventBox);
        eventHost = eventBox;
      });
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
