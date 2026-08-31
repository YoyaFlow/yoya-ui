import { HtmlElementNode } from '../html/index.js';
import { ViewNode } from '../core/node.js';
import { allocateId } from '../core/id.js';
import {
  applyComponentArguments,
  componentClass,
  isPlainObject,
  normalizeChildren,
  normalizeComponentArguments,
  replaceChildren,
  resolveTextValue,
  themeBorder,
  themeValue
} from '../components/shared.js';

class TemplateIconNode extends ViewNode {
  constructor(html) {
    super();
    this._html = html;
  }

  renderDom() {
    if (!this._el) {
      const template = document.createElement('template');
      template.innerHTML = this._html;
      this._el = template.content.firstElementChild;
    }

    return this._el;
  }

  toHTML() {
    return this._html;
  }
}

/**
 * 树形勾选框输入节点。indeterminate 是 DOM property，无法序列化成 HTML 属性，
 * 因此在 renderDom 阶段补设；toHTML 阶段用 aria-checked="mixed" 表达半选态。
 */
class TreeCheckboxInput extends HtmlElementNode {
  constructor(indeterminate = false) {
    super('input');
    this._treeIndeterminate = Boolean(indeterminate);
  }

  renderDom() {
    const element = super.renderDom();
    element.indeterminate = this._treeIndeterminate;
    return element;
  }
}

export class VTreeNode {
  constructor(setup = null) {
    this._children = [];
    this._state = {
      actions: null,
      checked: false,
      disabled: false,
      expandable: false,
      expanded: false,
      icon: null,
      id: allocateId('tree-node'),
      label: '',
      selected: false
    };
    this.vTreeNode = (value) => {
      const child = value instanceof VTreeNode ? value : new VTreeNode(value);
      this._children.push(child);
      return child;
    };
    this.node = this.vTreeNode;
    this.child = (...children) => {
      children.flat(Infinity).forEach((value) => {
        this._children.push(value instanceof VTreeNode ? value : new VTreeNode(value));
      });
      return this;
    };
    this._setup(setup);
  }

  id(value) {
    if (value === undefined) {
      return this._state.id;
    }

    this._state.id = String(resolveTextValue(value));
    return this;
  }

  key(value) {
    return this.id(value);
  }

  label(value) {
    if (value === undefined) {
      return this._state.label;
    }

    this._state.label = value;
    return this;
  }

  text(value) {
    return this.label(value);
  }

  content(value) {
    return this.label(value);
  }

  title(value) {
    return this.label(value);
  }

  actions(value) {
    if (value === undefined) {
      return this._state.actions;
    }

    this._state.actions = value ?? null;
    return this;
  }

  icon(value) {
    if (value === undefined) {
      return this._state.icon;
    }

    this._state.icon = value ?? null;
    return this;
  }

  expanded(value) {
    if (value === undefined) {
      return this._state.expanded;
    }

    this._state.expanded = Boolean(value);
    return this;
  }

  expandable(value) {
    if (value === undefined) {
      return this._state.expandable;
    }

    this._state.expandable = Boolean(value);
    return this;
  }

  selected(value) {
    if (value === undefined) {
      return this._state.selected;
    }

    this._state.selected = Boolean(value);
    return this;
  }

  checked(value) {
    if (value === undefined) {
      return this._state.checked;
    }

    this._state.checked = Boolean(value);
    return this;
  }

  disabled(value) {
    if (value === undefined) {
      return this._state.disabled;
    }

    this._state.disabled = Boolean(value);
    return this;
  }

  toData() {
    return {
      actions: this._state.actions,
      checked: this._state.checked,
      children: this._children.map((child) => child.toData()),
      disabled: this._state.disabled,
      expandable: this._state.expandable,
      expanded: this._state.expanded,
      icon: this._state.icon,
      id: this._state.id,
      label: this._state.label,
      selected: this._state.selected
    };
  }

  _setup(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        actions,
        checked,
        children,
        disabled,
        expandable,
        expanded,
        icon,
        id,
        label,
        selected,
        text,
        title
      } = setup;

      if (id !== undefined) {
        this.id(id);
      }

      if (label !== undefined) {
        this.label(label);
      } else if (text !== undefined) {
        this.label(text);
      } else if (title !== undefined) {
        this.label(title);
      }

      if (icon !== undefined) {
        this.icon(icon);
      }

      if (actions !== undefined) {
        this.actions(actions);
      }

      if (expanded !== undefined) {
        this.expanded(expanded);
      }

      if (expandable !== undefined) {
        this.expandable(expandable);
      }

      if (selected !== undefined) {
        this.selected(selected);
      }

