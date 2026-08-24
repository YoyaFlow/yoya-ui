import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

export class VSteps extends HtmlElementNode {
  constructor(setup = null) {
    super('ol', null);
    this._current = 0;
    this._status = 'process';
    this._direction = 'horizontal';
    this._size = 'default';

    this.className(componentClass, 'yoya-vsteps');
    this.attr({
      'data-current': '0',
      'data-direction': 'horizontal',
      'data-size': 'default',
      'data-status': 'process',
      role: 'list'
    });
    this.styles({
      alignItems: 'flex-start',
      display: 'flex',
      flexDirection: 'row',
      gap: '12px',
      listStyle: 'none',
      margin: '0',
      minWidth: '0',
      padding: '0'
    });
    this._setupSteps(setup);
    this._syncSteps();
  }

  current(value) {
    if (value === undefined) {
      return this._current;
    }

    this._current = Math.max(0, Number(value) || 0);
    this.attr('data-current', String(this._current));
    this._syncSteps();
    return this;
  }

  status(value) {
    if (value === undefined) {
      return this._status;
    }

    this._status = ['error', 'finish', 'process'].includes(value) ? value : 'process';
    this.attr('data-status', this._status);
    this._syncSteps();
    return this;
  }

  direction(value) {
    if (value === undefined) {
      return this._direction;
    }

    this._direction = value === 'vertical' ? 'vertical' : 'horizontal';
    this.attr('data-direction', this._direction);
    this.style('flexDirection', this._direction === 'vertical' ? 'column' : 'row');
    this._syncSteps();
    return this;
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = value === 'small' ? 'small' : 'default';
    this.attr('data-size', this._size);
    this._syncSteps();
    return this;
  }

  items(value) {
    if (value === undefined) {
      return this.children().filter((child) => child instanceof VStep);
    }

    replaceChildren(this, []);

    if (Array.isArray(value)) {
      value.forEach((item) => {
        this.child(normalizeStepItem(item));
      });
    }

    return this;
  }

  next() {
    const steps = this.items();

    if (this._current < steps.length - 1) {
      this.current(this._current + 1);
    }

    return this;
  }

  prev() {
    if (this._current > 0) {
      this.current(this._current - 1);
    }

    return this;
  }

  child(...children) {
    super.child(...children);
    this._syncSteps();
    return this;
  }

  _setupSteps(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup)) {
      this.items(setup);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, current, direction, items, size, status, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (current !== undefined) {
        this.current(current);
      }

      if (status !== undefined) {
        this.status(status);
      }

      if (direction !== undefined) {
        this.direction(direction);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (items !== undefined) {
        this.items(items);
      } else if (children !== undefined) {
        this.items(children);
      }

      return;
    }

    this.items([setup]);
  }

  _syncSteps() {
    const steps = this.children().filter((child) => child instanceof VStep);

    this.attr('data-step-count', String(steps.length));
    steps.forEach((step, index) => {
      step._index = index;
      step._total = steps.length;
      step._stepsCurrent = this._current;
      step._stepsStatus = this._status;
      step._stepsDirection = this._direction;
      step._stepsSize = this._size;
      step._syncStepState();
    });
    return this;
  }
}

export class VStep extends HtmlElementNode {
  constructor(setup = null) {
    super('li', null);
    this._title = '';
    this._description = '';
    this._icon = null;
    this._status = null;
    this._index = 0;
    this._total = 1;
    this._stepsCurrent = 0;
    this._stepsStatus = 'process';
    this._stepsDirection = 'horizontal';
    this._stepsSize = 'default';

    this._indicatorBox = new HtmlElementNode('span').className('yoya-vsteps-indicator');
    this._titleBox = new HtmlElementNode('div').className('yoya-vsteps-title');
    this._descriptionBox = new HtmlElementNode('div').className('yoya-vsteps-description');
    this._contentBox = new HtmlElementNode('div').className('yoya-vsteps-content');
    this._connector = new HtmlElementNode('span').className('yoya-vsteps-connector');

    this.className(componentClass, 'yoya-vstep');
    this.attr('role', 'listitem');
    this.styles({
      alignItems: 'flex-start',
      display: 'grid',
      flex: '1 1 0',
      gap: '10px',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      minWidth: '0',
      position: 'relative'
    });
    this._indicatorBox.styles({
      alignItems: 'center',
      background: '#ffffff',
      border: '2px solid #cbd5e1',
      borderRadius: '50%',
      boxSizing: 'border-box',
      color: '#64748b',
      display: 'inline-flex',
      fontSize: '14px',
      fontWeight: '700',
      height: '30px',
      justifyContent: 'center',
      lineHeight: '1',
      width: '30px'
    });
    this._contentBox.styles({
      display: 'grid',
      gap: '2px',
      minWidth: '0',
      paddingTop: '3px'
    });
    this._titleBox.styles({
      color: '#172033',
      fontSize: '14px',
      fontWeight: '700',
      lineHeight: '1.35'
    });
    this._descriptionBox.styles({
      color: '#64748b',
      fontSize: '12px',
      lineHeight: '1.5'
    });
    this._connector.styles({
      background: '#d8dee8',
      display: 'none',
      height: '2px',
      position: 'absolute'
    });
    this.child(this._indicatorBox, this._contentBox, this._connector);
    this._contentBox.child(this._titleBox, this._descriptionBox);
    this._setupStep(setup);
    this._syncStepState();
  }

