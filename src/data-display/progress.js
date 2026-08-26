import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  themeValue
} from '../components/shared.js';

const progressStatusColors = {
  error: themeValue('color-danger', '#dc2626'),
  normal: themeValue('color-primary', '#2563eb'),
  processing: themeValue('color-info', '#0284c7'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#f59e0b')
};

export class VProgress extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._value = 0;
    this._max = 100;
    this._percent = 0;
    this._showText = true;
    this._status = 'normal';
    this._size = 'default';
    this._strokeColor = null;
    this._indeterminate = false;
    this._format = null;
    this._textContent = null;
    this._ariaLabel = null;

    this._labelBox = new HtmlElementNode('span')
      .className('yoya-vprogress-label')
      .attr('aria-hidden', 'true')
      .style('display', 'none');
    this._track = new HtmlElementNode('div').className('yoya-vprogress-track');
    this._bar = new HtmlElementNode('span').className('yoya-vprogress-bar');
    this._textBox = new HtmlElementNode('span').className('yoya-vprogress-text');
    this._track.child(this._bar);

    this.className(componentClass, 'yoya-vprogress');
    this.attr({
      'aria-valuemax': '100',
      'aria-valuemin': '0',
      'aria-valuenow': '0',
      'data-percent': '0',
      'data-size': 'default',
      'data-status': 'normal',
      'data-value': '0',
      role: 'progressbar'
    });
    super.child(this._labelBox, this._track, this._textBox);

    this._setupProgress(setup);
    this._syncProgress();
  }

  value(value) {
    if (value === undefined) {
      return this._value;
    }

    const nextValue = Number(value);
    if (Number.isFinite(nextValue)) {
      this._value = Math.max(0, Math.min(this._max, nextValue));
    }

    this._syncProgress();
    return this;
  }

  max(value) {
    if (value === undefined) {
      return this._max;
    }

    const nextValue = Number(value);
    this._max = Number.isFinite(nextValue) && nextValue > 0 ? nextValue : 100;
    if (this._value > this._max) {
      this._value = this._max;
    }

    this._syncProgress();
    return this;
  }

  percent(value) {
    if (value === undefined) {
      return this._percent;
    }

    const nextValue = Number(value);
    if (Number.isFinite(nextValue)) {
      this._value = (this._max * Math.max(0, Math.min(100, nextValue))) / 100;
    }

    this._syncProgress();
    return this;
  }

  showText(value) {
    if (value === undefined) {
      return this._showText;
    }

    this._showText = Boolean(value);
    this.attr('data-show-text', this._showText ? 'true' : null);
    this._syncProgress();
    return this;
  }

  label(content) {
    if (content === undefined) {
      return this._labelBox.textContent();
    }

    replaceChildren(this._labelBox, normalizeChildren(content));
    this._syncProgress();
    return this;
  }

  text(content) {
    if (content === undefined) {
      return this._textContent;
    }

    this._textContent = content === null || content === undefined ? null : content;
    this._syncProgress();
    return this;
  }

  format(handler) {
    if (handler === undefined) {
      return this._format;
    }

    this._format = typeof handler === 'function' ? handler : null;
    this._syncProgress();
    return this;
  }

  status(value) {
    if (value === undefined) {
      return this._status;
    }

    this._status = ['error', 'normal', 'processing', 'success', 'warning'].includes(value)
      ? value
      : 'normal';
    this.attr('data-status', this._status);
    this._syncProgress();
    return this;
  }

  size(value) {
    if (value === undefined) {
      return this._size;
    }

    this._size = ['default', 'large', 'small'].includes(value) ? value : 'default';
    this.attr('data-size', this._size);
    return this;
  }

  strokeColor(value) {
    if (value === undefined) {
      return this._strokeColor;
    }

    this._strokeColor = value || null;
    this._syncProgress();
    return this;
  }

  indeterminate(value) {
    if (value === undefined) {
      return this._indeterminate;
    }

    this._indeterminate = Boolean(value);
    this._syncProgress();
    return this;
  }

  active(value) {
    return this.indeterminate(value);
  }

  ariaLabel(content) {
    if (content === undefined) {
      return this._ariaLabel;
    }

    this._ariaLabel = content === null || content === undefined ? null : String(content);
    this._syncProgress();
    return this;
  }

  _setupProgress(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (typeof setup === 'number' || (typeof setup === 'string' && !Number.isNaN(Number(setup)))) {
      this.value(setup);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        active,
        ariaLabel,
        children,
        format,
        indeterminate,
        label,
        max,
        percent,
        showText,
        size,
        status,
        strokeColor,
        text,
        value,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (ariaLabel !== undefined) {
        this.ariaLabel(ariaLabel);
      }

      if (label !== undefined) {
        this.label(label);
      }

      if (max !== undefined) {
        this.max(max);
      }

      if (value !== undefined) {
        this.value(value);
      }

      if (percent !== undefined) {
        this.percent(percent);
      }

      if (showText !== undefined) {
        this.showText(showText);
      }

      if (status !== undefined) {
        this.status(status);
      }

      if (size !== undefined) {
        this.size(size);
      }

      if (strokeColor !== undefined) {
        this.strokeColor(strokeColor);
      }

      if (format !== undefined) {
        this.format(format);
      }

      if (text !== undefined) {
        this.text(text);
      } else if (children !== undefined) {
        this.text(children);
      }

      if (indeterminate !== undefined) {
        this.indeterminate(indeterminate);
      } else if (active !== undefined) {
        this.indeterminate(active);
      }

      return;
    }

    this.label(setup);
  }

  _syncProgress() {
    const rawPercent = this._max > 0 ? (this._value / this._max) * 100 : 0;
    this._percent = Number.isFinite(rawPercent) ? Math.max(0, Math.min(100, rawPercent)) : 0;
    const color =
      this._strokeColor || progressStatusColors[this._status] || progressStatusColors.normal;

    this.attr('aria-label', this._ariaLabel);
    this.attr('aria-valuemax', String(this._max));
    this.attr('aria-valuenow', this._indeterminate ? null : String(this._value));
    this.attr('data-indeterminate', this._indeterminate ? 'true' : null);
    this.attr('data-percent', String(Number(this._percent.toFixed(2))));
    this.attr('data-value', String(this._value));
    this.attr('data-has-label', this._labelBox.children().length > 0 ? 'true' : null);

    this._labelBox.style('display', this._labelBox.children().length > 0 ? 'inline-flex' : 'none');
    this._bar.style('background', color);

    if (this._indeterminate) {
      this._bar.styles({
        animation: 'yoya-vprogress-indeterminate 1.2s ease-in-out infinite',
        width: '100%'
      });
    } else {
      this._bar.styles({
        animation: null,
        width: `${this._percent}%`
      });
    }

    if (this._showText) {
      let content = this._textContent;
      if (content === null || content === undefined) {
        if (this._indeterminate) {
          content = '处理中';
        } else if (this._format) {
          content = this._format(this._value, this._percent);
        } else {
          content = `${Math.round(this._percent)}%`;
        }
      }

      this._textBox.style('display', 'inline-flex');
      replaceChildren(this._textBox, normalizeChildren(content));
    } else {
      this._textBox.style('display', 'none');
    }

    return this;
  }
}

export function vProgress(first = null, second = null, third = null) {
  return createComponentFactory(VProgress, first, second, third);
}
