import { createComponentShell } from '../../components/component-shell.js';
import { defineComponentIdentity } from '../../core/node.js';
import { isPlainObject } from '../../components/shared.js';
import { InputNode } from './input.js';

/** 时间输入框的节点类型（不导出）；公开组件 `vTimer` 是 vNode 外壳（继承输入框的节点类型）。 */
class TimerNode extends InputNode {
  constructor(setup = null) {
    super(null);
    this._identity = 'VTimer';
    this.className('yoya-vtimer');
    this._clearButton.className('yoya-vtimer-clear');
    this._addRootClass('yoya-vtimer-wrap');
    this.mode('date');
    this._setupTimer(setup);
  }

  mode(value) {
    if (value === undefined) {
      return this.attr('type');
    }

    const supportedModes = new Set(['date', 'datetime-local', 'time']);
    this.attr('type', supportedModes.has(value) ? value : 'date');
    return this;
  }

  type(value) {
    return value === undefined ? this.mode() : this.mode(value);
  }

  _setupTimer(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { mode, type, ...inputSetup } = setup;

      this._setupInput(inputSetup);
      if (mode !== undefined) {
        this.mode(mode);
      } else if (type !== undefined) {
        this.mode(type);
      }
      return;
    }

    this.value(setup);
  }
}

export function vTimer(first = null, second = null, third = null) {
  return createComponentShell({
    identity: 'VTimer',
    createNode: (setup) => new TimerNode(setup),
    commands: [
      'type',
      'value',
      'text',
      'content',
      'placeholder',
      'isDisabled',
      'isReadonly',
      'isError',
      'clearable',
      'clear',
      'mode'
    ],
    args: [first, second, third, ...[...arguments].slice(3)]
  });
}

export const VTimer = vTimer;
defineComponentIdentity(VTimer, 'VTimer');
