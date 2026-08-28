import { ElementNode, registerChildFactories } from '../core/node.js';
import { getYoyaMode, setYoyaMode } from '../core/theme.js';
import { HtmlElementNode } from '../html/index.js';
import { applyComponentArguments, normalizeComponentArguments } from '../components/shared.js';
import { vButton } from '../actions/button.js';

const DEFAULT_MODES = [
  { mode: 'light', label: '浅色' },
  { mode: 'dark', label: '深色' },
  { mode: 'system', label: '跟随系统' }
];

const MODE_LABELS = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统'
};
function normalizeModes(value) {
  return value.map((entry) =>
    typeof entry === 'string' ? { mode: entry, label: MODE_LABELS[entry] || entry } : entry
  );
}

/**
 * VThemeModeSwitch 是预制主题模式切换按钮组：点击切换 data-yoya-mode
 * 并（默认）持久化到 localStorage，配合 initYoyaTheme() 恢复上次选择。
 */
export class VThemeModeSwitch extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-component', 'yoya-vtheme-mode-switch');
    this._persist = true;
    this._modes = DEFAULT_MODES;
    this._buttons = new Map();
    this.styles({
      alignItems: 'center',
      display: 'inline-flex',
      flexWrap: 'wrap',
      gap: '8px'
    });

    if (typeof setup === 'function') {
      setup(this);
    } else if (setup && typeof setup === 'object') {
      if (Array.isArray(setup.modes)) {
        this._modes = normalizeModes(setup.modes);
      }
      if (setup.persist !== undefined) {
        this._persist = Boolean(setup.persist);
      }
    }
    this._rebuildButtons();
  }

  modes(value) {
    if (value === undefined) {
      return this._modes.map((entry) => entry.mode);
    }
    if (!Array.isArray(value)) {
      throw new TypeError('VThemeModeSwitch modes must be an array of mode names');
    }
    this._modes = normalizeModes(value);
    this._rebuildButtons();
    return this;
  }

  persist(value) {
    if (value === undefined) {
      return this._persist;
    }
    this._persist = Boolean(value);
    return this;
  }

  _rebuildButtons() {
    this.clearChildren();
    this._buttons.clear();
    this._modes.forEach(({ mode, label }) => {
      const button = vButton(label).attr('data-theme-mode', mode);
      button.on('click', () => {
        setYoyaMode(mode, { persist: this._persist });
        this.sync();
      });
      this._buttons.set(mode, button);
      this.child(button);
    });
    this.sync();
  }

  sync() {
    const current = getYoyaMode();
    this._buttons.forEach((button, mode) => {
      const active = mode === current;
      button.type(active ? 'primary' : 'secondary');
      button.attr('data-active', active ? 'true' : null);
    });
    return this;
  }
}

export function vThemeModeSwitch(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const node = new VThemeModeSwitch(args.first);
  if (args.options?.modes !== undefined) {
    node.modes(args.options.modes);
  }
  if (args.options?.persist !== undefined) {
    node.persist(args.options.persist);
  }
  return applyComponentArguments(node, args.options, args.callback);
}

registerChildFactories(ElementNode, { vThemeModeSwitch });
