import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { div } from '@yoyaflow/yoya-core';

let frameQueue = [];
let frameId = 0;

/** 把 rAF 换成手动队列，测试里精确控制每一帧。 */
function takeNextFrame() {
  const next = frameQueue.shift();
  next?.callback(next.id);
  return next;
}

beforeEach(() => {
  frameQueue = [];
  frameId = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
    frameId += 1;
    frameQueue.push({ callback, id: frameId });
    return frameId;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation((handle) => {
    frameQueue = frameQueue.filter((entry) => entry.id !== handle);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('animation frame bindings', () => {
  it('runs a single frame callback once and only once', () => {
    const node = div('内容');
    const callback = vi.fn();

    node.bindAnimationFrame(callback);
    expect(frameQueue).toHaveLength(1);
    expect(callback).not.toHaveBeenCalled();

    takeNextFrame();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(frameQueue).toHaveLength(0);
  });

  it('cancels a pending frame when the node is destroyed', () => {
    const node = div('内容');
    const callback = vi.fn();

    node.bindAnimationFrame(callback);
    node.destroy();

    expect(frameQueue).toHaveLength(0);
    expect(callback).not.toHaveBeenCalled();
  });

  it('loops every frame and stops on destroy', () => {
    const node = div('内容');
    const callback = vi.fn();

    node.bindAnimationFrameLoop(callback);
    takeNextFrame();
    expect(callback).toHaveBeenCalledTimes(1);
    expect(frameQueue).toHaveLength(1);

    takeNextFrame();
    expect(callback).toHaveBeenCalledTimes(2);

    node.destroy();
    expect(frameQueue).toHaveLength(0);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('stops the loop on demand and can start it again', () => {
    const node = div('内容');
    const callback = vi.fn();

    node.bindAnimationFrameLoop(callback);
    node.stopAnimationFrameLoop();
    expect(frameQueue).toHaveLength(0);

    node.bindAnimationFrameLoop(callback);
    takeNextFrame();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('stops the loop when the callback calls stopAnimationFrameLoop()', () => {
    const node = div('内容');
    const callback = vi.fn(() => node.stopAnimationFrameLoop());

    node.bindAnimationFrameLoop(callback);
    takeNextFrame();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(frameQueue).toHaveLength(0);
  });

  it('keeps one loop per node: re-binding restarts it', () => {
    const node = div('内容');
    const first = vi.fn();
    const second = vi.fn();

    node.bindAnimationFrameLoop(first);
    node.bindAnimationFrameLoop(second);
    expect(frameQueue).toHaveLength(1);

    takeNextFrame();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    expect(frameQueue).toHaveLength(1);
  });

  it('rejects non-function callbacks', () => {
    const node = div('内容');

    expect(() => node.bindAnimationFrame(null)).toThrow(/requires a function/);
    expect(() => node.bindAnimationFrameLoop('nope')).toThrow(/requires a function/);
  });

  it('is a no-op outside the browser', () => {
    const node = div('内容');
    const callback = vi.fn();

    vi.stubGlobal('requestAnimationFrame', undefined);

    expect(() => node.bindAnimationFrame(callback).bindAnimationFrameLoop(callback)).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
    expect(frameQueue).toHaveLength(0);
  });
});
