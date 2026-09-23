import { bindDocumentEvent } from '../core/document-events.js';
import { vNode } from '../core/v-node.js';
import { button as buttonTag, div, img } from '../html/index.js';
import { createComponentShortcut, isPlainObject } from '../components/shared.js';
import { vLazyImage } from '../async/lazy-image.js';

const MAX_ZOOM = 5;

/**
 * 图片预览（形态 B，票 15 §4）：视图根是缩略图容器 `div`，「打开」时把浮层绑到 `document.body`。
 *
 * - 身份写在结构里：根 `vn: 'VImagePreview'`；浮层那几个部件自带身份
 *   （`VImagePreviewOverlay` / `Stage` / `Close` / `Tool` / `Toolbar` / `Backdrop`）；
 * - 状态与命令收进 `vNode` 闭包（`src` / `thumb` / `alt` / `zoom` / `resetZoom` / `previewState` /
 *   `open` / `close` / `toggle`）；浮层按需建、关闭即销毁（与旧实现同口径）；
 * - 元素级时机：旧 `destroy()` 里的收尾（关浮层 + 解绑 Esc / 拖拽监听）改 `whenDestroy`；
 * - props 分派：`alt` / `thumb` / `src` 走命令，其余按元素 options 写；字符串 = 图片 src
 *   （旧实现里字符串被静默忽略，这一刀明确成 src）。
 */
