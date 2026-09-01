import { HtmlElementNode } from '../html/index.js';
import { componentClass, createComponentFactory, isPlainObject } from '../components/shared.js';

export class VTransition extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._shown = true;
    this._motion = 'auto';
    this._duration = 240;
    this._waapiAnim = null;

    this.className(componentClass, 'yoya-vtransition');
    this.attr({ 'data-motion': 'auto', 'data-state': 'enter' });
    this.styles({ boxSizing: 'border-box' });

    this._setupTransition(setup);
    this._syncTransition();
  }

  show(value) {
    if (value === undefined) {
      return this._shown;
    }

    this._shown = Boolean(value);
    this._syncTransition();
    return this;
  }

  enter() {
    return this.show(true);
  }

  leave() {
    return this.show(false);
  }

  toggle() {
    return this.show(!this._shown);
  }

  motion(value) {
    if (value === undefined) {
      return this._motion;
    }

    this._motion = value === 'always' ? 'always' : 'auto';
    this.attr('data-motion', this._motion);
    this._syncTransition();
    return this;
  }

  duration(value) {
    if (value === undefined) {
      return this._duration;
    }

    const parsed = Number(value);
    this._duration = Number.isFinite(parsed) && parsed >= 0 ? parsed : 240;
    this.attr('data-duration', String(this._duration));
    this.style('--yoya-vtransition-duration', `${this._duration}ms`);
    return this;
  }

  renderDom() {
    const element = super.renderDom();

    element.addEventListener('animationend', () => {
      if (!this._shown && this._motion !== 'always') {
        this.style('display', 'none');
      }
    });
    if (this._motion === 'always') {
      this._runWaapi(this._shown ? 'enter' : 'leave');
    }
    return element;
  }

  destroy() {
    if (this._waapiAnim) {
      this._waapiAnim.cancel();
      this._waapiAnim = null;
    }
    return super.destroy();
  }

  _syncTransition() {
    const reduced =
      this._motion === 'auto' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const state = this._shown ? 'enter' : 'leave';
    const animationClass =
      this._motion === 'always' || reduced
        ? null
        : this._shown
          ? 'yoya-vtransition--enter'
          : 'yoya-vtransition--leave';

    this.attr('data-state', state);
    this.className(componentClass, 'yoya-vtransition', animationClass);

    if (this._shown) {
      this.style('display', null);
    } else if (this._motion !== 'always' && reduced) {
      this.style('display', 'none');
    }

    if (this._motion === 'always') {
      this._runWaapi(state);
    }
  }

  _runWaapi(state) {
    const element = this._el;

    if (!element || typeof element.animate !== 'function') {
      return;
    }

    if (this._waapiAnim) {
      this._waapiAnim.cancel();
    }

    const enter = state === 'enter';
    const animation = element.animate(
      enter
        ? [
            { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
            { opacity: 1, transform: 'none' }
          ]
        : [
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateY(-12px) scale(0.98)' }
          ],
      { duration: this._duration, easing: 'ease', fill: 'both' }
    );

    this._waapiAnim = animation;
    animation.onfinish = () => {
      if (!this._shown) {
        this.style('display', 'none');
      }
    };
  }

  _setupTransition(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { duration, motion, shown, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (duration !== undefined) {
        this.duration(duration);
      }
      if (motion !== undefined) {
        this.motion(motion);
      }
      if (shown !== undefined) {
        this.show(shown);
      }
    }
  }
}

export function vTransition(first = null, second = null, third = null) {
  return createComponentFactory(VTransition, first, second, third);
}
