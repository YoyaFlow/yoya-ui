import { HtmlElementNode } from '../html/index.js';
import { registerChildFactories, vText } from '../core/node.js';
import {
  applyComponentArguments,
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren,
  themeValue
} from '../components/shared.js';
import { vDialog } from '../feedback/dialog.js';
import * as builtinIcons from '../svg/icons.js';

const DEFAULT_ICON_SIZE = 22;
const TRIGGER_ICON_SIZE = 16;
const ICON_BATCH_SIZE = 24;
const ICON_LOAD_MORE_THRESHOLD = 120;
const GRID_HEIGHT = '360px';

function collectBuiltinIcons() {
  return Object.keys(builtinIcons)
    .filter((name) => /^[A-Z].*Outlined$/.test(name) && typeof builtinIcons[name] === 'function')
    .sort();
}

/**
 * vSvgIconPicker 是带弹窗的 SVG 图标选择器：触发器展示当前选中图标，
 * 点击打开相对较大的弹窗，弹窗内提供图标方阵，点击某个图标即选中并关闭。
 */
export class VSvgIconPicker extends HtmlElementNode {
  constructor(setup = null, options = null, callback = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vsvg-icon-picker');
    this.styles({ position: 'relative' });

    this._value = null;
    this._iconEntries = collectBuiltinIcons().map((name) => ({
      factory: builtinIcons[name],
      name
    }));
    this._changeHandlers = [];
    this._fillPending = false;
    this._grid = null;
    this._renderedCount = 0;
    this._triggerIcon = null;
    this._triggerText = null;

    this._buildStructure();
    this._setupSvgIconPicker(setup);
    applyComponentArguments(this, options, callback);
  }

  _buildStructure() {
    this._triggerIcon = new HtmlElementNode('span')
      .className('yoya-vsvg-icon-picker-trigger-icon')
      .styles({
        alignItems: 'center',
        display: 'inline-flex',
        height: `${TRIGGER_ICON_SIZE}px`,
        justifyContent: 'center',
        width: `${TRIGGER_ICON_SIZE}px`
      });

    this._triggerText = vText('选择图标');
    this._trigger = new HtmlElementNode('button')
      .className('yoya-vsvg-icon-picker-trigger')
      .attr({
        'aria-expanded': 'false',
        'aria-haspopup': 'dialog',
        'data-vsvg-icon-trigger': 'true',
        title: '选择图标',
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: 'var(--yoya-color-surface, #ffffff)',
        border: '1px solid var(--yoya-color-border, #d8dee8)',
        borderRadius: '6px',
        boxSizing: 'border-box',
        color: 'inherit',
        cursor: 'pointer',
        display: 'inline-flex',
        gap: '8px',
        minHeight: '34px',
        padding: '5px 10px'
      })
      .child(this._triggerIcon, this._triggerText)
      .on('click', () => this.toggle());

    this._dialog = vDialog({
      open: false,
      onClose: () => this._trigger.attr('aria-expanded', 'false')
    });
    this._dialog.className('yoya-vsvg-icon-picker-dialog');
    this._dialog.styles({ maxWidth: 'min(92vw, 760px)' });
    this._dialog.content((body) => {
      body.div((title) => {
        title.className('yoya-vsvg-icon-picker-dialog-title');
        title.styles({
          color: themeValue('color-text', '#172033'),
          fontSize: '15px',
          fontWeight: '600',
          marginBottom: '12px'
        });
        title.text('选择图标');
      });
      this._grid = new HtmlElementNode('div')
        .className('yoya-vsvg-icon-picker-grid')
        .styles({
          boxSizing: 'border-box',
          display: 'grid',
          gap: '8px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(56px, 1fr))',
          height: GRID_HEIGHT,
          overflowY: 'auto',
          padding: '2px'
        })
        .on('scroll', () => this._maybeLoadMoreIcons());
      body.child(this._grid);
    });
    this._renderGrid();

    this.child(this._trigger, this._dialog);
  }

