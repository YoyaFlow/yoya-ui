import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode, div } from '../html/index.js';
import { bindWindowEvent } from '../core/document-events.js';
import { vNode } from '../core/v-node.js';
import { createComponentShortcut, delegateNodeCommands } from '../components/shared.js';

/**
 * ECharts 宿主（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * **组件不继承基础元素**（票 16 第 112 / 114 条）：`EchartNode` 那层节点类型退场，视图根就是普通
 * 元素节点；适配器的生命周期改挂**组件钩子**——
 *
 * - `whenMount(host)`：拿到落地元素（`host.element()`，`core/hooks.js` 的既有口子，不再用
 *   `renderDom()` / `_el`），排一帧后 `echartsLib.init(element, …)`；尺寸观察器也在这里挂；
 * - `whenDestroy()`：断开观察器、`dispose()` 掉图表实例；
 * - 状态（`option` / `width` / `height` / `renderer` / `theme` / `loading` …）都在闭包里，命令只写状态；
 *   `width` / `height` 是**行内值**（随状态变，R5 只管静态样式），`overflow` / `position` 在样式表里。
 */
export function VEChart({
  autoResize,
  devicePixelRatio,
  echartsLib,
  height,
  loading,
  loadingText,
  onChartReady,
  onChartResize,
  option,
  renderer,
  theme,
  width,
  ...rest
} = {}) {
  const state = {
    autoResize: autoResize === undefined ? true : Boolean(autoResize),
    chartInstance: null,
    devicePixelRatio: devicePixelRatio ?? null,
    destroyed: false,
    echartsLib: echartsLib ?? null,
    element: null,
    height: height ?? '400px',
    loading: Boolean(loading),
    loadingText: loadingText ?? '加载中...',
    onReadyCallbacks: [],
    onResizeCallbacks: [],
    option: option ?? null,
    renderer: renderer === 'svg' ? 'svg' : 'canvas',
    resizeObserver: null,
    resizeUnbind: null,
    theme: theme ?? null,
    width: width ?? '100%'
  };

  const resolveLib = () => {
    if (!state.echartsLib && typeof window !== 'undefined' && window.echarts) {
      state.echartsLib = window.echarts;
    }

    return state.echartsLib;
  };

  return vNode((api) => {
    const executeReadyCallbacks = () => {
      if (!state.chartInstance) {
        return;
      }

      state.onReadyCallbacks.forEach((callback) => {
        try {
          callback(state.chartInstance);
        } catch (error) {
          console.error('[VEchart] Error in onChartReady callback:', error);
        }
      });
      state.onReadyCallbacks = [];
    };

    const handleResize = (nextWidth, nextHeight) => {
      if (!state.chartInstance) {
        return;
      }

      state.chartInstance.resize();
      state.onResizeCallbacks.forEach((callback) => {
        try {
          callback({ height: nextHeight, width: nextWidth });
        } catch (error) {
          console.error('[VEchart] Error in onChartResize callback:', error);
        }
      });
    };

    const initResizeObserver = () => {
      const element = state.element;

      if (typeof ResizeObserver !== 'undefined') {
        state.resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const { height: boxHeight, width: boxWidth } = entry.contentRect;
            handleResize(boxWidth, boxHeight);
          }
        });

        if (element) {
          state.resizeObserver.observe(element);
        }

        return;
      }

      state.resizeUnbind = bindWindowEvent('resize', () => handleResize());
    };

    /** 适配器初始化：落地后才做（`whenMount` 里排一帧，等布局稳定）。 */
    const initChart = () => {
      // 拍一帧的窗口里可能已经被销毁：这时不再初始化（迁移前 `_initChart` 开头就查 `_deleted` 的同口径）
      if (state.destroyed) {
        return;
      }

      const lib = resolveLib();

      if (!lib) {
        console.warn('[VEchart] ECharts library not provided. Call echartsLib() first.');
        return;
      }

      if (state.chartInstance || !state.element) {
        return;
      }

      try {
        state.chartInstance = lib.init(state.element, state.theme, {
          devicePixelRatio: state.devicePixelRatio,
          renderer: state.renderer
        });

        if (state.option) {
          state.chartInstance.setOption(state.option, true);
        }
        if (state.loading) {
          api.loading(true, state.loadingText);
        }

        setTimeout(() => {
          if (state.chartInstance && !state.chartInstance.isDisposed()) {
            state.chartInstance.resize();
          }
        }, 100);

        executeReadyCallbacks();

        if (state.autoResize) {
          initResizeObserver();
        }
      } catch (error) {
        console.error('[VEchart] Failed to initialize chart:', error);
      }
    };

    const disposeChart = () => {
      if (state.resizeObserver) {
        state.resizeObserver.disconnect();
        state.resizeObserver = null;
      }
      if (state.resizeUnbind) {
        state.resizeUnbind();
        state.resizeUnbind = null;
      }
      if (state.chartInstance) {
        state.chartInstance.dispose();
        state.chartInstance = null;
      }
    };

    api.echartsLib = (lib) => {
      if (lib !== undefined) {
        state.echartsLib = lib ?? null;
      }

      return api;
    };

    api.option = (value) => {
      if (value === undefined) {
        return state.option;
      }

      state.option = value || null;

      if (state.chartInstance && resolveLib()) {
        state.chartInstance.setOption(state.option, true);
      }

      return api;
    };

    api.width = (value) => {
      if (value === undefined) {
        return state.width;
      }

      state.width = value;
      return api;
    };

    api.height = (value) => {
      if (value === undefined) {
        return state.height;
      }

      state.height = value;
      return api;
    };

    api.theme = (value) => {
      if (value === undefined) {
        return state.theme;
      }

      state.theme = value ?? null;
      return api;
    };

    api.renderer = (value) => {
      if (value === undefined) {
        return state.renderer;
      }

      state.renderer = value === 'svg' ? 'svg' : 'canvas';
      return api;
    };

    api.devicePixelRatio = (value) => {
      if (value === undefined) {
        return state.devicePixelRatio;
      }

      state.devicePixelRatio = value;
      return api;
    };

    api.autoResize = (value) => {
      if (value === undefined) {
        return state.autoResize;
      }

      state.autoResize = Boolean(value);
      return api;
    };

    api.loading = (value, text = '加载中...') => {
      state.loading = Boolean(value);
      state.loadingText = text;

      if (state.chartInstance) {
        if (state.loading) {
          state.chartInstance.showLoading({
            color: 'var(--yoya-color-primary, #2563eb)',
            lineWidth: 2,
            maskColor: 'rgba(255, 255, 255, 0.8)',
            text,
            textColor: 'var(--yoya-color-text, #172033)'
          });
        } else {
          state.chartInstance.hideLoading();
        }
      }

      return api;
    };

    api.onChartReady = (callback) => {
      if (typeof callback === 'function') {
        if (state.chartInstance) {
          callback(state.chartInstance);
        } else {
          state.onReadyCallbacks.push(callback);
        }
      }

      return api;
    };

    api.onChartResize = (callback) => {
      if (typeof callback === 'function') {
        state.onResizeCallbacks.push(callback);
      }

      return api;
    };

    api.getChartInstance = () => state.chartInstance;
    api.resize = (opts = {}) => {
      state.chartInstance?.resize(opts);
      return api;
    };
    api.clear = () => {
      state.chartInstance?.clear();
      return api;
    };
    api.dispose = () => {
      disposeChart();
      return api;
    };

    // 结构（R2）：宿主是普通元素节点；尺寸是随状态变的行内值（静态样式在样式表里）
    const view = div({
      ...rest,
      style: { height: state.height, width: state.width },
      vn: 'VEChart'
    });

    // 适配器生命周期（不再用 `renderDom()` / `_el`：落地元素由钩子上下文给）
    api.whenMount = (host) => {
      state.element = host?.element?.() ?? null;
      requestAnimationFrame(() => initChart());
    };

    api.whenDestroy = () => {
      state.destroyed = true;
      disposeChart();
    };

    // props：库 / 尺寸 / 主题 / 渲染器 / 观察 / 选项 / 加载态 / 回调（迁移前 `_setupEchart` 的顺序）
    if (echartsLib !== undefined) {
      api.echartsLib(echartsLib);
    }
    if (width !== undefined) {
      api.width(width);
    }
    if (height !== undefined) {
      api.height(height);
    }
    if (autoResize !== undefined) {
      api.autoResize(autoResize);
    }
    if (loadingText !== undefined) {
      state.loadingText = loadingText;
    }
    if (onChartReady !== undefined) {
      api.onChartReady(onChartReady);
    }
    if (onChartResize !== undefined) {
      api.onChartResize(onChartResize);
    }
    if (option !== undefined) {
      api.option(option);
    }
    if (loading !== undefined) {
      api.loading(loading, state.loadingText);
    }

    // 元素级命令代委托（第三方仍可用 `chart.attr(…)` / `chart.on(…)`）
    delegateNodeCommands(api, view);

    return view;
  });
}

export const vEchart = createComponentShortcut(VEChart, { props: true });

// 旧名（导出名 = 身份名）：`VEChart` 是定义函数，`vEchart` 是快捷方法
export { VEChart as VEchart };

registerChildFactories(HtmlElementNode, { vEchart });