      if (checked !== undefined) {
        this.checked(checked);
      }

      if (disabled !== undefined) {
        this.disabled(disabled);
      }

      if (children !== undefined) {
        this.child(children);
      }

      return;
    }

    this.label(setup);
  }
}

export function VTree(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const state = {
    ariaLabel: '树形控件',
    building: true,
    builderNodes: [],
    checkable: false,
    checkedKeys: new Set(),
    emptyText: '暂无数据',
    expandedKeys: new Set(),
    multiple: false,
    nodes: [],
    rowsDirty: false,
    selectable: true,
    selectedKeys: new Set(),
    toggleIcon: null,
    treeDirty: true,
    visibleNodes: []
  };
  let changeHandler = null;
  let checkHandler = null;
  let selectHandler = null;
  let toggleHandler = null;

  const root = new HtmlElementNode('div')
    .className(componentClass, 'yoya-vtree')
    .attr({
      'aria-label': state.ariaLabel,
      'data-tree': 'true',
      id: allocateId('yoya-vtree'),
      role: 'tree'
    })
    .styles({
      background: themeValue('color-surface', '#ffffff'),
      border: themeBorder('color-border', '#d8dee8'),
      borderRadius: '8px',
      boxSizing: 'border-box',
      minWidth: '0',
      padding: '6px',
      width: '100%'
    });
  const list = new HtmlElementNode('div').className('yoya-vtree-list').styles({
    display: 'grid',
    gap: '2px',
    minWidth: '0'
  });
  const emptyBox = new HtmlElementNode('div')
    .className('yoya-vtree-empty')
    .attr('role', 'status')
    .styles({
      color: themeValue('color-text-muted', '#64748b'),
      display: 'none',
      fontSize: '0.88rem',
      padding: '18px 10px',
      textAlign: 'center'
    });

  root.child(list, emptyBox);
  root.on('keydown', handleTreeKeydown);

  const api = {
    ariaLabel(value) {
      if (value === undefined) {
        return state.ariaLabel;
      }

      state.ariaLabel = resolveTextValue(value) || '树形控件';
      root.attr('aria-label', state.ariaLabel);
      requestSync();
      return api;
    },
    change(handler) {
      if (handler === undefined) {
        return changeHandler;
      }

      changeHandler = typeof handler === 'function' ? handler : null;
      return api;
    },
    onChange(handler) {
      return api.change(handler);
    },
    checked(value) {
      if (value === undefined) {
        return api.checkedKeys();
      }

      return Array.isArray(value) ? api.checkedKeys(value) : state.checkedKeys.has(String(value));
    },
    checkedKeys(value) {
      if (value === undefined) {
        return [...state.checkedKeys];
      }

      state.checkedKeys = new Set(toKeyList(value));
      requestSync();
      return api;
    },
    check(id, value = undefined) {
      const node = findNode(state.nodes, id);
      if (!node || node.disabled) {
        return api;
      }

      const checked = value === undefined ? !state.checkedKeys.has(node.id) : Boolean(value);
      setNodeChecked(node, checked);
      requestSync();
      emitChange('check', node);
      return api;
    },
    checkable(value) {
      if (value === undefined) {
        return state.checkable;
      }

      state.checkable = Boolean(value);
      state.treeDirty = true;
      requestSync();
      return api;
    },
    checkAll(value = true) {
      const checked = Boolean(value);
      const ids = [];
      collectExpandableNodes(state.nodes, (node) => {
        if (!node.disabled) {
          ids.push(node.id);
        }
      });

      if (checked) {
        ids.forEach((id) => state.checkedKeys.add(id));
      } else {
        ids.forEach((id) => state.checkedKeys.delete(id));
      }

      requestSync();
      emitChange('check', null);
      return api;
    },
    collapseAll() {
      state.expandedKeys.clear();
      state.treeDirty = true;
      requestSync();
      return api;
    },
    collapseNode(id) {
      return api.expandNode(id, false);
    },
    data(value) {
      return api.nodes(value);
    },
    emptyText(value) {
      if (value === undefined) {
        return state.emptyText;
      }

      state.emptyText = value;
      requestSync();
      return api;
    },
    expandAll() {
      const ids = [];

      collectExpandableNodes(state.nodes, (node) => {
        if (isBranchNode(node)) {
          ids.push(node.id);
        }
      });
      state.expandedKeys = new Set(ids);
      state.treeDirty = true;
      requestSync();
      return api;
    },
    expandedKeys(value) {
      if (value === undefined) {
        return [...state.expandedKeys];
      }

      state.expandedKeys = new Set(toKeyList(value));
      state.treeDirty = true;
      requestSync();
      return api;
    },
    expandNode(id, value = true) {
      const node = findNode(state.nodes, id);
      if (!node || !isBranchNode(node)) {
        return api;
      }

      const expanded = Boolean(value);
      if (state.expandedKeys.has(node.id) === expanded) {
        return api;
      }

      if (expanded) {
        state.expandedKeys.add(node.id);
      } else {
        state.expandedKeys.delete(node.id);
      }

      state.treeDirty = true;
      requestSync();
      emitChange('expand', node);
      return api;
    },
    multiple(value) {
      if (value === undefined) {
        return state.multiple;
      }

      state.multiple = Boolean(value);
      requestSync();
      return api;
    },
    nodes(value) {
      if (value === undefined) {
        return state.nodes.slice();
      }

      const nextNodes = Array.isArray(value) ? value : [value];
      state.builderNodes = nextNodes;
      state.nodes = state.builderNodes.map((node, index) => normalizeTreeNode(node, index));
      state.expandedKeys = new Set();
      state.selectedKeys = new Set();
      state.checkedKeys = new Set();
      hydrateNodeState(state, state.nodes);
      attachNodeIds(state.nodes);
      state.treeDirty = true;
      requestSync();
      return api;
    },
    vTreeNode(setup) {
      const node = setup instanceof VTreeNode ? setup : new VTreeNode(setup);
      state.builderNodes.push(node);
      state.nodes = state.builderNodes.map((builderNode, index) =>
        normalizeTreeNode(builderNode, index)
      );
      hydrateNodeState(state, state.nodes);
      attachNodeIds(state.nodes);
      state.treeDirty = true;
      requestSync();
      return node;
    },
    node(setup) {
      return api.vTreeNode(setup);
    },
    addNode(setup) {
      return api.vTreeNode(setup);
    },
    onCheck(handler) {
      if (handler === undefined) {
        return checkHandler;
      }

      checkHandler = typeof handler === 'function' ? handler : null;
      return api;
    },
    onSelect(handler) {
      if (handler === undefined) {
        return selectHandler;
      }

      selectHandler = typeof handler === 'function' ? handler : null;
      return api;
    },
    onToggle(handler) {
      if (handler === undefined) {
        return toggleHandler;
      }

      toggleHandler = typeof handler === 'function' ? handler : null;
      return api;
    },
    render() {
      sync();
      return root;
    },
    select(id, value = undefined) {
      const node = findNode(state.nodes, id);
      if (!node || node.disabled) {
        return api;
      }

      const wasSelected = state.selectedKeys.has(node.id);
      const next = value === undefined ? Boolean(!state.multiple || !wasSelected) : Boolean(value);

      if (next) {
        state.selectedKeys = state.multiple
          ? new Set([...state.selectedKeys, node.id])
          : new Set([node.id]);
      } else {
        state.selectedKeys.delete(node.id);
      }

      if (wasSelected === next) {
        requestSync();
        return api;
      }

      requestSync();
      emitChange('select', node);
      return api;
    },
    selectable(value) {
      if (value === undefined) {
        return state.selectable;
      }

      state.selectable = Boolean(value);
      state.rowsDirty = true;
      requestSync();
      return api;
    },
    selected(value) {
      if (value === undefined) {
        return collectNodesById(state.nodes, state.selectedKeys);
      }

      return Array.isArray(value) ? api.selectedKeys(value) : state.selectedKeys.has(String(value));
    },
    selectedKeys(value) {
      if (value === undefined) {
        return [...state.selectedKeys];
      }

      state.selectedKeys = new Set(toKeyList(value));
      requestSync();
      return api;
    },
    toggleNode(id) {
      const node = findNode(state.nodes, id);
      if (!node || !isBranchNode(node)) {
        return api;
      }

      return api.expandNode(id, !state.expandedKeys.has(id));
    },
    toggleIcon(value, expandedValue) {
      if (value === undefined && expandedValue === undefined) {
        return state.toggleIcon;
      }

      if (expandedValue !== undefined) {
        state.toggleIcon = {
          collapsed: normalizeToggleIconValue(value),
          expanded: normalizeToggleIconValue(expandedValue)
        };
      } else if (isPlainObject(value) && 'collapsed' in value) {
        state.toggleIcon = {
          collapsed: normalizeToggleIconValue(value.collapsed),
          expanded: normalizeToggleIconValue(value.expanded)
        };
      } else {
        state.toggleIcon = normalizeToggleIconValue(value);
      }
      state.treeDirty = true;
      requestSync();
      return api;
    },
    update(value) {
      state.building = true;
      applyTreeSetup(value);
      state.building = false;
      sync();
      return api;
    },
    destroy() {
      root.destroy();
      return api;
    }
  };

  applyTreeSetup(args.first);
  state.building = false;
  sync();
  applyComponentArguments(api, args.options, args.callback);
  return api;

  function requestSync() {
    if (!state.building) {
      sync();
    }
  }

  function applyTreeSetup(value) {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'function') {
      value(api);
      return;
    }

    if (Array.isArray(value)) {
      api.nodes(value);
      return;
    }

    if (!isPlainObject(value)) {
      return;
    }

    const {
      ariaLabel,
      change,
      checked,
      checkedKeys,
      checkable,
      children,
      className,
      data,
      emptyText,
      expandAll,
      expandedKeys,
      multiple,
      nodes,
      onCheck,
      onChange,
      onSelect,
      onToggle,
      selectable,
      selected,
      selectedKeys,
      toggleIcon,
      ...elementConfig
    } = value;

    if (Object.keys(elementConfig).length > 0) {
      root.setup(elementConfig);
    }

    if (className !== undefined) {
      root.className(className);
    }

    if (ariaLabel !== undefined) {
      api.ariaLabel(ariaLabel);
    }

    if (checkable !== undefined) {
      api.checkable(checkable);
    }

    if (multiple !== undefined) {
      api.multiple(multiple);
    }

    if (selectable !== undefined) {
      api.selectable(selectable);
    }

    if (toggleIcon !== undefined) {
      api.toggleIcon(toggleIcon);
    }

    if (emptyText !== undefined) {
      api.emptyText(emptyText);
    }

    const treeNodes = nodes ?? data ?? children;
    if (treeNodes !== undefined) {
      api.nodes(treeNodes);
    }

    if (expandedKeys !== undefined) {
      api.expandedKeys(expandedKeys);
    }

    if (selectedKeys !== undefined) {
      api.selectedKeys(selectedKeys);
    } else if (selected !== undefined) {
      api.selectedKeys(selected);
    }

    if (checkedKeys !== undefined) {
      api.checkedKeys(checkedKeys);
    } else if (checked !== undefined) {
      api.checkedKeys(checked);
    }

    if (expandAll === true) {
      api.expandAll();
    }

    if (typeof change === 'function') {
      api.change(change);
    } else if (typeof onChange === 'function') {
      api.change(onChange);
    }

    if (typeof onSelect === 'function') {
      api.onSelect(onSelect);
    }

    if (typeof onToggle === 'function') {
      api.onToggle(onToggle);
    }

    if (typeof onCheck === 'function') {
      api.onCheck(onCheck);
    }
  }

  function sync() {
    const hasNodes = state.nodes.length > 0;

    root.attr('aria-label', state.ariaLabel);
    root.attr('data-checkable', state.checkable ? 'true' : null);
    root.attr('data-checked-count', String(state.checkedKeys.size));
    root.attr('data-empty', hasNodes ? null : 'true');
    root.attr('data-expanded-count', String(state.expandedKeys.size));
    root.attr('data-multiple', state.multiple ? 'true' : null);
    root.attr('data-selected-count', String(state.selectedKeys.size));

    if (hasNodes) {
      emptyBox.style('display', 'none');
      replaceChildren(emptyBox, []);
    } else {
      emptyBox.style('display', null);
      replaceChildren(emptyBox, normalizeChildren(state.emptyText));
    }

    writeBackNodeState();

    if (state.treeDirty || state.visibleNodes.length === 0) {
      rebuildRows();
      state.treeDirty = false;
      state.rowsDirty = false;
    } else {
      updateRows(state.rowsDirty);
      state.rowsDirty = false;
    }

    setTabStops(0);
  }

  function rebuildRows() {
    state.visibleNodes = [];
    replaceChildren(list, []);

    if (state.nodes.length > 0) {
      state.nodes.forEach((node) => appendNode(node, 0, null));
    }
  }

  function updateRows(force = false) {
    state.visibleNodes.forEach((entry) => {
      const { checkbox, node, row, toggle } = entry;
      const selected = state.selectedKeys.has(node.id);
      const expanded = isBranchNode(node) && state.expandedKeys.has(node.id);

      if (entry.selected !== selected || force) {
        applyRowVisual(row, node, selected, entry.level);
        entry.selected = selected;
      }

      if (toggle && entry.expanded !== expanded) {
        updateToggleContent(entry, expanded);
        row.attr('aria-expanded', String(expanded));
        entry.expanded = expanded;
      }

      if (checkbox) {
        const checked = state.checkedKeys.has(node.id);
        const indeterminate = isIndeterminate(node);
        if (entry.checked !== checked || entry.indeterminate !== indeterminate) {
          updateCheckbox(checkbox, node, checked, indeterminate);
          entry.checked = checked;
          entry.indeterminate = indeterminate;
        }
      }
    });
  }

  function applyRowVisual(row, node, selected, level) {
    row.styles(createRowStyles(node, selected, level));
    row.attr('aria-selected', state.selectable ? String(selected) : null);
  }

  function updateToggleContent(entry, expanded) {
    const { iconBox, node, toggle } = entry;
    const labelText = resolveTextValue(node.label) || node.id;

    toggle.attr('aria-expanded', String(expanded));
    toggle.attr('aria-label', expanded ? `收起 ${labelText}` : `展开 ${labelText}`);

    if (state.toggleIcon) {
      const toggleIcon = isPlainObject(state.toggleIcon)
        ? expanded
          ? state.toggleIcon.expanded
          : state.toggleIcon.collapsed
        : state.toggleIcon;
      replaceChildren(iconBox, []);
      if (typeof toggleIcon === 'function') {
        const result = toggleIcon(iconBox, expanded);
        if (result && result !== iconBox) {
          iconBox.child(result);
        }
      } else if (typeof toggleIcon === 'string') {
        iconBox.child(new TemplateIconNode(toggleIcon));
      } else {
        replaceChildren(iconBox, normalizeChildren(toggleIcon));
      }
    } else {
      replaceChildren(toggle, normalizeChildren(expanded ? '▾' : '▸'));
    }
  }

  function updateCheckbox(checkbox, node, checked, indeterminate) {
    checkbox.attr('checked', checked ? true : null);
    checkbox.attr('aria-checked', indeterminate ? 'mixed' : checked ? 'true' : 'false');
    checkbox._treeIndeterminate = indeterminate;
    if (checkbox._el) {
      checkbox._el.indeterminate = indeterminate;
    }
  }

  function writeBackNodeState() {
    const visit = (nodes) => {
      nodes.forEach((node) => {
        node.checked = state.checkedKeys.has(node.id);
        node.selected = state.selectedKeys.has(node.id);
        node.expanded = state.expandedKeys.has(node.id);
        visit(node.children);
      });
    };
    visit(state.nodes);
  }

  function appendNode(node, level, parentId) {
    const expanded = isBranchNode(node) && state.expandedKeys.has(node.id);
    const { checkbox, iconBox, row, toggle } = createTreeNodeRow(node, level, expanded);

    state.visibleNodes.push({
      checked: state.checkedKeys.has(node.id),
      checkbox,
      expanded,
      iconBox,
      indeterminate: isIndeterminate(node),
      level,
      node,
      parentId,
      row,
      selected: state.selectedKeys.has(node.id),
      toggle
    });
    list.child(row);

    if (expanded) {
      node.children.forEach((child) => appendNode(child, level + 1, node.id));
    }
  }

  function createTreeNodeRow(node, level, expanded) {
    const selected = state.selectedKeys.has(node.id);
    const row = new HtmlElementNode('div')
      .className('yoya-vtree-node')
      .attr({
        'aria-disabled': node.disabled ? 'true' : null,
        'aria-expanded': isBranchNode(node) ? String(state.expandedKeys.has(node.id)) : null,
        'aria-level': String(level + 1),
        'aria-selected': state.selectable ? String(selected) : null,
        'data-node-id': node.id,
        role: 'treeitem',
        tabindex: '-1'
      })
      .styles(createRowStyles(node, selected, level));

    row.on('click', () => {
      if (node.disabled || !state.selectable) {
        return;
      }

      api.select(node.id);
      focusNodeRow(node.id);
    });
    row.on('mouseenter', () => {
      if (node.disabled) {
        return;
      }

      const isSelected = state.selectedKeys.has(node.id);
      row.styles({
        background: isSelected
          ? themeValue('color-primary-active-subtle', '#dbeafe')
          : themeValue('color-surface-hover', '#f1f5f9'),
        borderColor: isSelected
          ? themeValue('color-primary-border', '#93c5fd')
          : themeValue('color-border-faint', '#e2e8f0')
      });
    });
    row.on('mouseleave', () => {
      const isSelected = state.selectedKeys.has(node.id);
      row.styles(createRowStyles(node, isSelected, level));
    });

    let checkbox = null;
    let iconBox = null;
    let toggle = null;

    if (isBranchNode(node)) {
      const built = createToggle(node, expanded);
      toggle = built.toggle;
      iconBox = built.iconBox;
      row.child(toggle);
    } else {
      row.child(
        new HtmlElementNode('span')
          .className('yoya-vtree-indent')
          .styles({ display: 'inline-block', flex: '0 0 auto', width: '20px' })
      );
    }

    if (state.checkable) {
      checkbox = createCheckbox(node);
      row.child(checkbox);
    }

    if (node.icon !== null && node.icon !== undefined) {
      row.child(createTreeNodeIcon(node.icon));
    }

    const labelBox = new HtmlElementNode('span').className('yoya-vtree-label').styles({
      flex: '1 1 auto',
      minWidth: '0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    });
    replaceChildren(labelBox, normalizeChildren(node.label));
    row.child(labelBox);

    if (node.actions !== null && node.actions !== undefined) {
      row.child(createNodeActions(node));
    }

    return { checkbox, iconBox, row, toggle };
  }

  function createRowStyles(node, selected, level) {
    return {
      alignItems: 'center',
      background: selected ? themeValue('color-primary-subtle', '#eff6ff') : 'transparent',
      border: selected ? themeBorder('color-primary-border', '#bfdbfe') : '1px solid transparent',
      borderRadius: '6px',
      boxSizing: 'border-box',
      color: selected
        ? themeValue('color-primary-hover', '#1d4ed8')
        : node.disabled
          ? themeValue('color-text-muted', '#94a3b8')
          : themeValue('color-text', '#172033'),
      cursor: state.selectable && !node.disabled ? 'pointer' : 'default',
      display: 'flex',
      gap: '4px',
      minHeight: 'var(--yoya-tree-row-height, 34px)',
      minWidth: '0',
      padding: `2px 8px 2px ${8 + level * 18}px`,
      transition: 'background 120ms ease, border-color 120ms ease',
      width: '100%'
    };
  }

  function createToggle(node, expanded) {
    const labelText = resolveTextValue(node.label) || node.id;
    const toggle = new HtmlElementNode('button')
      .className('yoya-vtree-toggle')
      .attr({
        'aria-expanded': String(expanded),
        'aria-label': expanded ? `收起 ${labelText}` : `展开 ${labelText}`,
        tabindex: '-1',
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: 'transparent',
        border: '0',
        borderRadius: '4px',
        color: themeValue('color-text-secondary', '#475569'),
        cursor: 'pointer',
        display: 'inline-flex',
        flex: '0 0 auto',
        font: 'inherit',
        height: 'var(--yoya-tree-toggle-size, 20px)',
        justifyContent: 'center',
        lineHeight: '1',
        padding: '0',
        width: 'var(--yoya-tree-toggle-size, 20px)'
      });
    let iconBox = null;

    if (state.toggleIcon) {
      iconBox = new HtmlElementNode('span').className('yoya-vtree-toggle-icon').styles({
        alignItems: 'center',
        display: 'inline-flex',
        justifyContent: 'center',
        lineHeight: '1'
      });
      const toggleIcon = isPlainObject(state.toggleIcon)
        ? expanded
          ? state.toggleIcon.expanded
          : state.toggleIcon.collapsed
        : state.toggleIcon;

      if (typeof toggleIcon === 'function') {
        const result = toggleIcon(iconBox, expanded);
        if (result && result !== iconBox) {
          iconBox.child(result);
        }
      } else if (typeof toggleIcon === 'string') {
        iconBox.child(new TemplateIconNode(toggleIcon));
      } else {
        replaceChildren(iconBox, normalizeChildren(toggleIcon));
      }

      toggle.child(iconBox);
    } else {
      toggle.text(expanded ? '▾' : '▸');
    }

    toggle.on('click', (event) => {
      event.stopPropagation();
      api.toggleNode(node.id);
      focusNodeRow(node.id);
    });
    return { iconBox, toggle };
  }

  function createCheckbox(node) {
    const checked = state.checkedKeys.has(node.id);
    const indeterminate = isIndeterminate(node);
    const input = new TreeCheckboxInput(indeterminate)
      .className('yoya-vtree-checkbox')
      .attr({
        'aria-checked': indeterminate ? 'mixed' : checked ? 'true' : 'false',
        'aria-label': `选择 ${resolveTextValue(node.label) || node.id}`,
        checked: checked ? true : null,
        disabled: node.disabled ? true : null,
        tabindex: '-1',
        type: 'checkbox'
      })
      .styles({
        flex: '0 0 auto',
        height: '16px',
        margin: '0',
        width: '16px'
      });

    input.on('click', (event) => event.stopPropagation());
    input.on('change', () => {
      api.check(node.id, input._el?.checked ?? false);
    });
    return input;
  }

  function createTreeNodeIcon(content) {
    const iconBox = new HtmlElementNode('span').className('yoya-vtree-icon').styles({
      alignItems: 'center',
      color: themeValue('color-text-muted', '#64748b'),
      display: 'inline-flex',
      flex: '0 0 auto',
      fontSize: '0.82rem',
      justifyContent: 'center',
      minWidth: '18px'
    });

    if (typeof content === 'function') {
      const result = content(iconBox);
      if (result && result !== iconBox) {
        iconBox.child(result);
      }
    } else {
      replaceChildren(iconBox, normalizeChildren(content));
    }

    return iconBox;
  }

  function createNodeActions(node) {
    const actionsBox = new HtmlElementNode('span').className('yoya-vtree-node-actions').styles({
      alignItems: 'center',
      display: 'inline-flex',
      flex: '0 0 auto',
      gap: '4px',
      marginLeft: 'auto'
    });

    actionsBox.on('click', (event) => event.stopPropagation());

    if (typeof node.actions === 'function') {
      const result = node.actions(actionsBox, node);
      if (result && result !== actionsBox) {
        actionsBox.child(result);
      }
    } else {
      replaceChildren(actionsBox, normalizeChildren(node.actions));
    }

    return actionsBox;
  }

  function isIndeterminate(node) {
    if (!state.checkable || node.children.length === 0) {
      return false;
    }

    const ids = node.ids || collectNodeIds(node);
    const anyChecked = ids.some((id) => state.checkedKeys.has(id));
    const allChecked = ids.every((id) => state.checkedKeys.has(id));
    return anyChecked && !allChecked;
  }

  function setTabStops(activeIndex) {
    state.visibleNodes.forEach((entry, index) => {
      const enabled = !entry.node.disabled;
      entry.row.attr('tabindex', enabled && index === activeIndex ? '0' : '-1');
    });
  }

  function focusVisibleIndex(index) {
    const target = state.visibleNodes[index];
    if (!target || target.node.disabled) {
      return;
    }

    setTabStops(index);
    target.row._el?.focus();
  }

  function focusNodeRow(id) {
    const index = state.visibleNodes.findIndex((entry) => entry.node.id === id);
    if (index >= 0) {
      focusVisibleIndex(index);
    }
  }

  function handleTreeKeydown(event) {
    const row = event.target.closest?.('.yoya-vtree-node');
    if (!row || row.closest('.yoya-vtree') !== root._el) {
      return;
    }

    const index = state.visibleNodes.findIndex((entry) => entry.row._el === row);
    if (index === -1) {
      return;
    }

    const navigationKeys = new Set([
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'End',
      'Enter',
      'Home',
      ' ',
      'Spacebar'
    ]);
    if (!navigationKeys.has(event.key)) {
      return;
    }

    event.preventDefault();
    const entry = state.visibleNodes[index];

    switch (event.key) {
      case 'ArrowDown':
        focusNextEnabled(index, 1);
        break;
      case 'ArrowUp':
        focusNextEnabled(index, -1);
        break;
      case 'Home':
        focusNextEnabled(-1, 1);
        break;
      case 'End':
        focusNextEnabled(state.visibleNodes.length, -1);
        break;
      case 'ArrowRight':
        if (isBranchNode(entry.node)) {
          if (!state.expandedKeys.has(entry.node.id)) {
            api.expandNode(entry.node.id);
            focusNodeRow(entry.node.id);
          } else if (index + 1 < state.visibleNodes.length) {
            focusVisibleIndex(index + 1);
          }
        }
        break;
      case 'ArrowLeft':
        if (isBranchNode(entry.node) && state.expandedKeys.has(entry.node.id)) {
          api.collapseNode(entry.node.id);
          focusNodeRow(entry.node.id);
        } else {
          let parentIndex = -1;
          for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
            if (state.visibleNodes[cursor].node.id === entry.parentId) {
              parentIndex = cursor;
              break;
            }
          }
          if (parentIndex >= 0) {
            focusVisibleIndex(parentIndex);
          }
        }
        break;
      case 'Enter':
      case ' ':
      case 'Spacebar':
        if (state.selectable && !entry.node.disabled) {
          api.select(entry.node.id);
          focusNodeRow(entry.node.id);
        }
        break;
      default:
        break;
    }
  }

  function focusNextEnabled(startIndex, step) {
    const total = state.visibleNodes.length;

    for (let cursor = startIndex + step; cursor >= 0 && cursor < total; cursor += step) {
      if (!state.visibleNodes[cursor].node.disabled) {
        focusVisibleIndex(cursor);
        return;
      }
    }
  }

  function emitChange(type, node) {
    const detail = {
      checkedKeys: api.checkedKeys(),
      expandedKeys: api.expandedKeys(),
      id: node?.id ?? null,
      key: node?.id ?? null,
      label: node?.label ?? null,
      node: node ?? null,
      selectedKeys: api.selectedKeys(),
      type
    };

    changeHandler?.(detail);
    if (type === 'check') {
      checkHandler?.(detail);
    } else if (type === 'expand') {
      toggleHandler?.(detail);
    } else if (type === 'select') {
      selectHandler?.(detail);
    }
  }

  function setNodeChecked(node, checked) {
    const ids = collectNodeIds(node);
    ids.forEach((id) => {
      if (checked) {
        state.checkedKeys.add(id);
      } else {
        state.checkedKeys.delete(id);
      }
    });
  }
}