  _renderGrid() {
    if (!this._grid) return;
    if (this._renderedCount === 0) {
      this._renderedCount = Math.min(ICON_BATCH_SIZE, this._iconEntries.length);
    }
    replaceChildren(this._grid, []);
    this._iconEntries.slice(0, this._renderedCount).forEach((entry) => {
      this._grid.child(this._createCell(entry));
    });
  }

  _createCell(entry) {
    const { factory, name } = entry;
    const selected = this._value === name;
    const cell = new HtmlElementNode('button')
      .className('yoya-vsvg-icon-picker-cell')
      .attr({
        'aria-label': name,
        'aria-pressed': selected ? 'true' : 'false',
        'data-icon-name': name,
        title: name,
        type: 'button'
      })
      .styles({
        alignItems: 'center',
        background: selected ? themeValue('color-primary-subtle', '#eff6ff') : 'transparent',
        border: selected
          ? `1px solid ${themeValue('color-primary', '#2563eb')}`
          : `1px solid ${themeValue('color-border-faint', '#eef1f4')}`,
        borderRadius: '8px',
        boxSizing: 'border-box',
        color: 'inherit',
        cursor: 'pointer',
        display: 'flex',
        height: '56px',
        justifyContent: 'center',
        padding: '0',
        width: '100%'
      });
    cell.on('mouseenter', () => {
      if (!selected) {
        cell.style('background', themeValue('color-surface-hover', '#f0f2f5'));
      }
    });
    cell.on('mouseleave', () => {
      cell.style(
        'background',
        selected ? themeValue('color-primary-subtle', '#eff6ff') : 'transparent'
      );
    });
    cell.on('click', () => {
      this.value(name);
      this.close();
    });
    cell.child(
      factory().styles({
        height: `${DEFAULT_ICON_SIZE}px`,
        width: `${DEFAULT_ICON_SIZE}px`
      })
    );
    return cell;
  }

  _renderMoreIcons() {
    if (!this._grid) return;
    const next = Math.min(this._iconEntries.length, this._renderedCount + ICON_BATCH_SIZE);
    while (this._renderedCount < next) {
      this._grid.child(this._createCell(this._iconEntries[this._renderedCount]));
      this._renderedCount += 1;
    }
  }

  _maybeLoadMoreIcons() {
    if (!this._grid || this._renderedCount >= this._iconEntries.length) return;
    const el = this._grid._el;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - (el.clientHeight || 0);
    if (distance <= ICON_LOAD_MORE_THRESHOLD) {
      this._renderMoreIcons();
    }
  }

  _fillViewport() {
    if (!this._grid) return;
    const el = this._grid._el;
    if (!el) return;
    let guard = 0;
    while (this._renderedCount < this._iconEntries.length && guard < 200) {
      if (el.scrollHeight > (el.clientHeight || 0)) break;
      this._renderMoreIcons();
      guard += 1;
    }
  }

  _scheduleFill() {
    if (this._fillPending) return;
    this._fillPending = true;
    setTimeout(() => {
      this._fillPending = false;
      if (this._dialog.getBooleanState('open')) {
        this._fillViewport();
      }
    }, 0);
  }

  _sync() {
    replaceChildren(this._triggerIcon, []);
    const entry = this._iconEntries.find((item) => item.name === this._value);
    if (entry) {
      this._triggerIcon.child(
        entry.factory().styles({
          height: `${TRIGGER_ICON_SIZE}px`,
          width: `${TRIGGER_ICON_SIZE}px`
        })
      );
      this._triggerText.textContent(entry.name);
    } else {
      this._triggerText.textContent('选择图标');
    }
    const valueIndex = this._iconEntries.findIndex((item) => item.name === this._value);
    if (valueIndex >= this._renderedCount) {
      this._renderedCount = valueIndex + 1;
    }
    this._renderGrid();
  }

  /** 读写当前选中图标名；null 表示未选择。 */
  value(next) {
    if (next === undefined) {
      return this._value;
    }
    if (next === null) {
      return this.clearValue();
    }
    if (!this._iconEntries.some((entry) => entry.name === next)) {
      return this;
    }
    this._value = next;
    this._sync();
    this._notifyChange();
    return this;
  }

