import { afterEach, describe, expect, it, vi } from 'vitest';
import { div } from '../index.js';
import { VThree, vThree } from '../yoya.three.js';

function createFakeThree() {
  const renderers = [];

  class FakeScene {
    constructor() {
      this.children = [];
    }

    add(child) {
      this.children.push(child);
    }
  }

  class FakePerspectiveCamera {
    constructor() {
      this.aspect = 1;
      this.isPerspectiveCamera = true;
      this.position = { set: vi.fn() };
      this.updateProjectionMatrix = vi.fn();
    }
  }

  class FakeWebGLRenderer {
    constructor(options) {
      this.domElement = document.createElement('canvas');
      this.dispose = vi.fn();
      this.options = options;
      this.render = vi.fn();
      this.setPixelRatio = vi.fn();
      this.setSize = vi.fn();
      renderers.push(this);
    }
  }

  const lib = {
    PerspectiveCamera: FakePerspectiveCamera,
    Scene: FakeScene,
    WebGLRenderer: FakeWebGLRenderer
  };

  return { lib, renderers };
}

function createFrameQueue() {
  const frames = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  return frames;
}

describe('VThree', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('initializes the renderer, scene and camera after mount', () => {
    const { lib, renderers } = createFakeThree();
    const frames = createFrameQueue();
    const node = vThree({
      autoRender: false,
      height: '300px',
      threeLib: lib,
      width: '600px'
    }).bindTo(document.body);

    expect(renderers).toHaveLength(0);
    frames.shift()();
    expect(renderers).toHaveLength(1);

    const renderer = renderers[0];
    expect(node.className()).toContain('yoya-vthree');
    expect(node.getRenderer()).toBe(renderer);
    expect(node.getScene()).toBeInstanceOf(lib.Scene);
    expect(node.getCamera()).toBeInstanceOf(lib.PerspectiveCamera);
    expect(node.getCamera().position.set).toHaveBeenCalledWith(0, 0, 5);
    expect(renderer.options).toEqual({ antialias: true });
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(1);
    expect(renderer.setSize).toHaveBeenCalledWith(600, 300);
    expect(renderer.domElement.parentNode).toBe(document.querySelector('.yoya-vthree'));
    expect(renderer.render).toHaveBeenCalledWith(node.getScene(), node.getCamera());

    node.dispose();
    expect(renderer.dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps provided scene, camera and renderer options', () => {
    const { lib, renderers } = createFakeThree();
    const frames = createFrameQueue();
    const scene = { name: 'custom-scene' };
    const camera = {
      aspect: 1,
      isPerspectiveCamera: true,
      updateProjectionMatrix: vi.fn()
    };
    const node = vThree({
      autoRender: false,
      camera,
      height: '240px',
      rendererOptions: { alpha: true, antialias: false },
      scene,
      threeLib: lib,
      width: '480px'
    }).bindTo(document.body);

    frames.shift()();
    const renderer = renderers[0];

    expect(node.getScene()).toBe(scene);
    expect(node.getCamera()).toBe(camera);
    expect(renderer.options).toEqual({ alpha: true, antialias: false });
    expect(renderer.render).toHaveBeenCalledWith(scene, camera);

    node.resize();
    expect(renderer.setSize).toHaveBeenLastCalledWith(480, 240);
    expect(camera.updateProjectionMatrix).toHaveBeenCalledTimes(2);
  });

  it('registers vThree as a parent shortcut', () => {
    const page = div((root) => {
      root.vThree({ height: '240px', width: '600px' });
    });
    const three = page.children()[0];

    expect(three).toBeInstanceOf(VThree);
    expect(three.className()).toContain('yoya-vthree');
    expect(three.height()).toBe('240px');
  });

  it('does not initialize after destroy before the animation frame runs', () => {
    const { lib, renderers } = createFakeThree();
    const frames = createFrameQueue();
    const node = vThree({ threeLib: lib }).bindTo(document.body);

    node.destroy();
    frames.shift()();

    expect(renderers).toHaveLength(0);
  });

  it('executes onReady once with the instance api', () => {
    const { lib } = createFakeThree();
    const frames = createFrameQueue();
    const ready = vi.fn();
    const node = vThree({
      autoRender: false,
      height: '300px',
      onReady: ready,
      threeLib: lib,
      width: '600px'
    }).bindTo(document.body);

    frames.shift()();
    expect(ready).toHaveBeenCalledTimes(1);
    expect(ready.mock.calls[0][0]).toEqual({
      camera: node.getCamera(),
      renderer: node.getRenderer(),
      scene: node.getScene(),
      threeLib: lib
    });

    const later = vi.fn();
    node.onReady(later);
    expect(later).toHaveBeenCalledTimes(1);
  });

  it('runs onFrame callbacks and stops the render loop', () => {
    const { lib, renderers } = createFakeThree();
    const frames = createFrameQueue();
    const onFrame = vi.fn();
    const node = vThree({
      height: '300px',
      onFrame,
      threeLib: lib,
      width: '600px'
    }).bindTo(document.body);

    frames.shift()();
    const renderer = renderers[0];
    const renderCalls = renderer.render.mock.calls.length;

    frames.shift()();
    expect(onFrame).toHaveBeenCalledTimes(1);
    expect(renderer.render.mock.calls.length).toBe(renderCalls + 1);
    expect(onFrame.mock.calls[0][0].renderer).toBe(renderer);

    node.stop();
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('reports resize through onResize callbacks', () => {
    const { lib, renderers } = createFakeThree();
    const frames = createFrameQueue();
    const onResize = vi.fn();
    const node = vThree({
      autoRender: false,
      height: '300px',
      onResize,
      threeLib: lib,
      width: '600px'
    }).bindTo(document.body);

    frames.shift()();
    node.resize();

    expect(onResize).toHaveBeenLastCalledWith({ height: 300, width: 600 });
    expect(renderers[0].setSize).toHaveBeenLastCalledWith(600, 300);
  });

  it('keeps toHTML server-safe without initializing WebGL', () => {
    const { lib, renderers } = createFakeThree();
    const html = vThree({ height: '300px', threeLib: lib }).toHTML();

    expect(renderers).toHaveLength(0);
    expect(html).toContain('yoya-vthree');
    expect(html).not.toContain('<canvas');
  });
});
