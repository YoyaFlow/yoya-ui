import { registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { HtmlElementNode, div } from '@yoyaflow/yoya-core/html';
import { bindWindowEvent } from '@yoyaflow/yoya-core/internal/core/document-events.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import {
  createComponentShortcut,
  delegateNodeCommands,
  isPlainObject
} from '../components/shared.js';

const DEFAULT_RENDERER_OPTIONS = Object.freeze({ antialias: true });

/**
 * Three.js 宿主（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * **组件不继承基础元素**（票 16 第 112 / 114 条）：`ThreeNode` 那层节点类型退场，视图根就是普通
 * 元素节点；渲染器的生命周期改挂**组件钩子**——
 *
 * - `whenMount(host)`：取落地元素（`host.element()`，`core/hooks.js` 的既有口子）并排一帧做初始化：
 *   建场景 / 相机 / `WebGLRenderer`、把 `renderer.domElement` 挂进宿主、同步像素比与尺寸、
 *   跑 ready 回调、按 `autoRender` 起渲染循环、按 `autoResize` 挂尺寸观察器；
 * - `whenDestroy()`：停循环、断观察器、`dispose()` 渲染器；
 * - 状态（`scene` / `camera` / `rendererOptions` / `width` / `height` / `devicePixelRatio` /
 *   `autoResize` / `autoRender`）全在闭包，命令只写状态；`width` / `height` 是随状态变的行内值。
 */
