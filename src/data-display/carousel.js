import { bindDocumentEvent } from '../core/document-events.js';
import { vNode } from '../core/v-node.js';
import { button, div } from '../html/index.js';
import { ArrowLeftOutlined, ArrowRightOutlined } from '../svg/icons.js';
import { createComponentShortcut } from '../components/shared.js';

/**
 * 走马灯（票 15 §4：**结构 + 身份 + 命令**，组件里没有元素节点类）。
 *
 * - 结构：`div[VCarousel] > div[VCarouselViewport]`；**视口的匿名占位**接轨道
 *   （`self.node().child(track)` 落进视口），轨道、箭头 `button[VCarouselArrow][data-dir]`、圆点容器
 *   `div[VCarouselDots]` 都由命令**按需建、建过复用**（它们不在视图里，命令要写 transform / disabled / 显隐）；
 * - 轨道自己是个组件：幻灯片是它的孩子、位移是它自己的 `transform`——命令写自己的节点，
 *   不去碰视图里的元素（16 号清单第 14 条）；
 * - 命令直接写快照；一处状态驱动多处 DOM（aria / 圆点 / 箭头 / 播放）时写口唯一收在 `writeView()`；
 * - 文档级滑动收口走 `bindDocumentEvent`，定时器与解绑统一在 `whenDestroy` 里收。
 */

const SWIPE_THRESHOLD = 40;
const DEFAULT_INTERVAL = 3500;

/** 幻灯片（形态 A）。 */
function CarouselSlide() {
  return div({ 'aria-roledescription': 'slide', role: 'group', vn: 'VCarouselSlide' });
}

/** 圆点（形态 A）。 */
function CarouselDot() {
  return button({ role: 'tab', tabindex: '-1', type: 'button', vn: 'VCarouselDot' });
}

/**
 * 轨道（形态 B）：幻灯片是它的孩子、位移是它自己的 `transform`。
 * 容器把它交给视口占位，之后只调它的命令（`index` / `slides`）。
 */
function CarouselTrack() {
  return vNode((api, self) => {
    let slides = [];

    /** 幻灯片：造一批新片、收掉旧的（片进轨道自己）。 */
    api.slides = (items, render) => {
      slides.forEach((slide) => slide.destroy());
      slides = items.map((item, index) => {
        const slide = CarouselSlide();
        const content = render ? render(item, index) : item;

        if (content !== null && content !== undefined) {
          slide.child(content);
        }

        self.node().child(slide);
        return slide;
      });

      return api;
    };

    /** 位移 + 每片的 aria 计数：轨道自己的快照。 */
    api.index = (index, count) => {
      self
        .node()
        .style(
          'transform',
          count > 0 ? (index === 0 ? 'translateX(0%)' : `translateX(-${index * 100}%)`) : null
        );
      slides.forEach((slide, slideIndex) => {
        slide.attr('aria-label', `${slideIndex + 1} / ${count}`);
      });
      return api;
    };

    return div({ vn: 'VCarouselTrack' });
  });
}

const carouselTrack = createComponentShortcut(CarouselTrack);

/**
 * 走马灯：`items / renderItem` 出幻灯片，`active / goTo / next / prev / loop` 控制当前项，
 * `autoplay / interval` 控制自动播放，`arrows / dots / height` 控制外壳。
 * 对象 = props，字符串 / 数字 = 一张幻灯片，函数 = 构建回调（默认落组件节点构建帧）。
 */
