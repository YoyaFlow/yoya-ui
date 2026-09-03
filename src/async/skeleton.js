import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  replaceChildren
} from '../components/shared.js';

const SKELETON_VARIANTS = new Set(['paragraph', 'avatar', 'block']);

export class VSkeleton extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._variant = 'paragraph';
    this._rows = 3;
    this._barHeight = 20;
    this._gap = 10;
    this._avatarSize = 40;
    this._active = true;
    this._motion = 'auto';

    this.className(componentClass, 'yoya-vskeleton');
    this.attr({
      'aria-hidden': 'true',
      'data-active': 'true',
      'data-motion': 'auto',
      'data-variant': 'paragraph'
    });
    this.styles({
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      maxWidth: '100%',
      width: '100%'
    });

    this._setupSkeleton(setup);
    this._syncContent();
  }

  variant(value) {
    if (value === undefined) {
      return this._variant;
    }

    this._variant = SKELETON_VARIANTS.has(value) ? value : 'paragraph';
    this.attr('data-variant', this._variant);
    this._syncContent();
    return this;
  }

  rows(value) {
    if (value === undefined) {
      return this._rows;
    }

    const parsed = Math.floor(Number(value));
    this._rows = Number.isFinite(parsed) && parsed >= 0 ? parsed : 3;
    this._syncContent();
    return this;
  }

  barHeight(value) {
    if (value === undefined) {
      return this._barHeight;
    }

    const parsed = Number(value);
    this._barHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : 20;
    this._syncContent();
    return this;
  }

  gap(value) {
    if (value === undefined) {
      return this._gap;
    }

    const parsed = Number(value);
    this._gap = Number.isFinite(parsed) && parsed >= 0 ? parsed : 10;
    this.style('gap', `${this._gap}px`);
    return this;
  }

  avatarSize(value) {
    if (value === undefined) {
      return this._avatarSize;
    }

    const parsed = Number(value);
    this._avatarSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 40;
    this._syncContent();
    return this;
  }

  active(value) {
    if (value === undefined) {
      return this._active;
    }

    this._active = Boolean(value);
    this.attr('data-active', this._active ? 'true' : 'false');
    this.attr('aria-hidden', this._active ? 'true' : null);
    this._syncContent();
    return this;
  }

  motion(value) {
    if (value === undefined) {
      return this._motion;
    }

    this._motion = value === 'always' ? 'always' : 'auto';
    this.attr('data-motion', this._motion);
    return this;
  }

  _syncContent() {
    if (!this._active) {
      this.children().forEach((child) => {
        if (
          typeof child.className === 'function' &&
          child.className().includes('yoya-vskeleton-')
        ) {
          child.destroy();
        }
      });
      return;
    }

    replaceChildren(this, this._buildPlaceholders());
  }

  _buildPlaceholders() {
    if (this._variant === 'avatar') {
      const avatar = new HtmlElementNode('span')
        .className('yoya-vskeleton-avatar')
        .style('height', `${this._avatarSize}px`)
        .style('width', `${this._avatarSize}px`);
      return [avatar];
    }

    if (this._variant === 'block') {
      return [new HtmlElementNode('span').className('yoya-vskeleton-block')];
    }

    return Array.from({ length: this._rows }, (_, index) => {
      const isLast = index === this._rows - 1;
      return new HtmlElementNode('span')
        .className('yoya-vskeleton-bar')
        .style('height', `${this._barHeight}px`)
        .style('width', isLast ? '60%' : '100%');
    });
  }

  _setupSkeleton(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { active, avatarSize, barHeight, gap, motion, rows, variant, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (variant !== undefined) {
        this.variant(variant);
      }
      if (rows !== undefined) {
        this.rows(rows);
      }
      if (barHeight !== undefined) {
        this.barHeight(barHeight);
      }
      if (gap !== undefined) {
        this.gap(gap);
      }
      if (avatarSize !== undefined) {
        this.avatarSize(avatarSize);
      }
      if (motion !== undefined) {
        this.motion(motion);
      }
      if (active !== undefined) {
        this.active(active);
      }
    }
  }
}

export function vSkeleton(first = null, second = null, third = null) {
  return createComponentFactory(VSkeleton, first, second, third);
}
