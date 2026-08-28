import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  setupContentSlot,
  themeValue
} from '../components/shared.js';
import { vText } from '../core/index.js';

const timelineStatusColors = {
  danger: themeValue('color-danger', '#dc2626'),
  default: themeValue('color-text-secondary', '#94a3b8'),
  processing: themeValue('color-info', '#1677ff'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

const statusNames = new Set(Object.keys(timelineStatusColors));

/**
 * 时间线：竖向事件流，节点状态色区分成功/失败/进行中。
 */
export class VTimeline extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vtimeline');
    this.styles({ position: 'relative' });
    this._line = new HtmlElementNode('div').className('yoya-vtimeline-line').styles({
      background: themeValue('color-border', '#e2e8f0'),
      bottom: '16px',
      left: '11px',
      position: 'absolute',
      top: '8px',
      width: '2px'
    });
    this._line.style('zIndex', '0');
    this.child(this._line);
    applyComponentSetup(this, setup);
  }
}

/**
 * 时间线节点：指示点 + 标题 + 时间 + 内容。
 */
export class VTimelineItem extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._status = 'default';
    this._titleNode = vText('');
    this._timeNode = vText('');

    this._dot = new HtmlElementNode('div').className('yoya-vtimeline-item-dot');
    this._indicator = new HtmlElementNode('div')
      .className('yoya-vtimeline-item-indicator')
      .styles({
        alignItems: 'center',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: '0',
        paddingTop: '6px',
        width: '24px'
      })
      .child(this._dot);
    const titleBox = new HtmlElementNode('div')
      .className('yoya-vtimeline-item-title')
      .styles({ fontSize: '14px', fontWeight: '600', lineHeight: '1.4' })
      .child(this._titleNode);
    const timeBox = new HtmlElementNode('div')
      .className('yoya-vtimeline-item-time')
      .styles({
        color: themeValue('color-text-secondary', '#64748b'),
        fontSize: '12px',
        lineHeight: '1.4',
        marginTop: '2px'
      })
      .child(this._timeNode);
    this._contentBox = new HtmlElementNode('div').className('yoya-vtimeline-item-content').styles({
      color: themeValue('color-text-secondary', '#475569'),
      fontSize: '13px',
      lineHeight: '1.6',
      marginTop: '6px'
    });
    const body = new HtmlElementNode('div')
      .className('yoya-vtimeline-item-body')
      .styles({
        display: 'flex',
        flexDirection: 'column',
        minWidth: '0',
        paddingBottom: '20px'
      })
      .child(titleBox, timeBox, this._contentBox);

    this.className(componentClass, 'yoya-vtimeline-item');
    this.styles({ display: 'flex', gap: '12px' });
    this._indicator.style('zIndex', '1');
    this.child(this._indicator, body);
    this._applyStatus();
    applyComponentSetup(this, setup);
  }

  status(value) {
    if (value === undefined) return this._status;
    this._status = statusNames.has(value) ? value : 'default';
    this._applyStatus();
    return this;
  }

  title(value) {
    if (value === undefined) return this._titleNode.textContent();
    this._titleNode.textContent(value);
    return this;
  }

  time(value) {
    if (value === undefined) return this._timeNode.textContent();
    this._timeNode.textContent(value);
    return this;
  }

  content(setup) {
    if (setup === undefined) return this._contentBox;
    setupContentSlot(this._contentBox, setup);
    return this;
  }

  _applyStatus() {
    const color = timelineStatusColors[this._status];
    this._dot.styles({
      background: color,
      border: '2px solid ' + themeValue('color-surface', '#ffffff'),
      borderRadius: '50%',
      height: '10px',
      width: '10px'
    });
  }
}

export function vTimeline(first = null, second = null, third = null) {
  return createComponentFactory(VTimeline, first, second, third);
}

export function vTimelineItem(first = null, second = null, third = null) {
  return createComponentFactory(VTimelineItem, first, second, third);
}