export function VImagePreview() {
  return vNode((api) => {
    const state = {
      alt: '',
      drag: null,
      escHandler: null,
      escUnbind: null,
      lazy: null,
      open: false,
      overlay: null,
      panX: 0,
      panY: 0,
      src: null,
      stage: null,
      thumb: null,
      zoom: 1
    };
    let panMove = null;
    let panMoveUnbind = null;
    let panEnd = null;
    let panEndUnbind = null;

    const thumbImg = img({ loading: 'lazy' });
    const node = div({ vn: 'VImagePreview' }).attr({ 'data-open': null }).styles({
      boxSizing: 'border-box',
      cursor: 'zoom-in',
      display: 'inline-block',
      lineHeight: '0'
    });

    node.child(thumbImg);
    node.on('click', () => api.open());

    const syncThumb = () => {
      thumbImg.attr('src', state.thumb || state.src);
      thumbImg.attr('alt', state.alt || null);
    };

    const syncStage = () => {
      if (!state.stage) {
        return;
      }

      state.stage.style(
        'transform',
        `scale(${state.zoom}) translate(${state.panX}px, ${state.panY}px)`
      );
    };

    const endPan = () => {
      state.drag = null;

      if (panMove) {
        panMoveUnbind?.();
        panMove = null;
        panMoveUnbind = null;
      }
      if (panEnd) {
        panEndUnbind?.();
        panEnd = null;
        panEndUnbind = null;
      }
    };

    const panMoveHandler = (event) => {
      if (!state.drag) {
        return;
      }

      state.panX = state.drag.panX + (event.clientX - state.drag.startX);
      state.panY = state.drag.panY + (event.clientY - state.drag.startY);
      syncStage();
    };

    const startPan = (event) => {
      if (state.zoom <= 1) {
        return;
      }

      state.drag = {
        panX: state.panX,
        panY: state.panY,
        startX: event.clientX,
        startY: event.clientY
      };
      panMove = (moveEvent) => panMoveHandler(moveEvent);
      panEnd = () => endPan();
      panMoveUnbind = bindDocumentEvent('mousemove', panMove);
      panEndUnbind = bindDocumentEvent('mouseup', panEnd);
    };

    const buildOverlay = () => {
      // 跨模块只用组件入口（`vLazyImage`），不再 new 节点类型
      const lazy = vLazyImage({ alt: state.alt, src: state.src });

      state.lazy = lazy;

      const stage = div({ vn: 'VImagePreviewStage' })
        .styles({
          display: 'flex',
          maxHeight: '86vh',
          maxWidth: '90vw',
          position: 'relative'
        })
        .child(lazy);

      stage.on('mousedown', (event) => startPan(event));
      state.stage = stage;

      const closeButton = buttonTag({ vn: 'VImagePreviewClose' })
        .attr({ 'aria-label': '关闭预览', type: 'button' })
        .child('×')
        .on('click', () => api.close());

      const zoomOut = buttonTag({ vn: 'VImagePreviewTool' })
        .attr({ 'aria-label': '缩小', type: 'button' })
        .child('−')
        .on('click', () => api.zoom(state.zoom - 0.5));
      const zoomReset = buttonTag({ vn: 'VImagePreviewTool' })
        .attr({ 'aria-label': '重置缩放', type: 'button' })
        .child('1:1')
        .on('click', () => api.resetZoom());
      const zoomIn = buttonTag({ vn: 'VImagePreviewTool' })
        .attr({ 'aria-label': '放大', type: 'button' })
        .child('＋')
        .on('click', () => api.zoom(state.zoom + 0.5));

      const toolbar = div({ vn: 'VImagePreviewToolbar' }).child(zoomOut, zoomReset, zoomIn);
      const backdrop = div({ vn: 'VImagePreviewBackdrop' }).on('click', () => api.close());
      const overlay = div({ vn: 'VImagePreviewOverlay' })
        .styles({
          alignItems: 'center',
          display: 'flex',
          inset: '0',
          justifyContent: 'center',
          position: 'fixed',
          zIndex: '1000'
        })
        .child(backdrop, stage, closeButton, toolbar);

      state.overlay = overlay;
      overlay.bindTo(document.body);
      syncStage();
    };

    api.src = (value) => {
      if (value === undefined) {
        return state.src;
      }

      state.src = value === null || value === undefined ? null : String(value);
      syncThumb();
      if (state.open && state.lazy) {
        state.lazy.src(state.src);
      }
      return api;
    };

    api.thumb = (value) => {
      if (value === undefined) {
        return state.thumb;
      }

      state.thumb = value === null || value === undefined ? null : String(value);
      syncThumb();
      return api;
    };

    api.alt = (value) => {
      if (value === undefined) {
        return state.alt;
      }

      state.alt = String(value ?? '');
      syncThumb();
      if (state.open && state.lazy) {
        state.lazy.alt(state.alt);
      }
      return api;
    };

    api.zoom = (value) => {
      if (value === undefined) {
        return state.zoom;
      }

      const parsed = Number(value);

      state.zoom = Number.isFinite(parsed) ? Math.min(MAX_ZOOM, Math.max(1, parsed)) : 1;
      if (state.zoom === 1) {
        state.panX = 0;
        state.panY = 0;
      }
      syncStage();
      return api;
    };

    api.resetZoom = () => {
      state.zoom = 1;
      state.panX = 0;
      state.panY = 0;
      syncStage();
      return api;
    };

    /** 当前预览状态：open / closed。 */
    api.previewState = () => (state.open ? 'open' : 'closed');

    api.open = () => {
      if (state.open || !state.src || !node._el) {
        return api;
      }

      state.open = true;
      node.attr('data-open', 'true');
      buildOverlay();
      state.escHandler = (event) => {
        if (event.key === 'Escape') {
          api.close();
        }
      };
      state.escUnbind = bindDocumentEvent('keydown', state.escHandler);
      return api;
    };

    api.close = () => {
      if (!state.open) {
        return api;
      }

      state.open = false;
      node.attr('data-open', null);
      endPan();

      if (state.escHandler) {
        state.escUnbind?.();
        state.escHandler = null;
        state.escUnbind = null;
      }
      if (state.overlay) {
        state.overlay.destroy();
        state.overlay = null;
      }
      state.stage = null;
      state.lazy = null;
      return api;
    };

    api.toggle = () => (state.open ? api.close() : api.open());

    /** 字符串 = 图片 src（旧实现里字符串被静默忽略，这一刀明确成 src）。 */
    api.setupString = (next) => api.src(next);

    /** props：`alt` / `thumb` / `src` 走命令，其余按元素 options 写（与旧 `_setupImagePreview` 同口径）。 */
    api.setupObject = (setup) => {
      if (!isPlainObject(setup)) {
        return api;
      }

      const { alt, src, thumb, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        node.setup(elementConfig);
      }
      if (alt !== undefined) {
        api.alt(alt);
      }
      if (thumb !== undefined) {
        api.thumb(thumb);
      }
      if (src !== undefined) {
        api.src(src);
      }

      return api;
    };

    // 旧 `destroy()` 猴补的等价物：关浮层 + 解绑 Esc / 拖拽监听
    api.whenDestroy = () => {
      api.close();
    };

    syncThumb();
    return node;
  });
}

export const vImagePreview = createComponentShortcut(VImagePreview);
