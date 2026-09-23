import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { span } from '../html/index.js';
import { createComponentShortcut, delegateCommands } from '../components/shared.js';
import { vButton } from '../actions/button.js';

/**
 * 流光按钮（票 15 §4；2026-09-23 按「包装型」写法重写，见 16 号第 31 条）。
 *
 * - **包装型**：`vNode` 里建一份内层 `vButton()`、**返回它当视图根**、写多值身份
 *   （`vn: 'VGlowButton VButton'`）——旧写法是 `class GlowButtonNode extends ButtonNode`（类继承），
 *   现在按钮的语义（标签 / 变体 / 尺寸 / 禁用 / 加载 / 交互态）全由内层组件提供；
 * - **命令委托**：按钮的命令面用 `delegateCommands` 挂到自己的 api 上（`glowButton.size(…)` 照旧），
 *   流光自己的命令（`glow` / `play` / `speed` / `direction` / `strength` / `motion` / `ripple`）写在 api 上；
 * - **状态 → 视图**：七个 `data-glow-*` 全部是 `computed` 派生（句柄 props 是活值），非法值读时回落默认；
 * - **点击涟漪**：节点自带 `vn_slot: 'extras'`（按钮结构里的零布局占位），几何是**量测出来的**（写行内），
 *   `animationend` 自毁；禁用 / `ripple: 'off'` 时不生成（判定读 DOM 属性，与迁移前同口径）。
 */

const GLOW_DEFAULTS = {
  direction: 'ltr',
  motion: 'auto',
  play: 'auto',
  ripple: 'on',
  speed: 'normal',
  strength: 'strong'
};

const GLOW_OPTIONS = {
  direction: new Set(['ltr', 'rtl']),
  motion: new Set(['auto', 'always']),
  play: new Set(['auto', 'hover', 'off']),
  ripple: new Set(['on', 'off']),
  speed: new Set(['slow', 'normal', 'fast']),
  strength: new Set(['soft', 'strong'])
};

/** 内层按钮的命令面（包装型组件照旧对外提供这些命令）。 */
const BUTTON_COMMANDS = [
  'label',
  'content',
  'text',
  'type',
  'variant',
  'formType',
  'size',
  'disabled',
  'loading',
  'isDisabled',
  'isLoading',
  'value',
  'valueText'
];

const glowValueOf = (key, state) =>
  computed(() => {
    const value = state[key].value;
    return GLOW_OPTIONS[key].has(value) ? value : GLOW_DEFAULTS[key];
  });

/** 流光按钮 props：按钮自己的 props 走 `...rest` 交给内层 `vButton`；`glow` 选项见 `GlowButtonOptions`。 */
export function VGlowButton({
  direction,
  glow: glowOptions,
  motion,
  play,
  ripple,
  speed,
  strength,
  ...rest
} = {}) {
  const state = {
    direction: asSignal(direction),
    motion: asSignal(motion),
    play: asSignal(play),
    ripple: asSignal(ripple),
    speed: asSignal(speed),
    strength: asSignal(strength)
  };

  const glow = {
    direction: glowValueOf('direction', state),
    motion: glowValueOf('motion', state),
    play: glowValueOf('play', state),
    ripple: glowValueOf('ripple', state),
    speed: glowValueOf('speed', state),
    strength: glowValueOf('strength', state)
  };

  return vNode((api) => {
    // 内层复用组件就是视图根；多值身份：流光按钮同时**是** VButton
    const button = vButton(rest);

    button.setup({ vn: 'VGlowButton VButton' });

    Object.keys(GLOW_DEFAULTS).forEach((key) => {
      button.attr(`data-glow-${key}`, glow[key]);
    });

    delegateCommands(api, button, BUTTON_COMMANDS);

    /** 读一个归一后的 gloss 值（命令的 getter 用）。 */
    const read = (key) => glow[key].value;

    /** 写一个 gloss 值（非法值在读时回落默认，写的时候不拦）。 */
    const write = (key) => (next) => {
      if (next === undefined) {
        return read(key);
      }

      state[key].value = next;
      return api;
    };

    api.play = write('play');
    api.speed = write('speed');
    api.direction = write('direction');
    api.strength = write('strength');
    api.motion = write('motion');
    api.ripple = write('ripple');

    api.glow = (options) => {
      if (options === undefined) {
        return {
          direction: read('direction'),
          motion: read('motion'),
          play: read('play'),
          ripple: read('ripple'),
          speed: read('speed'),
          strength: read('strength')
        };
      }

      if (options && typeof options === 'object') {
        const { direction, motion, play, ripple, speed, strength } = options;

        if (motion !== undefined) api.motion(motion);
        if (play !== undefined) api.play(play);
        if (ripple !== undefined) api.ripple(ripple);
        if (speed !== undefined) api.speed(speed);
        if (direction !== undefined) api.direction(direction);
        if (strength !== undefined) api.strength(strength);
      }

      return api;
    };

    // props 里的 `glow` 选项（`vGlowButton({ glow: { … } })`）
    if (glowOptions !== undefined) {
      api.glow(glowOptions);
    }

    button.on('click', (event) => {
      // 禁用态 / 关闭涟漪都以根上的 DOM 属性为准（与迁移前同口径）
      if (read('ripple') === 'off' || button.attr('disabled')) {
        return;
      }

      // 量测取**事件当前的元素**（监听就绑在它身上）：组件不碰别的组件的 DOM，也不提前 `renderDom()`
      // （`renderDom()` 是**构建**入口：没落地时会把 DOM 建出来，SSR 里还会碰 document；见 AGENTS「SSR 开发纪律」）
      const rect = event.currentTarget?.getBoundingClientRect?.();
      const size = Math.max(rect?.width || 120, rect?.height || 40);
      const x = event.clientX || 0;
      const y = event.clientY || 0;
      const centered = x === 0 && y === 0;
      const offset = `${size / 2}px`;
      const left = centered ? `calc(50% - ${offset})` : `${x - (rect?.left || 0) - size / 2}px`;
      const top = centered ? `calc(50% - ${offset})` : `${y - (rect?.top || 0) - size / 2}px`;

      // 涟漪是按钮的**匿名子节点**（落进按钮根：定位相对按钮本身）；几何是量测值 → 写行内
      const rippleNode = span({
        attrs: { 'aria-hidden': 'true' },
        style: { height: `${size}px`, left, top, width: `${size}px` },
        vn: 'VGlowButtonRipple'
      });

      rippleNode.on('animationend', () => rippleNode.destroy());
      button.child(rippleNode);
    });

    return button;
  });
}

export const vGlowButton = createComponentShortcut(VGlowButton, { props: true });