  /** 清除已选图标。 */
  clearValue() {
    this._value = null;
    this._sync();
    this._notifyChange();
    return this;
  }

  /** 供 vFormItem 收集当前值。 */
  _collectValue() {
    return this._value;
  }

  /** 读写禁用状态。 */
  disabled(value) {
    if (value === undefined) {
      return this.getBooleanState('disabled');
    }
    const enabled = Boolean(value);
    this.setState('disabled', enabled);
    this.attr('data-disabled', enabled ? 'true' : null);
    this._trigger.attr('disabled', enabled ? true : null);
    return this;
  }

  /** 读写字段名（vFormItem 之外的标识）。 */
  name(value) {
    if (value === undefined) {
      return this.attr('data-name') || '';
    }
    this.attr('data-name', value ? String(value) : null);
    return this;
  }

  /** 读写必填标记。 */
  required(value) {
    if (value === undefined) {
      return this.getBooleanState('required');
    }
    const enabled = Boolean(value);
    this.setState('required', enabled);
    this.attr('data-required', enabled ? 'true' : null);
    return this;
  }

  /** 读写图标集合：字符串名（内置图标）或 { name, icon } 自定义条目。 */
  icons(list) {
    if (list === undefined) {
      return this._iconEntries.map((entry) => entry.name);
    }
    const next = [];
    (Array.isArray(list) ? list : [list]).forEach((entry) => {
      if (typeof entry === 'string') {
        if (typeof builtinIcons[entry] === 'function') {
          next.push({ factory: builtinIcons[entry], name: entry });
        }
      } else if (entry && typeof entry.name === 'string' && typeof entry.icon === 'function') {
        next.push({ factory: entry.icon, name: entry.name });
      }
    });
    this._iconEntries = next;
    if (this._value !== null && !next.some((entry) => entry.name === this._value)) {
      this._value = null;
    }
    this._renderedCount = 0;
    this._sync();
    return this;
  }

  /** 打开/关闭选择弹窗。 */
  open(value = true) {
    this._trigger.attr('aria-expanded', value ? 'true' : 'false');
    this._dialog.open(value);
    if (value) {
      this._scheduleFill();
    }
    return this;
  }

  close() {
    return this.open(false);
  }

  toggle() {
    if (this._dialog.getBooleanState('open')) {
      return this.close();
    }
    return this.open();
  }

  /** 注册图标变化回调（name, picker）。 */
  change(handler) {
    if (handler === undefined) {
      return this._changeHandlers.slice();
    }
    this._changeHandlers = [handler];
    return this;
  }

  /** change 的别名。 */
  onChange(handler) {
    return this.change(handler);
  }

  _notifyChange() {
    this._changeHandlers.forEach((handler) => handler(this._value, this));
  }

  _setupSvgIconPicker(setup) {
    if (setup === null || setup === undefined) {
      return;
    }
    if (typeof setup === 'function') {
      setup(this);
      return;
    }
    if (isPlainObject(setup)) {
      const { change, disabled, icons, name, onChange, open, required, value, ...elementConfig } =
        setup;
      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }
      if (icons !== undefined) {
        this.icons(icons);
      }
      if (value !== undefined) {
        this.value(value);
      }
      if (change !== undefined) {
        this.change(change);
      } else if (onChange !== undefined) {
        this.onChange(onChange);
      }
      if (disabled !== undefined) {
        this.disabled(disabled);
      }
      if (name !== undefined) {
        this.name(name);
      }
      if (required !== undefined) {
        this.required(required);
      }
      if (open !== undefined) {
        this.open(open);
      }
      return;
    }
    this.value(setup);
  }
}

export function vSvgIconPicker(first = null, second = null, third = null) {
  return createComponentFactory(VSvgIconPicker, first, second, third);
}

registerChildFactories(HtmlElementNode, { vSvgIconPicker });
