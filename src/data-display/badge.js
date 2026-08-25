import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeValue
} from '../components/shared.js';

const statusColors = {
  default: themeValue('color-text-muted', '#8c8c8c'),
  error: themeValue('color-danger', '#f5222d'),
  processing: themeValue('color-info', '#1677ff'),
  success: themeValue('color-success', '#52c41a'),
  warning: themeValue('color-warning', '#faad14')
};

export class VBadge extends HtmlElementNode {
  constructor(setup = null) {
    super('span', null);
    this._count = null;
    this._overflowCount = 99;
    this._showZero = false;
    this._dot = false;
    this._status = null;
    this._color = null;
    this._offsetX = 0;
    this._offsetY = 0;
    this._textContent = null;

    this._contentBox = new HtmlElementNode('span').className('yoya-vbadge-content').styles({
      alignItems: 'center',
      display: 'inline-flex',
      minWidth: '0'
    });
    this._badgeBox = new HtmlElementNode('span').className('yoya-vbadge-count').styles({
      alignItems: 'center',
      background: themeValue('color-danger', '#ff4d4f'),
      borderRadius: '10px',
      boxSizing: 'border-box',
      color: themeValue('color-text-inverse', '#ffffff'),
      display: 'none',
      fontSize: '12px',
      fontWeight: '700',
      height: '18px',
      justifyContent: 'center',
      lineHeight: '1',
      minWidth: '18px',
      padding: '0 6px',
      position: 'absolute',
      right: '0',
      textAlign: 'center',
      top: '0',
      transform: 'translate(50%, -50%)',
      whiteSpace: 'nowrap',
      zIndex: '1'
    });
    this._textBox = new HtmlElementNode('span').className('yoya-vbadge-text').styles({
      color: themeValue('color-text-secondary', '#475569'),
      display: 'none',
      fontSize: '12px',
      lineHeight: '1'
    });

    this.className(componentClass, 'yoya-vbadge');
    this.styles({
      alignItems: 'center',
      boxSizing: 'border-box',
      display: 'inline-flex',
      gap: '6px',
      lineHeight: '1',
      position: 'relative',
      verticalAlign: 'middle'
    });
    super.child(this._contentBox, this._badgeBox, this._textBox);
    this._setupBadge(setup);
    this._syncBadge();
  }

  child(...children) {
    this._contentBox.child(...children);
    this._syncBadge();
    return this;
  }

  content(value) {
    if (value === undefined) {
      return this._contentBox.children();
    }

    replaceChildren(this._contentBox, normalizeChildren(value));
    this._syncBadge();
    return this;
  }

  count(value) {
    if (value === undefined) {
      return this._count;
    }

    this._count = value === null || value === undefined || value === '' ? null : value;
    this.attr('data-count', this._count === null ? null : String(this._count));
    this._syncBadge();
    return this;
  }

  overflowCount(value) {
    if (value === undefined) {
      return this._overflowCount;
    }

    const nextValue = Number(value);
    this._overflowCount = Number.isFinite(nextValue) ? nextValue : 99;
    this.attr('data-overflow-count', String(this._overflowCount));
    this._syncBadge();
    return this;
  }

  showZero(value) {
    if (value === undefined) {
      return this._showZero;
    }

    this._showZero = Boolean(value);
    this.attr('data-show-zero', this._showZero ? 'true' : null);
    this._syncBadge();
    return this;
  }

  dot(value) {
    if (value === undefined) {
      return this._dot;
    }

    this._dot = Boolean(value);
    this.attr('data-dot', this._dot ? 'true' : null);
    this._syncBadge();
    return this;
  }

  status(value) {
    if (value === undefined) {
      return this._status;
    }

    this._status = value || null;
    this.attr('data-status', this._status);
    this._syncBadge();
    return this;
  }

  color(value) {
    if (value === undefined) {
      return this._color;
    }

    this._color = value || null;
    this.attr('data-color', this._color);
    this._syncBadge();
    return this;
  }

  text(value) {
    if (value === undefined) {
      return this._textContent;
    }

    this._textContent = value === null || value === undefined ? null : value;
    if (this._textContent === null) {
      replaceChildren(this._textBox, []);
    } else {
      replaceChildren(this._textBox, normalizeChildren(this._textContent));
    }
    this._syncBadge();
    return this;
  }

