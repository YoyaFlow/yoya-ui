import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { componentClass, createComponentFactory, isPlainObject } from '../components/shared.js';

export class VEchart extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._autoResize = true;
    this._chartInstance = null;
    this._devicePixelRatio = null;
    this._echartsLib = null;
    this._height = '400px';
    this._loading = false;
    this._loadingText = '加载中...';
    this._onReadyCallbacks = [];
    this._onResizeCallbacks = [];
    this._option = null;
    this._renderer = 'canvas';
    this._resizeObserver = null;
    this._theme = null;
    this._width = '100%';

    this.className(componentClass, 'yoya-vechart');
    this.styles({
      height: this._height,
      overflow: 'hidden',
      position: 'relative',
      width: this._width
    });
    this._setupEchart(setup);
  }

  echartsLib(lib) {
    if (lib) {
      this._echartsLib = lib;
    } else if (typeof window !== 'undefined' && window.echarts) {
      this._echartsLib = window.echarts;
    }
    return this;
  }

  option(value) {
    if (value === undefined) {
      return this._option;
    }

    this._option = value || null;
    if (this._chartInstance && this._echartsLib) {
      this._chartInstance.setOption(this._option, true);
    }
    return this;
  }

  width(value) {
    if (value === undefined) {
      return this._width;
    }

    this._width = value;
    this.style('width', value);
    return this;
  }

  height(value) {
    if (value === undefined) {
      return this._height;
    }

    this._height = value;
    this.style('height', value);
    return this;
  }

  theme(value) {
    if (value === undefined) {
      return this._theme;
    }

    this._theme = value;
    return this;
  }

  renderer(value) {
    if (value === undefined) {
      return this._renderer;
    }

    this._renderer = value === 'svg' ? 'svg' : 'canvas';
    return this;
  }

  devicePixelRatio(value) {
    if (value === undefined) {
      return this._devicePixelRatio;
    }

    this._devicePixelRatio = value;
    return this;
  }

  autoResize(value) {
    if (value === undefined) {
      return this._autoResize;
    }

    this._autoResize = Boolean(value);
    return this;
  }

  loading(value, text = '加载中...') {
    this._loading = Boolean(value);
    this._loadingText = text;

    if (this._chartInstance) {
      if (this._loading) {
        this._chartInstance.showLoading({
          color: 'var(--yoya-color-primary, #2563eb)',
          lineWidth: 2,
          maskColor: 'rgba(255, 255, 255, 0.8)',
          text,
          textColor: 'var(--yoya-color-text, #172033)'
        });
      } else {
        this._chartInstance.hideLoading();
      }
    }

    return this;
  }

  onChartReady(callback) {
    if (typeof callback === 'function') {
      if (this._chartInstance) {
        callback(this._chartInstance);
      } else {
        this._onReadyCallbacks.push(callback);
      }
    }
    return this;
  }

  onChartResize(callback) {
    if (typeof callback === 'function') {
      this._onResizeCallbacks.push(callback);
    }
    return this;
  }

  getChartInstance() {
    return this._chartInstance;
  }

  resize(opts = {}) {
    if (this._chartInstance) {
      this._chartInstance.resize(opts);
    }
    return this;
  }

  clear() {
    if (this._chartInstance) {
      this._chartInstance.clear();
    }
    return this;
  }

  dispose() {
    this._disposeChart();
    return this;
  }

  destroy() {
    this._disposeChart();
    return super.destroy();
  }

  renderDom() {
    const element = super.renderDom();
    if (element && !this._chartInstance) {
      requestAnimationFrame(() => this._initChart());
    }
    return element;
  }

  _setupEchart(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
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
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (echartsLib !== undefined) {
        this.echartsLib(echartsLib);
      }
      if (width !== undefined) {
        this.width(width);
      }
      if (height !== undefined) {
        this.height(height);
      }
      if (theme !== undefined) {
        this.theme(theme);
      }
      if (renderer !== undefined) {
        this.renderer(renderer);
      }
      if (devicePixelRatio !== undefined) {
        this.devicePixelRatio(devicePixelRatio);
      }
      if (autoResize !== undefined) {
        this.autoResize(autoResize);
      }
      if (loadingText !== undefined) {
        this._loadingText = loadingText;
      }
      if (onChartReady !== undefined) {
        this.onChartReady(onChartReady);
      }
      if (onChartResize !== undefined) {
        this.onChartResize(onChartResize);
      }
      if (option !== undefined) {
        this.option(option);
      }
      if (loading !== undefined) {
        this.loading(loading, this._loadingText);
      }

      return;
    }

    this.child(setup);
  }

  _initChart() {
    if (!this._echartsLib) {
      this.echartsLib();
    }
    if (!this._echartsLib) {
      console.warn('[VEchart] ECharts library not provided. Call echartsLib() first.');
      return;
    }
    if (this._chartInstance || !this._el) {
      return;
    }

    try {
      this._chartInstance = this._echartsLib.init(this._el, this._theme, {
        devicePixelRatio: this._devicePixelRatio,
        renderer: this._renderer
      });
      if (this._option) {
        this._chartInstance.setOption(this._option, true);
      }
      setTimeout(() => {
        if (this._chartInstance && !this._chartInstance.isDisposed()) {
          this._chartInstance.resize();
        }
      }, 100);
      this._executeReadyCallbacks();
      if (this._autoResize) {
        this._initResizeObserver();
      }
    } catch (error) {
      console.error('[VEchart] Failed to initialize chart:', error);
    }
  }

  _executeReadyCallbacks() {
    if (!this._chartInstance) {
      return;
    }

    this._onReadyCallbacks.forEach((callback) => {
      try {
        callback(this._chartInstance);
      } catch (error) {
        console.error('[VEchart] Error in onChartReady callback:', error);
      }
    });
    this._onReadyCallbacks = [];
  }

  _initResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { height, width } = entry.contentRect;
          this._handleResize(width, height);
        }
      });
      if (this._el) {
        this._resizeObserver.observe(this._el);
      }
      return;
    }

    this._resizeHandler = () => this._handleResize();
    window.addEventListener('resize', this._resizeHandler);
  }

  _handleResize(width, height) {
    if (!this._chartInstance) {
      return;
    }

    this._chartInstance.resize();
    this._onResizeCallbacks.forEach((callback) => {
      try {
        callback({ height, width });
      } catch (error) {
        console.error('[VEchart] Error in onChartResize callback:', error);
      }
    });
  }

  _disposeChart() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    if (this._chartInstance) {
      this._chartInstance.dispose();
      this._chartInstance = null;
    }
  }
}

export function vEchart(first = null, second = null, third = null) {
  return createComponentFactory(VEchart, first, second, third);
}

registerChildFactories(HtmlElementNode, { vEchart });
