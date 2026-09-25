import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { button, div, img, span } from '../html/index.js';
import { createComponentShortcut } from '../components/shared.js';

/**
 * 懒加载图片（票 15 §4；2026-09-23 按 **B 形态**重写）。
 *
 * - **结构一次写清**：`div[VLazyImage](role='img') > span[VLazyImagePlaceholder] + img[VLazyImageImg] +
 *   button[VLazyImageRetry]`；三块部件常驻，状态只落一个 `data-state`（`loading` / `loaded` / `error`）——
 *   图片透明度 / 占位与重试按钮的显隐全在 `yoya.ui.css` 的 `[data-state]` 规则里（R5）；
 * - **状态与命令在闭包**：`src` / `alt` / `defer` 是句柄 + 读值绑定（`<img>` 的 `src` / `alt` 都是绑定，
 *   不是命令里手写属性）；`loadState()` 读状态、`retry()` 重试；
 * - **`defer`**：`src` 先不落 `<img>`，落地后由 `IntersectionObserver` 在进场时把 `revealed` 翻真
 *   （绑定随即把 `src` 写进 DOM）；没有观察器的环境直接加载；`whenDestroy` 断开（幂等）；
 * - props 进参数表（`src` / `alt` / `defer`），位置参数只认对象（与迁移前 `_setupLazyImage` 同口径）。
 */

export function VLazyImage({ alt = '', defer = false, src = null, ...rest } = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  const srcState = asSignal(src);
  const altState = asSignal(alt);
  const deferState = asSignal(defer);
  const stateState = asSignal('loading');
  /** `defer` 模式下的"已进场"（或非 defer 模式直接为真）：`<img>` 的 `src` 由它开关。 */
  const revealed = ref(false);

  const srcValue = computed(() =>
    srcState.value === null || srcState.value === undefined ? null : String(srcState.value)
  );
  const altValue = computed(() => String(altState.value ?? ''));
  const deferValue = computed(() => Boolean(deferState.value));
  const stateValue = computed(() => stateState.value);
  const deferSrcAttr = computed(() => {
    if (!srcValue.value) {
      return null;
    }

    return deferValue.value && !revealed.value ? null : srcValue.value;
  });

  /** 观察器与图片元素（内部，不进视图状态）。 */
  let observer = null;
  let imgBox = null;
  /** 引擎钩子给的真元素（观察器要元素本身，组件代码不读 `_el`） */
  let observeElement = null;

  return vNode((api) => {
    const stopObserving = () => {
      observer?.disconnect();
      observer = null;
    };

    /** defer 模式：落地后观察，进场就把 `revealed` 翻真（绑定随即写 `src`）。 */
    const startObserving = () => {
      if (!deferValue.value || !srcValue.value || observer !== null || revealed.value) {
        return;
      }

      if (typeof IntersectionObserver === 'undefined') {
        // 环境没有观察器（SSR / 老浏览器）：直接加载
        revealed.value = true;
        return;
      }

      if (!observeElement) {
        // 还没落地：等 `whenMount` 把元素给过来再建观察器（不为拿元素提前把 DOM 建出来）
        return;
      }

      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          revealed.value = true;
          stopObserving();
        });
      });

      observer.observe(observeElement);
    };

    api.src = (value) => {
      if (value === undefined) {
        return srcValue.value;
      }

      srcState.value = value === null ? null : String(value);

      if (!deferValue.value) {
        revealed.value = true;
      }

      startObserving();
      return api;
    };

    api.alt = (value) => {
      if (value === undefined) {
        return altValue.value;
      }

      altState.value = String(value ?? '');
      return api;
    };

    api.defer = (value) => {
      if (value === undefined) {
        return deferValue.value;
      }

      deferState.value = Boolean(value);

      if (deferValue.value) {
        revealed.value = false;
        startObserving();
      } else {
        revealed.value = true;
      }

      return api;
    };

    /** 当前加载状态：loading / loaded / error。 */
    api.loadState = () => stateValue.value;

    /** 重试：状态回到 loading，并把 `src` 重写一次逼浏览器重新加载（与迁移前同口径）。 */
    api.retry = () => {
      if (!srcValue.value) {
        return api;
      }

      stateState.value = 'loading';
      revealed.value = true;
      imgBox?.attr('src', srcValue.value);
      return api;
    };

    api.whenMount = (host) => {
      observeElement = host.element() ?? observeElement;
      startObserving();
    };

    api.whenDestroy = () => {
      stopObserving();
      observeElement = null;
    };

    return div(
      {
        ...elementConfig,
        attrs: { ...restAttrs, 'aria-label': computed(() => altValue.value || null) },
        'data-state': stateValue,
        role: 'img',
        vn: 'VLazyImage'
      },
      (root) =>
        root.child(
          span({ vn: 'VLazyImagePlaceholder' }),

          img(
            {
              attrs: {
                alt: computed(() => altValue.value || null),
                loading: 'lazy',
                src: deferSrcAttr
              },
              vn: 'VLazyImageImg'
            },
            (box) => {
              imgBox = box;
              box.on('load', () => {
                stateState.value = 'loaded';
              });
              box.on('error', () => {
                stateState.value = 'error';
              });
            }
          ),

          button({ attrs: { type: 'button' }, vn: 'VLazyImageRetry' }, (box) => {
            box.child('加载失败，点击重试');
            box.on('click', () => api.retry());
          })
        )
    );
  });
}

export const vLazyImage = createComponentShortcut(VLazyImage, { props: true });