  label(value) {
    return this.text(value);
  }

  title(value) {
    if (value === undefined) {
      return this._badgeBox.attr('title');
    }

    this._badgeBox.attr('title', value ?? null);
    return this;
  }

  offset(value) {
    if (value === undefined) {
      return { x: this._offsetX, y: this._offsetY };
    }

    const x = Number(value?.x ?? 0);
    const y = Number(value?.y ?? 0);
    this._offsetX = Number.isFinite(x) ? x : 0;
    this._offsetY = Number.isFinite(y) ? y : 0;
    this._syncBadge();
    return this;
  }

  _setupBadge(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        children,
        color,
        content,
        count,
        dot,
        label,
        offset,
        overflowCount,
        showZero,
        status,
        text,
        title,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (overflowCount !== undefined) {
        this.overflowCount(overflowCount);
      }

      if (showZero !== undefined) {
        this.showZero(showZero);
      }

      if (count !== undefined) {
        this.count(count);
      }

      if (dot !== undefined) {
        this.dot(dot);
      }

      if (status !== undefined) {
        this.status(status);
      }

      if (color !== undefined) {
        this.color(color);
      }

      if (offset !== undefined) {
        this.offset(offset);
      }

      if (title !== undefined) {
        this.title(title);
      }

      if (text !== undefined) {
        this.text(text);
      } else if (label !== undefined) {
        this.text(label);
      }

      if (children !== undefined) {
        this.child(children);
      } else if (content !== undefined) {
        this.child(content);
      }

      return;
    }

    if (
      typeof setup === 'number' ||
      (typeof setup === 'string' && setup.trim() !== '' && !Number.isNaN(Number(setup)))
    ) {
      this.count(setup);
      return;
    }

    this.child(setup);
  }

  _syncBadge() {
    const hasContent = this._contentBox.children().length > 0;
    const status = this._status;
    const dotMode = Boolean(status || this._dot);
    const visible = dotMode || this._countVisible();
    const background =
      this._color || (status ? statusColors[status] : themeValue('color-danger', '#ff4d4f'));

    this._contentBox.style('display', hasContent ? 'inline-flex' : 'none');
    this._textBox.style(
      'display',
      this._textContent !== null && this._textContent !== '' ? 'inline-flex' : 'none'
    );
    this._badgeBox.style('display', visible ? 'inline-flex' : 'none');
    this._badgeBox.style('background', visible ? background : null);
    this._badgeBox.style('position', hasContent ? 'absolute' : 'static');
    this._badgeBox.style(
      'transform',
      hasContent
        ? `translate(calc(50% + ${this._offsetX}px), calc(-50% + ${this._offsetY}px))`
        : null
    );
    this._badgeBox.attr(
      'aria-label',
      visible ? (dotMode ? this._status || '通知' : this._badgeText()) : null
    );

    if (dotMode) {
      this._badgeBox.styles({
        borderRadius: '999px',
        height: '8px',
        lineHeight: '1',
        minWidth: '8px',
        padding: '0',
        width: '8px'
      });
      replaceChildren(this._badgeBox, []);
    } else {
      this._badgeBox.styles({
        borderRadius: '10px',
        height: '18px',
        lineHeight: '1',
        minWidth: '18px',
        padding: '0 6px',
        width: null
      });
      replaceChildren(this._badgeBox, normalizeChildren(this._badgeText()));
    }

    this.attr('data-standalone', hasContent ? null : 'true');
    return this;
  }

  _countVisible() {
    if (this._count === null || this._count === undefined || this._count === '') {
      return false;
    }

    const numeric = Number(this._count);
    if (Number.isFinite(numeric) && numeric === 0) {
      return Boolean(this._showZero);
    }

    return true;
  }

  _badgeText() {
    const numeric = Number(this._count);

    if (Number.isFinite(numeric) && this._count !== '') {
      const max = Number(this._overflowCount) || 99;
      return numeric > max ? `${max}+` : String(this._count);
    }

    return String(this._count);
  }
}

export function vBadge(first = null, second = null, third = null) {
  return createComponentFactory(VBadge, first, second, third);
}