export function VThree({
  autoRender,
  autoResize,
  camera,
  devicePixelRatio,
  height,
  onFrame,
  onReady,
  onResize,
  rendererOptions,
  scene,
  threeLib,
  width,
  ...rest
} = {}) {
  // 尺寸是**状态**（命令写、视图跟）：句柄进 `style` 才是随状态变的活值，
  // 写死成普通值会让 `three.height('100%')` 只改状态、DOM 停在默认值（R6 读值绑定）。
  const heightRef = ref(height ?? '400px');
  const widthRef = ref(width ?? '100%');
  const state = {
    autoRender: autoRender === undefined ? true : Boolean(autoRender),
    autoResize: autoResize === undefined ? true : Boolean(autoResize),
    camera: camera ?? null,
    destroyed: false,
    devicePixelRatio: devicePixelRatio ?? null,
    element: null,
    frameCallbacks: [],
    frameId: null,
    height: heightRef,
    initScheduled: false,
    onReadyCallbacks: [],
    onResizeCallbacks: [],
    renderer: null,
    rendererOptions: { ...DEFAULT_RENDERER_OPTIONS },
    resizeObserver: null,
    resizeUnbind: null,
    running: false,
    scene: scene ?? null,
    threeLib: threeLib ?? null,
    width: widthRef
  };

  const resolveLib = () => {
    if (!state.threeLib && typeof window !== 'undefined' && window.THREE) {
      state.threeLib = window.THREE;
    }

    return state.threeLib;
  };

  const parseLength = (value) => {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const match = value.trim().match(/^([\d.]+)px$/);
      return match ? Number(match[1]) : 0;
    }
    return 0;
  };

  return vNode((api) => {
    /** 回调拿到的取用面（迁移前 `_api()` 同口径）。 */
    const frameApi = () => ({
      camera: state.camera,
      renderer: state.renderer,
      scene: state.scene,
      threeLib: state.threeLib
    });

    const renderFrame = () => {
      if (state.renderer && state.scene && state.camera) {
        state.renderer.render(state.scene, state.camera);
      }

      return api;
    };

    const start = () => {
      if (state.renderer && !state.running) {
        state.running = true;
        state.frameId = requestAnimationFrame(() => tick());
      }

      return api;
    };

    const stop = () => {
      state.running = false;

      if (state.frameId !== null) {
        cancelAnimationFrame(state.frameId);
        state.frameId = null;
      }

      return api;
    };

    const measureSize = () => {
      let boxHeight = 0;
      let boxWidth = 0;
      const element = state.element;

      if (element) {
        const rect = element.getBoundingClientRect();
        boxWidth = element.clientWidth || rect.width || 0;
        boxHeight = element.clientHeight || rect.height || 0;
      }

      boxWidth = boxWidth || parseLength(state.width.value);
      boxHeight = boxHeight || parseLength(state.height.value);

      return {
        height: Math.max(1, Math.round(boxHeight)),
        width: Math.max(1, Math.round(boxWidth))
      };
    };

    const syncPixelRatio = () => {
      if (!state.renderer) {
        return;
      }

      const pixelRatio =
        state.devicePixelRatio ?? ((typeof window !== 'undefined' && window.devicePixelRatio) || 1);
      state.renderer.setPixelRatio(pixelRatio);
    };

    const handleResize = () => {
      if (!state.renderer) {
        return api;
      }

      const { height: boxHeight, width: boxWidth } = measureSize();
      state.renderer.setSize(boxWidth, boxHeight);

      if (state.camera?.isPerspectiveCamera) {
        state.camera.aspect = boxWidth / boxHeight;

        if (typeof state.camera.updateProjectionMatrix === 'function') {
          state.camera.updateProjectionMatrix();
        }
      }

      const size = { height: boxHeight, width: boxWidth };
      state.onResizeCallbacks.forEach((callback) => {
        try {
          callback(size);
        } catch (error) {
          console.error('[VThree] Error in onResize callback:', error);
        }
      });

      renderFrame();
      return api;
    };

    const disconnectResizeObserver = () => {
      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }
      if (state.resizeUnbind) {
        state.resizeUnbind();
        state.resizeUnbind = null;
      }
    };

    const initResizeObserver = () => {
      if (typeof ResizeObserver !== 'undefined') {
        state.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { height: boxHeight, width: boxWidth } = entry.contentRect;

            if (boxWidth > 0 || boxHeight > 0) {
              handleResize();
            }
          }
        });

        if (state.element) {
          state.resizeObserver.observe(state.element);
        }

        return;
      }

      state.resizeUnbind = bindWindowEvent('resize', () => handleResize());
    };

    const executeReadyCallbacks = () => {
      if (!state.renderer) {
        return;
      }

      const payload = frameApi();
      state.onReadyCallbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error('[VThree] Error in onReady callback:', error);
        }
      });
      state.onReadyCallbacks = [];
    };

    const tick = () => {
      if (state.destroyed || !state.running || !state.renderer) {
        state.running = false;
        state.frameId = null;
        return;
      }

      const payload = frameApi();
      state.frameCallbacks.forEach((callback) => {
        try {
          callback(payload);
        } catch (error) {
          console.error('[VThree] Error in onFrame callback:', error);
        }
      });

      renderFrame();
      state.frameId = requestAnimationFrame(() => tick());
    };

    /** 初始化：落地之后（`whenMount` 排一帧）再建渲染器，宿主元素由钩子上下文给。 */
    const initThree = () => {
      state.initScheduled = false;

      if (state.destroyed) {
        return;
      }

      const lib = resolveLib();

      if (!lib) {
        console.warn('[VThree] Three.js library not provided. Call threeLib() first.');
        return;
      }

      if (state.renderer || !state.element) {
        return;
      }

      try {
        if (!state.scene) {
          state.scene = new lib.Scene();
        }
        if (!state.camera) {
          state.camera = new lib.PerspectiveCamera(75, 1, 0.1, 1000);

          if (typeof state.camera.position?.set === 'function') {
            state.camera.position.set(0, 0, 5);
          }
        }

        state.renderer = new lib.WebGLRenderer(state.rendererOptions);
        state.element.appendChild(state.renderer.domElement);
        syncPixelRatio();
        handleResize();
        executeReadyCallbacks();

        if (state.autoRender) {
          start();
        } else {
          renderFrame();
        }

        if (state.autoResize) {
          initResizeObserver();
        }
      } catch (error) {
        console.error('[VThree] Failed to initialize renderer:', error);
      }
    };

    const disposeThree = () => {
      stop();
      disconnectResizeObserver();

      if (state.renderer) {
        try {
          state.renderer.dispose();
        } catch (error) {
          console.error('[VThree] Failed to dispose renderer:', error);
        }
        state.renderer = null;
      }

      state.camera = null;
      state.frameCallbacks = [];
      state.onReadyCallbacks = [];
      state.onResizeCallbacks = [];
      state.scene = null;
      state.threeLib = null;
    };

    api.threeLib = (lib) => {
      if (lib !== undefined) {
        state.threeLib = lib ?? null;
      }

      return api;
    };
    api.getThreeLib = () => state.threeLib;

    api.scene = (value) => {
      if (value === undefined) {
        return state.scene;
      }

      state.scene = value;
      return api;
    };
    api.getScene = () => state.scene;

    api.camera = (value) => {
      if (value === undefined) {
        return state.camera;
      }

      state.camera = value;
      return api;
    };
    api.getCamera = () => state.camera;

    api.rendererOptions = (value) => {
      if (value === undefined) {
        return { ...state.rendererOptions };
      }

      state.rendererOptions = {
        ...DEFAULT_RENDERER_OPTIONS,
        ...(isPlainObject(value) ? value : {})
      };
      return api;
    };

    api.width = (value) => {
      if (value === undefined) {
        return state.width.value;
      }

      state.width.value = value;
      return api;
    };

    api.height = (value) => {
      if (value === undefined) {
        return state.height.value;
      }

      state.height.value = value;
      return api;
    };

    api.devicePixelRatio = (value) => {
      if (value === undefined) {
        return state.devicePixelRatio;
      }

      state.devicePixelRatio = value;

      if (state.renderer) {
        syncPixelRatio();
        handleResize();
      }

      return api;
    };

    api.autoResize = (value) => {
      if (value === undefined) {
        return state.autoResize;
      }

      state.autoResize = Boolean(value);

      if (state.renderer) {
        if (state.autoResize) {
          if (!state.resizeObserver && !state.resizeUnbind) {
            initResizeObserver();
          }
        } else {
          disconnectResizeObserver();
        }
      }

      return api;
    };

    api.autoRender = (value) => {
      if (value === undefined) {
        return state.autoRender;
      }

      state.autoRender = Boolean(value);

      if (state.renderer) {
        if (state.autoRender) {
          start();
        } else {
          stop();
        }
      }

      return api;
    };

    api.onReady = (callback) => {
      if (typeof callback === 'function') {
        if (state.renderer) {
          callback(frameApi());
        } else {
          state.onReadyCallbacks.push(callback);
        }
      }

      return api;
    };

    api.onResize = (callback) => {
      if (typeof callback === 'function') {
        state.onResizeCallbacks.push(callback);
      }

      return api;
    };

    api.onFrame = (callback) => {
      if (typeof callback === 'function') {
        state.frameCallbacks.push(callback);
      }

      return api;
    };

    api.getRenderer = () => state.renderer;
    api.start = () => start();
    api.stop = () => stop();
    /** `render()` 与引擎保留键冲突（16 号第 35 / 94 条口径）：手动渲染一帧走这个别名。 */
    api.renderFrame = () => renderFrame();
    api.resize = () => handleResize();
    api.dispose = () => {
      disposeThree();
      return api;
    };

    // 结构（R2）：宿主是普通元素节点；尺寸是随状态变的行内值（静态样式在样式表里）
    const view = div({
      ...rest,
      style: { height: state.height, width: state.width },
      vn: 'VThree'
    });

    // 渲染器生命周期（不再用 `renderDom()` / `_el`：落地元素由钩子上下文给）
    api.whenMount = (host) => {
      state.element = host?.element?.() ?? null;

      if (!state.renderer && !state.initScheduled) {
        state.initScheduled = true;
        requestAnimationFrame(() => initThree());
      }
    };

    api.whenDestroy = () => {
      state.destroyed = true;
      disposeThree();
    };

    // props：库 / 场景 / 相机 / 尺寸 / 渲染器选项 / 像素比 / 观察 / 回调（迁移前 `_setupThree` 的顺序）
    if (threeLib !== undefined) {
      api.threeLib(threeLib);
    }
    if (scene !== undefined) {
      api.scene(scene);
    }
    if (camera !== undefined) {
      api.camera(camera);
    }
    if (width !== undefined) {
      api.width(width);
    }
    if (height !== undefined) {
      api.height(height);
    }
    if (rendererOptions !== undefined) {
      api.rendererOptions(rendererOptions);
    }
    if (devicePixelRatio !== undefined) {
      api.devicePixelRatio(devicePixelRatio);
    }
    if (autoResize !== undefined) {
      api.autoResize(autoResize);
    }
    if (autoRender !== undefined) {
      api.autoRender(autoRender);
    }
    if (onReady !== undefined) {
      api.onReady(onReady);
    }
    if (onResize !== undefined) {
      api.onResize(onResize);
    }
    if (onFrame !== undefined) {
      api.onFrame(onFrame);
    }

    // 元素级命令代委托（第三方仍可用 `host.attr(…)` / `host.on(…)`）
    delegateNodeCommands(api, view);

    return view;
  });
}

export const vThree = createComponentShortcut(VThree, { props: true });

registerChildFactories(HtmlElementNode, { vThree });
