import { div, keySet, p, pre, ref, vNode, vText } from '@yoyaflow/yoya-ui';
import '../devtools-inspector.css';
import {
  disableDevtools,
  enableDevtools,
  getDevtoolsDom,
  getDevtoolsScope,
  getDevtoolsSnapshot,
  subscribeDevtools
} from '@yoyaflow/yoya-ui/dev';

/** 日志面板的事件筛选选项：与 devtools 事件契约保持同序。 */
const EVENT_FILTERS = [
  'all',
  'commit',
  'destroy',
  'attr',
  'style',
  'child',
  'text',
  'signal-write'
];

/**
 * 值 → 文本：日志里的前后值与状态列表里的信号值可能是**自引用结构**（节点带着父链/子节点），
 * `JSON.stringify` 会直接抛 "Converting circular structure to JSON"，把整张列表打断。
 * 这类值只按形状给个摘要，够诊断用。
 */
function stringifyInspectValue(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value !== 'object') {
    return String(value);
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    const size = Array.isArray(value) ? value.length : Object.keys(value).length;
    return `[${Array.isArray(value) ? '数组' : '对象'} ${size} 项]`;
  }
}

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
  const signalValues = new Map();
  /** 事件日志：keyed 列表（键 = event.seq），筛选 / 截断都只是换数据。 */
  const eventLog = keySet([], (event) => event.seq);
  /** 信号值列表：键 = signalId，值变化只换 data。 */
  const signalRows = keySet([], (row) => row.id);
  let detailHost = null;
  let highlighted = null;
  let inspectRoot = null;
  let overlay = null;
  /** 正在把事件落进面板（日志 / 状态列表）期间为真：这期间的写入事件都是自己的回声，要丢。 */
  let applyingEventState = false;
  let statusText = null;
  let stopSubscription = null;
  let toggleButton = null;
  let treeHost = null;
  let treePanel = null;
  let logPanel = null;
  let statePanel = null;
  let treeTabButton = null;
  let logTabButton = null;
  let stateTabButton = null;

  // 被检视的目标卡片：计数走值绑定，模式驱动区域重建（写入都会上报 signal-write）
  const targetCount = ref(0);
  const targetMode = ref('normal');
  // 形态 A 薄工厂（票 07）：直接返回视图
  const target = () =>
    div((box) => {
      box.className('devtools-target-card');
      box.rebuildable(() => true);
      box.p('计数：', (p) => {
        p.child(vText(targetCount));
      });
      box.p(`模式：${targetMode.value}`);
      box.div((actions) => {
        actions.vButton('+1', (button) => {
          button.variant('primary');
          button.on('click', () => {
            targetCount.value += 1;
          });
        });
        actions.vButton(targetMode.value === 'normal' ? '切换高亮' : '恢复正常', (button) => {
          button.on('click', () => {
            targetMode.value = targetMode.value === 'normal' ? 'highlight' : 'normal';
          });
        });
      });
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
      signalValues.clear();
      updateStatus();
      renderEvents();
      renderDetail();
      renderStateList();
      if (treeHost) {
        treeHost.rebuild();
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

      const signalWrite = event.type === 'signal-write';
      // 面板自己也用信号（日志 / 状态列表）：写入会回声成新的 signal-write 事件，
      // 不挡掉就是"写列表 → 事件 → 再写列表"的自激循环
      if (signalWrite && applyingEventState) {
        return;
      }
      if (signalWrite) {
        signalValues.set(event.signalId, event.next);
      }
      state.events.push(event);
      if (state.events.length > 100) {
        state.events.shift();
      }
      applyingEventState = true;
      try {
        if (signalWrite) {
          renderStateList();
        }
        renderEvents();
      } finally {
        applyingEventState = false;
      }
    });
    updateStatus();
    refreshTree();
    renderEvents();
    renderStateList();
  }

  function isInsideInspectedTree(event) {
    // 信号写入不挂节点，直接放行进日志
    if (event.type === 'signal-write') {
      return true;
    }
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
    statusText.value = state.enabled ? '状态：已启用，事件仅来自被检视卡片' : '状态：未启用';
  }

  function refreshTree() {
    if (!treeHost || !state.enabled) {
      return;
    }
    state.tree = getDevtoolsSnapshot(inspectRoot);
    treeHost.rebuild();
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
    detailHost.rebuild();
  }

  /** 被检视卡片上的信号没有挂在节点上：选中卡片子树时按值展示最新状态。 */
  function readCardSignals(nodeId) {
    const rootElement = state.tree ? getDevtoolsDom(state.tree.id) : null;
    const domNode = getDevtoolsDom(nodeId);
    if (!rootElement || !domNode || !rootElement.contains(domNode)) {
      return null;
    }
    return { count: targetCount.value, mode: targetMode.value };
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
    eventLog.replaceAll(
      state.events
        .slice(-30)
        .filter((event) => state.eventFilter === 'all' || event.type === state.eventFilter)
    );
  }

  function formatLogValue(value) {
    if (value === undefined || value === null) {
      return '（无）';
    }
    const text = stringifyInspectValue(value);
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
    if (event.type === 'signal-write') {
      const before = formatLogValue(event.previous);
      const after = formatLogValue(event.next);
      return `信号 #${event.signalId} 写入：${before} → ${after}（依赖绑定 ${event.dependents} 个）`;
    }
    if (event.type === 'region') {
      const action = event.action === 'rebuild' ? '重建子树' : '仅刷新绑定值';
      const trigger = event.trigger === 'signal' ? '信号触发' : '手动触发';
      return `${where} 区域${action}（${trigger}）`;
    }
    return `${where} ${event.type}`;
  }

  function renderStateList() {
    signalRows.replaceAll([...signalValues].map(([id, value]) => ({ id, value })));
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
            statusText = ref('状态：未启用');
            header.p((node) => {
              node.attr('data-devtools-status', 'true');
              node.child(vText(statusText));
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
            tabs.button('信号与作用域', (button) => {
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
                const treeBox = div((box) => {
                  box.rebuildable();
                  if (state.tree) {
                    box.child(TreeBranch(state.tree, 0));
                  }
                });
                treeColumn.child(treeBox);
                treeHost = treeBox;
              });
              layout.div((detailColumn) => {
                detailColumn.h4('选中详情');
                const detailBox = div((box) => {
                  box.rebuildable();
                  if (state.selectedId === null) {
                    return;
                  }
                  const snapshot = findSnapshotNode(state.tree, state.selectedId);
                  box.pre((pre) => {
                    pre.className('devtools-detail-code');
                    pre.code((block) => {
                      block.attr('data-devtools-detail', 'true');
                      block.child(
                        JSON.stringify(
                          {
                            node: snapshot,
                            scope: getDevtoolsScope(state.selectedId),
                            signals: readCardSignals(state.selectedId)
                          },
                          null,
                          2
                        )
                      );
                    });
                  });
                });
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
                EVENT_FILTERS.forEach((kind) => {
                  select.option(kind);
                });
                select.on('change', (event) => {
                  state.eventFilter = event.target.value;
                  renderEvents();
                });
              });
            });
            const eventBox = div((box) => {
              box.keyed(eventLog, (item) => {
                const event = item.data;
                const row = p(`${event.seq}. ${describeEvent(event)}（#${event.nodeId}）`);
                row.className('devtools-event-row');
                row.attr('data-devtools-event', 'true');
                row.attr('data-devtools-event-type', event.type);
                return row;
              });
            });
            panel.child(eventBox);
          });
          contentBox.child(logPanel);

          statePanel = div((panel) => {
            panels.state = panel;
            panel.className('devtools-panel');
            panel.attr('data-devtools-panel', 'state');
            panel.style('display', 'none');
            panel.h3('信号值');
            const stateBox = div((box) => {
              box.keyed(signalRows, (item) => {
                const row = pre();
                row.className('devtools-state-row');
                row.attr('data-devtools-state-row', 'true');
                row.child(`#${item.data.id}: ${stringifyInspectValue(item.data.value)}`);
                return row;
              });
            });
            panel.child(stateBox);
            panel.p('在「对象结构」中选择节点可查看 access / Context / i18n 详情。');
          });
          contentBox.child(statePanel);
        });
      });
      shell.child(overlay);
    });
  }

  return vNode((api) => {
    api.whenDestroy = () => {
      if (stopSubscription) {
        stopSubscription();
      }
      stopSubscription = null;
      if (state.enabled) {
        disableDevtools();
      }
      state.enabled = false;
    };
    return render();
  });
}
