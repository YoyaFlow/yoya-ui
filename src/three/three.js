import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { bindWindowEvent } from '../core/document-events.js';
import { componentClass, createComponentFactory, isPlainObject } from '../components/shared.js';

const DEFAULT_RENDERER_OPTIONS = Object.freeze({ antialias: true });

/**
 * VThree 是 Three.js 的生命周期胶水节点：
 * 引擎创建一个真实容器，Three.js 渲染器在客户端挂进容器；
 * 组件负责渲染循环、像素比/尺寸同步与销毁清理。
 * Three.js 本体不打包，使用方通过 threeLib() 注入模块命名空间。
 */
export class VThree extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._autoRender = true;
    this._autoResize = true;
    this._camera = null;
    this._devicePixelRatio = null;
    this._frameCallbacks = [];
    this._frameId = null;
    this._height = '400px';
    this._initScheduled = false;
    this._onReadyCallbacks = [];
    this._onResizeCallbacks = [];
    this._renderer = null;
    this._rendererOptions = { ...DEFAULT_RENDERER_OPTIONS };
    this._resizeHandler = null;
    this._resizeObserver = null;
    this._resizeUnbind = null;
    this._running = false;
    this._scene = null;
    this._threeLib = null;
    this._width = '100%';

    this.className(componentClass, 'yoya-vthree');
    this.styles({
      height: this._height,
      overflow: 'hidden',
      position: 'relative',
      width: this._width
    });
    this._setupThree(setup);
  }

  threeLib(lib) {
    if (lib) {
      this._threeLib = lib;
    } else if (typeof window !== 'undefined' && window.THREE) {
      this._threeLib = window.THREE;
    }
    return this;
  }

  getThreeLib() {
    return this._threeLib;
  }

  scene(value) {
    if (value === undefined) {
      return this._scene;
    }

    this._scene = value;
    return this;
  }

  getScene() {
    return this._scene;
  }

  camera(value) {
    if (value === undefined) {
      return this._camera;
    }

    this._camera = value;
    return this;
  }

  getCamera() {
    return this._camera;
  }

  rendererOptions(value) {
    if (value === undefined) {
      return { ...this._rendererOptions };
    }

    this._rendererOptions = {
      ...DEFAULT_RENDERER_OPTIONS,
      ...(isPlainObject(value) ? value : {})
    };
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

  devicePixelRatio(value) {
    if (value === undefined) {
      return this._devicePixelRatio;
    }

    this._devicePixelRatio = value;
    if (this._renderer) {
      this._syncPixelRatio();
      this._handleResize();
    }
    return this;
  }

  autoResize(value) {
    if (value === undefined) {
      return this._autoResize;
    }

    this._autoResize = Boolean(value);
    if (this._renderer) {
      if (this._autoResize) {
        if (!this._resizeObserver && !this._resizeHandler) {
          this._initResizeObserver();
        }
      } else {
        this._disconnectResizeObserver();
      }
    }
    return this;
  }

  autoRender(value) {
    if (value === undefined) {
      return this._autoRender;
    }

    this._autoRender = Boolean(value);
    if (this._renderer) {
      if (this._autoRender) {
        this.start();
      } else {
        this.stop();
      }
    }
    return this;
  }

  onReady(callback) {
    if (typeof callback === 'function') {
      if (this._renderer) {
        callback(this._api());
      } else {
        this._onReadyCallbacks.push(callback);
      }
    }
    return this;
  }

  onResize(callback) {
    if (typeof callback === 'function') {
      this._onResizeCallbacks.push(callback);
    }
    return this;
  }

  onFrame(callback) {
    if (typeof callback === 'function') {
      this._frameCallbacks.push(callback);
    }
    return this;
  }

  getRenderer() {
    return this._renderer;
  }

  start() {
    if (this._renderer && !this._running) {
      this._running = true;
      this._frameId = requestAnimationFrame(() => this._frame());
    }
    return this;
  }

  stop() {
    this._running = false;
    if (this._frameId !== null) {
      cancelAnimationFrame(this._frameId);
      this._frameId = null;
    }
    return this;
  }

  render() {
    if (this._renderer && this._scene && this._camera) {
      this._renderer.render(this._scene, this._camera);
    }
    return this;
  }

  resize() {
    this._handleResize();
    return this;
  }

  dispose() {
    this._disposeThree();
    return this;
  }

  destroy() {
    this._disposeThree();
    return super.destroy();
  }

  renderDom() {
    const element = super.renderDom();
    if (element && !this._renderer && !this._initScheduled) {
      this._initScheduled = true;
      requestAnimationFrame(() => this._init());
    }
    return element;
  }

  _setupThree(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
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
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (threeLib !== undefined) {
        this.threeLib(threeLib);
      }
      if (scene !== undefined) {
        this.scene(scene);
      }
      if (camera !== undefined) {
        this.camera(camera);
      }
      if (width !== undefined) {
        this.width(width);
      }
      if (height !== undefined) {
        this.height(height);
      }
      if (rendererOptions !== undefined) {
        this.rendererOptions(rendererOptions);
      }
      if (devicePixelRatio !== undefined) {
        this.devicePixelRatio(devicePixelRatio);
      }
      if (autoResize !== undefined) {
        this.autoResize(autoResize);
      }
      if (autoRender !== undefined) {
        this.autoRender(autoRender);
      }
      if (onReady !== undefined) {
        this.onReady(onReady);
      }
      if (onResize !== undefined) {
        this.onResize(onResize);
      }
      if (onFrame !== undefined) {
        this.onFrame(onFrame);
      }
      return;
    }

    this.child(setup);
  }

  _init() {
    this._initScheduled = false;
    if (this._deleted) {
      return;
    }

    if (!this._threeLib) {
      this.threeLib();
    }
    if (!this._threeLib) {
      console.warn('[VThree] Three.js library not provided. Call threeLib() first.');
      return;
    }
    if (this._renderer || !this._el) {
      return;
    }

    try {
      const lib = this._threeLib;
      if (!this._scene) {
        this._scene = new lib.Scene();
      }
      if (!this._camera) {
        this._camera = new lib.PerspectiveCamera(75, 1, 0.1, 1000);
        if (typeof this._camera.position?.set === 'function') {
          this._camera.position.set(0, 0, 5);
        }
      }

      this._renderer = new lib.WebGLRenderer(this._rendererOptions);
      this._el.appendChild(this._renderer.domElement);
      this._syncPixelRatio();
      this._handleResize();
      this._executeReadyCallbacks();

      if (this._autoRender) {
        this.start();
      } else {
        this.render();
      }
      if (this._autoResize) {
        this._initResizeObserver();
      }
    } catch (error) {
      console.error('[VThree] Failed to initialize renderer:', error);
    }
  }

  _frame() {
    if (this._deleted || !this._running || !this._renderer) {
      this._running = false;
      this._frameId = null;
      return;
    }

    const api = this._api();
    this._frameCallbacks.forEach((callback) => {
      try {
        callback(api);
      } catch (error) {
        console.error('[VThree] Error in onFrame callback:', error);
      }
    });
    this.render();
    this._frameId = requestAnimationFrame(() => this._frame());
  }

  _api() {
    return {
      camera: this._camera,
      renderer: this._renderer,
      scene: this._scene,
      threeLib: this._threeLib
    };
  }

  _executeReadyCallbacks() {
    if (!this._renderer) {
      return;
    }

    const api = this._api();
    this._onReadyCallbacks.forEach((callback) => {
      try {
        callback(api);
      } catch (error) {
        console.error('[VThree] Error in onReady callback:', error);
      }
    });
    this._onReadyCallbacks = [];
  }

  _initResizeObserver() {
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { height, width } = entry.contentRect;
          if (width > 0 || height > 0) {
            this._handleResize();
          }
        }
      });
      if (this._el) {
        this._resizeObserver.observe(this._el);
      }
      return;
    }

    this._resizeHandler = () => this._handleResize();
    this._resizeUnbind = bindWindowEvent('resize', this._resizeHandler);
  }

  _disconnectResizeObserver() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._resizeHandler) {
      this._resizeUnbind?.();
      this._resizeHandler = null;
      this._resizeUnbind = null;
    }
  }

  _syncPixelRatio() {
    if (!this._renderer) {
      return;
    }

    const pixelRatio =
      this._devicePixelRatio ?? ((typeof window !== 'undefined' && window.devicePixelRatio) || 1);
    this._renderer.setPixelRatio(pixelRatio);
  }

  _handleResize() {
    if (!this._renderer) {
      return;
    }

    const { height, width } = this._measureSize();
    this._renderer.setSize(width, height);
    if (this._camera?.isPerspectiveCamera) {
      this._camera.aspect = width / height;
      if (typeof this._camera.updateProjectionMatrix === 'function') {
        this._camera.updateProjectionMatrix();
      }
    }

    const size = { height, width };
    this._onResizeCallbacks.forEach((callback) => {
      try {
        callback(size);
      } catch (error) {
        console.error('[VThree] Error in onResize callback:', error);
      }
    });
    this.render();
  }

  _measureSize() {
    let height = 0;
    let width = 0;

    if (this._el) {
      const rect = this._el.getBoundingClientRect();
      width = this._el.clientWidth || rect.width || 0;
      height = this._el.clientHeight || rect.height || 0;
    }

    width = width || this._parseLength(this._width);
    height = height || this._parseLength(this._height);
    return {
      height: Math.max(1, Math.round(height)),
      width: Math.max(1, Math.round(width))
    };
  }

  _parseLength(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string') {
      const match = value.trim().match(/^([\d.]+)px$/);
      return match ? Number(match[1]) : 0;
    }
    return 0;
  }

  _disposeThree() {
    this.stop();
    this._disconnectResizeObserver();
    if (this._renderer) {
      try {
        this._renderer.dispose();
      } catch (error) {
        console.error('[VThree] Failed to dispose renderer:', error);
      }
      this._renderer = null;
    }
    this._camera = null;
    this._frameCallbacks = [];
    this._onReadyCallbacks = [];
    this._onResizeCallbacks = [];
    this._scene = null;
    this._threeLib = null;
  }
}

export function vThree(first = null, second = null, third = null) {
  return createComponentFactory(VThree, first, second, third);
}

registerChildFactories(HtmlElementNode, { vThree });