  title(value) {
    if (value === undefined) {
      return this._title;
    }

    this._title = value;
    replaceChildren(this._titleBox, normalizeChildren(value ?? ''));
    return this;
  }

  text(value) {
    return this.title(value);
  }

  description(value) {
    if (value === undefined) {
      return this._description;
    }

    this._description = value;
    replaceChildren(this._descriptionBox, normalizeChildren(value ?? ''));
    return this;
  }

  desc(value) {
    return this.description(value);
  }

  icon(value) {
    if (value === undefined) {
      return this._icon;
    }

    this._icon = value;
    this._syncStepState();
    return this;
  }

  status(value) {
    if (value === undefined) {
      return this._status;
    }

    this._status = value || null;
    this._syncStepState();
    return this;
  }

  _setupStep(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (Array.isArray(setup) && setup.length >= 2) {
      this.title(setup[0]);
      this.description(setup[1]);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, desc, description, icon, status, text, title, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (icon !== undefined) {
        this.icon(icon);
      }

      if (status !== undefined) {
        this.status(status);
      }

      if (title !== undefined) {
        this.title(title);
      } else if (text !== undefined) {
        this.title(text);
      }

      if (description !== undefined) {
        this.description(description);
      } else if (desc !== undefined) {
        this.description(desc);
      } else if (children !== undefined) {
        this.description(children);
      }

      return;
    }

    this.title(setup);
  }

  _effectiveStatus() {
    if (this._status) {
      return this._status;
    }

    if (this._index < this._stepsCurrent) {
      return 'finish';
    }

    if (this._index === this._stepsCurrent) {
      return this._stepsStatus || 'process';
    }

    return 'wait';
  }

  _syncStepState() {
    const status = this._effectiveStatus();
    const size = this._stepsSize;
    const indicatorSize = size === 'small' ? '24px' : '30px';
    const indicatorCenter = size === 'small' ? '11px' : '14px';
    const indicatorHalf = size === 'small' ? '12px' : '15px';
    const indicatorFontSize = size === 'small' ? '12px' : '14px';
    const styles = stepIndicatorStyles(status);

    this.attr('data-status', status);
    this.attr('aria-current', this._index === this._stepsCurrent ? 'step' : null);
    this._indicatorBox.styles({
      fontSize: indicatorFontSize,
      height: indicatorSize,
      width: indicatorSize
    });
    this._indicatorBox.style('background', styles.background);
    this._indicatorBox.style('borderColor', styles.borderColor);
    this._indicatorBox.style('color', styles.color);
    this._titleBox.style('fontSize', size === 'small' ? '13px' : '14px');
    this._descriptionBox.style(
      'display',
      this._descriptionBox.children().length > 0 ? null : 'none'
    );

    if (this._icon !== null && this._icon !== undefined) {
      replaceChildren(this._indicatorBox, normalizeChildren(this._icon));
    } else {
      replaceChildren(
        this._indicatorBox,
        normalizeChildren(stepIndicatorText(status, this._index))
      );
    }

    this._connector.style('display', this._index < this._total - 1 ? null : 'none');
    this._connector.style('background', status === 'finish' ? '#2563eb' : '#d8dee8');

    if (this._stepsDirection === 'vertical') {
      this.style('gridTemplateColumns', 'auto minmax(0, 1fr)');
      this.style('gap', '10px');
      this._contentBox.style('paddingTop', '3px');
      this._connector.styles({
        bottom: '-12px',
        height: 'auto',
        left: indicatorHalf,
        right: null,
        top: indicatorSize,
        width: '2px'
      });
    } else {
      this.style('gridTemplateColumns', 'minmax(0, 1fr)');
      this.style('gap', '0');
      this._contentBox.style('paddingTop', '6px');
      this._connector.styles({
        bottom: null,
        height: '2px',
        left: indicatorSize,
        right: '0',
        top: indicatorCenter,
        width: 'auto'
      });
    }

    return this;
  }
}

export function vSteps(first = null, second = null, third = null) {
  return createComponentFactory(VSteps, first, second, third);
}

export function vStep(first = null, second = null, third = null) {
  return createComponentFactory(VStep, first, second, third);
}

function normalizeStepItem(item) {
  if (item instanceof VStep) {
    return item;
  }

  if (Array.isArray(item)) {
    return vStep(item);
  }

  return vStep(item);
}

function stepIndicatorStyles(status) {
  if (status === 'finish') {
    return {
      background: '#16a34a',
      borderColor: '#16a34a',
      color: '#ffffff'
    };
  }

  if (status === 'error') {
    return {
      background: '#dc2626',
      borderColor: '#dc2626',
      color: '#ffffff'
    };
  }

  if (status === 'process') {
    return {
      background: '#2563eb',
      borderColor: '#2563eb',
      color: '#ffffff'
    };
  }

  return {
    background: '#ffffff',
    borderColor: '#cbd5e1',
    color: '#64748b'
  };
}

function stepIndicatorText(status, index) {
  if (status === 'finish') {
    return '✓';
  }

  if (status === 'error') {
    return '!';
  }

  return String(index + 1);
}