export function vTree(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);

  if (
    args.first &&
    typeof args.first.render === 'function' &&
    typeof args.first.nodes === 'function'
  ) {
    return applyComponentArguments(args.first, args.options, args.callback);
  }

  return VTree(first, second, third);
}

export function vTreeNode(setup = null) {
  return setup instanceof VTreeNode ? setup : new VTreeNode(setup);
}

function normalizeToggleIconValue(value) {
  if (value && typeof value.toHTML === 'function') {
    return value.toHTML();
  }

  return value;
}

function normalizeTreeNode(value, index, parentId = null) {
  const fallbackId = parentId ? `${parentId}-${index}` : `tree-node-${index}`;

  if (value instanceof VTreeNode) {
    return normalizeTreeNode(value.toData(), index, parentId);
  }

  if (
    value instanceof ViewNode ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return {
      actions: null,
      checked: false,
      children: [],
      disabled: false,
      expandable: false,
      expanded: false,
      icon: null,
      id: fallbackId,
      label: value,
      selected: false
    };
  }

  if (Array.isArray(value) && value.length >= 2) {
    return normalizeTreeNode(
      {
        children: value[1],
        id: value[0],
        label: value[0]
      },
      index,
      parentId
    );
  }

  if (isPlainObject(value)) {
    const rawId = value.id ?? value.key ?? value.value ?? fallbackId;
    const id = String(resolveTextValue(rawId));
    const label = value.label ?? value.text ?? value.title ?? value.content ?? id;
    const children = Array.isArray(value.children)
      ? value.children.map((child, childIndex) => normalizeTreeNode(child, childIndex, id))
      : [];

    return {
      actions: value.actions ?? null,
      checked: Boolean(value.checked),
      children,
      disabled: Boolean(value.disabled),
      expandable: Boolean(value.expandable),
      expanded: Boolean(value.expanded),
      icon: value.icon ?? null,
      id,
      label,
      selected: Boolean(value.selected)
    };
  }

  return {
    actions: null,
    checked: false,
    children: [],
    disabled: false,
    expandable: false,
    expanded: false,
    icon: null,
    id: fallbackId,
    label: String(value ?? ''),
    selected: false
  };
}

