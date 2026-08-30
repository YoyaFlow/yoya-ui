import { VButton } from '../actions/button.js';
import { componentClass } from '../components/shared.js';
import { HtmlElementNode } from '../html/index.js';

const GLOW_DEFAULTS = {
  direction: 'ltr',
  play: 'auto',
  ripple: 'on',
  speed: 'normal',
  strength: 'strong'
};

const GLOW_OPTIONS = {
  direction: new Set(['ltr', 'rtl']),
  play: new Set(['auto', 'hover', 'off']),
  ripple: new Set(['on', 'off']),
  speed: new Set(['slow', 'normal', 'fast']),
  strength: new Set(['soft', 'strong'])
};

/**
 * vGlowButton 流光按钮：在 vButton 语义上叠加流光扫过、光影反馈与点击光波涟漪。
 */
export class VGlowButton extends VButton {
  constructor(setup = null, options = null, callback = null) {
    super(setup, options, callback);
    this.className(componentClass, 'yoya-vglow-button');

    Object.entries(GLOW_DEFAULTS).forEach(([key, value]) => {
      if (this.attr(`data-glow-${key}`) === undefined) {
        this.attr(`data-glow-${key}`, value);
      }
    });

    this._bindRipple();
  }

  glow(options) {
    if (options === undefined) {
      return {
        direction: this.direction(),
        play: this.play(),
        ripple: this.ripple(),
        speed: this.speed(),
        strength: this.strength()
      };
    }

    if (options && typeof options === 'object') {
      const { direction, play, ripple, speed, strength } = options;
      if (play !== undefined) {
        this.play(play);
      }
      if (ripple !== undefined) {
        this.ripple(ripple);
      }
      if (speed !== undefined) {
        this.speed(speed);
      }
      if (direction !== undefined) {
        this.direction(direction);
      }
      if (strength !== undefined) {
        this.strength(strength);
      }
    }

    return this;
  }

  play(value) {
    if (value === undefined) {
      return this.attr('data-glow-play');
    }
    return this.attr('data-glow-play', GLOW_OPTIONS.play.has(value) ? value : 'auto');
  }

  speed(value) {
    if (value === undefined) {
      return this.attr('data-glow-speed');
    }
    return this.attr('data-glow-speed', GLOW_OPTIONS.speed.has(value) ? value : 'normal');
  }

  direction(value) {
    if (value === undefined) {
      return this.attr('data-glow-direction');
    }
    return this.attr('data-glow-direction', GLOW_OPTIONS.direction.has(value) ? value : 'ltr');
  }

  strength(value) {
    if (value === undefined) {
      return this.attr('data-glow-strength');
    }
    return this.attr('data-glow-strength', GLOW_OPTIONS.strength.has(value) ? value : 'strong');
  }

  ripple(value) {
    if (value === undefined) {
      return this.attr('data-glow-ripple');
    }
    return this.attr('data-glow-ripple', GLOW_OPTIONS.ripple.has(value) ? value : 'on');
  }

  _bindRipple() {
    this.on('click', (event) => {
      if (this.attr('data-glow-ripple') === 'off' || this.getBooleanState('disabled')) {
        return;
      }

      const rect = this._el?.getBoundingClientRect?.();
      const size = Math.max(rect?.width || 120, rect?.height || 40);
      const x = event.clientX || 0;
      const y = event.clientY || 0;
      const centered = x === 0 && y === 0;
      const offset = `${size / 2}px`;
      const left = centered ? `calc(50% - ${offset})` : `${x - (rect?.left || 0) - size / 2}px`;
      const top = centered ? `calc(50% - ${offset})` : `${y - (rect?.top || 0) - size / 2}px`;
      const ripple = new HtmlElementNode('span')
        .className('yoya-vglow-button-ripple')
        .attr('aria-hidden', 'true')
        .style({
          height: `${size}px`,
          left,
          top,
          width: `${size}px`
        });

      ripple.on('animationend', () => {
        const index = this._children.indexOf(ripple);
        if (index >= 0) {
          this._children.splice(index, 1);
        }
        ripple.destroy();
      });

      this.child(ripple);
    });
  }
}

export function vGlowButton(setup = null, options = null, callback = null) {
  return new VGlowButton(setup, options, callback);
}