export function VCarousel() {
  return vNode((api, self) => {
    const state = {
      activeIndex: 0,
      arrows: true,
      autoplay: false,
      dots: true,
      height: null,
      interval: DEFAULT_INTERVAL,
      items: [],
      loop: true,
      paused: false,
      renderItem: null,
      timer: null
    };

    let prevButton = null;
    let nextButton = null;
    let dotsBox = null;
    let trackPart = null;
    let dots = [];
    let swipeStart = null;

    /** 轨道：用到才建、建过复用（交给视口匿名占位）。 */
    const trackOf = () => {
      if (!trackPart) {
        trackPart = carouselTrack();
        self.node().child(trackPart);
      }

      return trackPart;
    };

    /** 箭头：用到才建、建过复用（不在视图里）。 */
    const arrowsOf = () => {
      if (!prevButton) {
        prevButton = button({
          'aria-label': '上一项',
          'data-dir': 'prev',
          type: 'button',
          vn: 'VCarouselArrow'
        }).child(ArrowLeftOutlined());
        prevButton.on('click', () => api.prev());

        nextButton = button({
          'aria-label': '下一项',
          'data-dir': 'next',
          type: 'button',
          vn: 'VCarouselArrow'
        }).child(ArrowRightOutlined());
        nextButton.on('click', () => api.next());

        self.node().child(prevButton, nextButton);
      }

      return { next: nextButton, prev: prevButton };
    };

    /** 圆点容器：用到才建、建过复用（不在视图里）。 */
    const dotsOf = () => {
      if (!dotsBox) {
        dotsBox = div({ 'aria-label': '轮播指示', role: 'tablist', vn: 'VCarouselDots' });
        self.node().child(dotsBox);
      }

      return dotsBox;
    };

    /** 圆点：一项一个，点哪张跳哪张。 */
    const writeDots = () => {
      dots.forEach((dot) => dot.destroy());
      dots = state.items.map((_, index) => {
        const dot = CarouselDot();

        dot.on('click', () => api.active(index));
        dotsOf().child(dot);
        return dot;
      });
      return api;
    };

    /**
     * 写这一份快照：容器 aria / 计数 / 轨道位移 / 圆点选中态 / 箭头可用性 / 播放状态。
     * 一处状态驱动多处 DOM，写口收在一个地方——不然会出现"改一半"的中间态。
     */
    const writeView = (emit = false) => {
      const count = state.items.length;
      const index = state.activeIndex;
      const { next, prev } = arrowsOf();

      self.node().attr({
        'aria-label': `走马灯，第 ${index + 1} / ${count} 项`,
        'data-active': String(index),
        'data-count': String(count)
      });
      trackOf().index(index, count);

      dots.forEach((dot, dotIndex) => {
        dot.attr('aria-selected', dotIndex === index ? 'true' : null);
        dot.attr('tabindex', dotIndex === index ? '0' : '-1');
      });

      const canPrev = count > 1 && (state.loop || index > 0);
      const canNext = count > 1 && (state.loop || index < count - 1);

      prev.attr({ 'aria-disabled': canPrev ? null : 'true', disabled: canPrev ? null : true });
      next.attr({ 'aria-disabled': canNext ? null : 'true', disabled: canNext ? null : true });
      prev.style('display', state.arrows ? null : 'none');
      next.style('display', state.arrows ? null : 'none');
      dotsOf().style('display', state.dots ? null : 'none');

      if (state.autoplay && !state.paused && count > 1) {
        startTimer();
      } else {
        clearTimer();
      }

      if (emit) {
        const element = self.node().renderDom();

        element?.dispatchEvent?.(
          new CustomEvent('change', { bubbles: false, detail: { count, index } })
        );
      }

      return api;
    };

    const clearTimer = () => {
      if (state.timer) {
        clearInterval(state.timer);
        state.timer = null;
      }
    };

    const startTimer = () => {
      if (state.timer || !state.autoplay || state.paused || state.items.length < 2) {
        return;
      }

      state.timer = setInterval(() => api.next(), state.interval);
    };

    const pause = () => {
      if (!state.autoplay) {
        return;
      }

      state.paused = true;
      self.node().attr('data-paused', 'true');
      clearTimer();
    };

    const resume = () => {
      if (!state.autoplay) {
        return;
      }

      state.paused = false;
      self.node().attr('data-paused', null);
      startTimer();
    };

    const resolvePoint = (event) => {
      const touch = event.touches?.[0] ?? event.changedTouches?.[0];
      const x = touch?.clientX ?? event.clientX;
      const y = touch?.clientY ?? event.clientY;

      if (typeof x !== 'number' || typeof y !== 'number') {
        return null;
      }

      return { x, y };
    };

    const swipeDown = (event) => {
      if (swipeStart) {
        return;
      }

      const point = resolvePoint(event);

      if (!point) {
        return;
      }

      swipeStart = point;
      pause();
    };

    const swipeUp = (event) => {
      if (!swipeStart) {
        return;
      }

      const point = resolvePoint(event);
      const start = swipeStart;
      swipeStart = null;
      resume();

      if (!point) {
        return;
      }

      const deltaX = point.x - start.x;
      const deltaY = point.y - start.y;

      if (Math.abs(deltaX) < SWIPE_THRESHOLD || Math.abs(deltaX) <= Math.abs(deltaY)) {
        return;
      }

      if (deltaX < 0) {
        api.next();
      } else {
        api.prev();
      }
    };

    const handleKeydown = (event) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        api.prev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        api.next();
      } else if (event.key === 'Home') {
        event.preventDefault();
        api.active(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        api.active(state.items.length - 1);
      }
    };

    api.slides = (value, render = null) => {
      if (value === undefined) {
        return state.items.slice();
      }

      if (typeof render === 'function') {
        state.renderItem = render;
      }

      state.items = Array.isArray(value) ? value.slice() : [value];
      state.activeIndex = 0;
      trackOf().slides(state.items, state.renderItem);
      writeDots();
      return writeView();
    };

    api.items = (value, render = null) =>
      value === undefined ? api.slides() : api.slides(value, render);

    api.renderItem = (handler) => {
      if (handler === undefined) {
        return state.renderItem;
      }

      state.renderItem = typeof handler === 'function' ? handler : null;

      if (state.items.length > 0) {
        trackOf().slides(state.items, state.renderItem);
      }

      return api;
    };

    api.active = (value) => {
      if (value === undefined) {
        return state.activeIndex;
      }

      const count = state.items.length;
      let nextIndex = Math.floor(Number(value));

      if (!Number.isFinite(nextIndex)) {
        nextIndex = 0;
      }

      if (count === 0) {
        state.activeIndex = 0;
        return writeView();
      }

      state.activeIndex = state.loop
        ? ((nextIndex % count) + count) % count
        : Math.max(0, Math.min(count - 1, nextIndex));
      return writeView(true);
    };

    api.goTo = (value) => api.active(value);

    api.next = () => {
      if (state.items.length === 0) {
        return api;
      }

      return api.active(
        state.loop ? state.activeIndex + 1 : Math.min(state.activeIndex + 1, state.items.length - 1)
      );
    };

    api.prev = () => {
      if (state.items.length === 0) {
        return api;
      }

      return api.active(state.loop ? state.activeIndex - 1 : Math.max(0, state.activeIndex - 1));
    };

    api.loop = (value) => {
      if (value === undefined) {
        return state.loop;
      }

      state.loop = Boolean(value);
      self.node().attr('data-loop', state.loop ? 'true' : null);
      return writeView();
    };

    api.autoplay = (value) => {
      if (value === undefined) {
        return state.autoplay;
      }

      state.autoplay = Boolean(value);
      self.node().attr('data-autoplay', state.autoplay ? 'true' : null);
      return writeView();
    };

    api.start = () => api.autoplay(true);
    api.stop = () => api.autoplay(false);

    api.interval = (value) => {
      if (value === undefined) {
        return state.interval;
      }

      const parsed = Number(value);
      state.interval = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_INTERVAL;

      if (state.autoplay) {
        clearTimer();
        startTimer();
      }

      return api;
    };

    api.arrows = (value) => {
      if (value === undefined) {
        return state.arrows;
      }

      state.arrows = Boolean(value);
      self.node().attr('data-arrows', state.arrows ? 'true' : null);
      return writeView();
    };

    api.dots = (value) => {
      if (value === undefined) {
        return state.dots;
      }

      state.dots = Boolean(value);
      self.node().attr('data-dots', state.dots ? 'true' : null);
      return writeView();
    };

    api.height = (value) => {
      if (value === undefined) {
        return state.height;
      }

      state.height = value || null;
      self.node().style('height', state.height);
      self.node().style('minHeight', state.height);
      return api;
    };

    /** props：`slides / items / children / renderItem / active / loop / autoplay / interval / arrows / dots / height`。 */
    api.setupObject = (config) => {
      const {
        active,
        arrows,
        autoplay,
        children,
        dots,
        height,
        interval,
        items,
        loop,
        renderItem,
        slides,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        self.node().setup(elementConfig);
      }

      if (renderItem !== undefined) {
        api.renderItem(renderItem);
      }

      const slideSetup = slides ?? items ?? children;

      if (slideSetup !== undefined) {
        api.slides(slideSetup);
      }

      if (active !== undefined) {
        api.active(active);
      }

      if (loop !== undefined) {
        api.loop(loop);
      }

      if (autoplay !== undefined) {
        api.autoplay(autoplay);
      }

      if (interval !== undefined) {
        api.interval(interval);
      }

      if (arrows !== undefined) {
        api.arrows(arrows);
      }

      if (dots !== undefined) {
        api.dots(dots);
      }

      if (height !== undefined) {
        api.height(height);
      }

      return api;
    };

    /** 字符串 / 数字 = 一张幻灯片。 */
    api.setupString = (value) => api.slides(value);

    // 文档级滑动：不依赖落地时机（与旧实现同为渲染前绑、销毁时解）
    const unbindSwipe = [
      bindDocumentEvent('pointerup', swipeUp),
      bindDocumentEvent('mouseup', swipeUp),
      bindDocumentEvent('touchend', swipeUp)
    ];

    api.whenDestroy = () => {
      clearTimer();
      unbindSwipe.forEach((unbind) => unbind());
    };

    // 结构里就带默认快照（命令只覆盖自己那一项）；轨道的匿名占位接幻灯片
    return div(
      {
        'aria-label': '走马灯，第 1 / 0 项',
        'aria-roledescription': 'carousel',
        'data-active': '0',
        'data-count': '0',
        'data-loop': 'true',
        role: 'region',
        style: {
          boxSizing: 'border-box',
          display: 'grid',
          gridTemplateRows: 'minmax(0, 1fr) auto',
          minWidth: '0',
          position: 'relative'
        },
        tabindex: '0',
        vn: 'VCarousel'
      },
      (root) => {
        root.on('keydown', handleKeydown);
        root.on('mouseenter', pause);
        root.on('mouseleave', resume);
        root.on('focusin', pause);
        root.on('focusout', (event) => {
          if (!event.relatedTarget || !event.currentTarget?.contains(event.relatedTarget)) {
            resume();
          }
        });
        root.child(
          // 视口是匿名占位：轨道由命令造好后落进来
          div({ vn: 'VCarouselViewport', vn_slot: '' }, (viewport) => {
            viewport
              .style('touchAction', 'pan-y')
              .on('pointerdown', swipeDown)
              .on('mousedown', swipeDown)
              .on('touchstart', swipeDown);
          })
        );
      }
    );
  });
}

export const vCarousel = createComponentShortcut(VCarousel);