function hydrateNodeState(state, nodes) {
  nodes.forEach((node) => {
    if (node.expanded) {
      state.expandedKeys.add(node.id);
    }

    if (node.selected) {
      state.selectedKeys.add(node.id);
    }

    if (node.checked) {
      state.checkedKeys.add(node.id);
    }

    hydrateNodeState(state, node.children);
  });
}

function toKeyList(value) {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(resolveTextValue(item))).filter((item) => item !== '');
  }

  return [String(resolveTextValue(value))].filter((item) => item !== '');
}

function findNode(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) {
      return node;
    }

    const nested = findNode(node.children, id);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function collectNodeIds(node, ids = []) {
  ids.push(node.id);
  node.children.forEach((child) => collectNodeIds(child, ids));
  return ids;
}

function attachNodeIds(nodes) {
  nodes.forEach((node) => {
    node.ids = collectNodeIds(node);
    attachNodeIds(node.children);
  });
}

function collectExpandableNodes(nodes, callback) {
  nodes.forEach((node) => {
    callback(node);
    collectExpandableNodes(node.children, callback);
  });
}

function isBranchNode(node) {
  return node.children.length > 0 || Boolean(node.expandable);
}

function collectNodesById(nodes, ids) {
  const selected = [];

  const visit = (items) => {
    items.forEach((node) => {
      if (ids.has(node.id)) {
        selected.push(node);
      }
      visit(node.children);
    });
  };

  visit(nodes);
  return selected;
}
