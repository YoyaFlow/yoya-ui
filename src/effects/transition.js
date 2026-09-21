import { defineComponentIdentity, ViewNode } from '../core/node.js';
import { ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { applyComponentSetup, componentClass, isPlainObject } from '../components/shared.js';
import { div } from '../html/index.js';

/**
 * `vTransition`：进 / 出场过渡容器（波 0 / 票 10 的第一个 vNode 迁移样板）。
 *
 * 结构、状态与命令的分工：
 * - 结构是**纯声明**，状态改动通过 `ref` 绑定写回（`attr` / `style` / `toggleClass` 的读值形态）；
 * - 命令（`show` / `enter` / `leave` / `toggle` / `motion` / `duration`）挂在 api 上，
 *   与原类组件的公开方法同名同语义（读值返回、设置返回节点以保持链式）；
 * - 需要真实元素的部分（`animationend` 监听、WAAPI 动画）在 `whenMount(host)` 里拿宿主再做，
 *   `whenDestroy` 取消动画——不再重写 `renderDom`，也不碰 `this._el`。
 *
 * 调用方 setup 的契约与原工厂一致：`first` 是函数（收到**根节点**，可继续用 `transition.vCard(...)`
 * 这类嵌套写法）或 options 对象（`{ duration, motion, shown, ...元素配置 }`）；`second` / 第三个及
 * 之后按 `applyComponentSetup` 分派（节点 / 文本 / 数组当子内容，对象当元素配置）。
 */
const ENTER_KEYFRAMES = [
  { opacity: 0, transform: 'translateY(12px) scale(0.98)' },
  { opacity: 1, transform: 'none' }
];
const LEAVE_KEYFRAMES = [
  { opacity: 1, transform: 'none' },
  { opacity: 0, transform: 'translateY(-12px) scale(0.98)' }
];

export function vTransition(first = null, second = null, third = null) {
  const rest = [...arguments].slice(3);

  return vNode((api) => {
    const shown = ref(true);
    const motion = ref('auto');
    const duration = ref(240);
    const durationSet = ref(false);
    const hidden = ref(false);

    /** 系统"减少动态效果"：只在 motion 为 auto 时参与判定（与原实现同一口径）。 */
    const prefersReducedMotion = () =>
      motion.value === 'auto' &&
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const animationClassOf = () => {
      if (motion.value === 'always' || prefersReducedMotion()) {
        return null;
      }
      return shown.value ? 'yoya-vtransition--enter' : 'yoya-vtransition--leave';
    };

    /** WAAPI 只在 `motion: 'always'` 下跑，且必须有真实宿主元素（挂载前是 no-op）。 */
    const syncAnimation = () => {
      if (motion.value !== 'always') {
        return;
      }
      const element = api.element;
      if (!element || typeof element.animate !== 'function') {
        return;
      }

      api.anim?.cancel();
      const animation = element.animate(shown.value ? ENTER_KEYFRAMES : LEAVE_KEYFRAMES, {
        duration: duration.value,
        easing: 'ease',
        fill: 'both'
      });
      api.anim = animation;
      animation.onfinish = () => {
        if (!shown.value) {
          hidden.value = true;
        }
      };
    };

    api.show = (value) => {
      if (value === undefined) {
        return shown.value;
      }

      shown.value = Boolean(value);
      if (shown.value) {
        hidden.value = false;
      } else if (motion.value !== 'always' && prefersReducedMotion()) {
        hidden.value = true;
      }
      syncAnimation();
      return api;
    };
    api.enter = () => api.show(true);
    api.leave = () => api.show(false);
    api.toggle = () => api.show(!shown.value);

    api.motion = (value) => {
      if (value === undefined) {
        return motion.value;
      }
      motion.value = value === 'always' ? 'always' : 'auto';
      syncAnimation();
      return api;
    };

    api.duration = (value) => {
      if (value === undefined) {
        return duration.value;
      }
      const parsed = Number(value);
      duration.value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 240;
      durationSet.value = true;
      return api;
    };

    api.whenMount = (host) => {
      api.element = host.element();
      api.element?.addEventListener('animationend', () => {
        if (!shown.value && motion.value !== 'always') {
          hidden.value = true;
        }
      });
      syncAnimation();
    };

    api.whenDestroy = () => {
      api.anim?.cancel();
      api.anim = null;
      api.element = null;
    };

    // 调用方 setup：与 `createComponentFactory` 同一套分派，只是把"节点"换成 vNode 的根节点
    const options = isPlainObject(first) && !(first instanceof ViewNode) ? first : null;
    const extras = [second, third, ...rest];

    return div((root) => {
      root.attr('vn', 'VTransition');
      root.className(componentClass, 'yoya-vtransition');
      root.attr('data-motion', () => motion.value);
      root.attr('data-state', () => (shown.value ? 'enter' : 'leave'));
      root.attr('data-duration', () => (durationSet.value ? String(duration.value) : null));
      root.toggleClass(
        'yoya-vtransition--enter',
        () => animationClassOf() === 'yoya-vtransition--enter'
      );
      root.toggleClass(
        'yoya-vtransition--leave',
        () => animationClassOf() === 'yoya-vtransition--leave'
      );
      root.style('boxSizing', 'border-box');
      root.style('--yoya-vtransition-duration', () =>
        durationSet.value ? `${duration.value}ms` : null
      );
      root.style('display', () => (hidden.value ? 'none' : null));

      if (typeof first === 'function') {
        first(root);
      } else if (options) {
        const {
          duration: optionDuration,
          motion: optionMotion,
          shown: optionShown,
          ...elementConfig
        } = options;
        if (Object.keys(elementConfig).length > 0) {
          root.setup(elementConfig);
        }
        if (optionDuration !== undefined) {
          api.duration(optionDuration);
        }
        if (optionMotion !== undefined) {
          api.motion(optionMotion);
        }
        if (optionShown !== undefined) {
          api.show(optionShown);
        }
      }

      extras.forEach((value) => applyComponentSetup(root, value));
    });
  });
}

/** 身份判定：`member instanceof VTransition` 与工厂函数本身（票 07 前靠视图根身份）。 */
export const VTransition = vTransition;
defineComponentIdentity(VTransition, 'VTransition');
