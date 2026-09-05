import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buttonDemoDefinitions } from './button-docs.js';
import { ComponentSource, componentSource } from './component-source.js';
import { applyDemoStyles } from './demo-styles.js';
import { renderExamplesIndex } from './index.router.js';

let root = null;

async function openRoute(path) {
  const item =
    document.querySelector(`[data-node-id="${path}"]`) ||
    document.querySelector(`[data-component-path="${path}"]`);
  if (item) {
    item.click();
  } else {
    window.history.replaceState(null, '', `#${path}`);
    window.dispatchEvent(new Event('hashchange'));
  }

  await vi.waitFor(
    () => {
      const content = document.querySelector('.yoya-vrouter-views-content');
      if (!content || content.textContent === '加载中…') {
        throw new Error(`路由 ${path} 仍在加载中`);
      }
    },
    { timeout: 5000 }
  );
  return item;
}

function selectedRouteTitle() {
  return document.querySelector('.yoya-vrouter-views-label[aria-selected="true"]')?.textContent;
}

beforeEach(() => {
  document.body.innerHTML = '<main id="app"></main>';
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  root?.destroy?.();
  root = null;
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

describe('renderExamplesIndex', () => {
  it('groups yoya-ui imports into one import statement in source panels', () => {
    const source = componentSource(() => null, ['div', 'vText']);

    expect(source).toContain("import { div, vText } from 'yoya-ui';");
    expect(source).not.toContain("import { div } from 'yoya-ui';");
  });

  it('keeps example styles inside the component module instead of Index.html', () => {
    const html = readFileSync('./src/examples/Index.html', 'utf8');

    expect(html).not.toContain('<style');
    expect(html).toContain('<main id="app"></main>');
  });

  it('uses the same component for each button demo and its source', () => {
    expect(buttonDemoDefinitions).toHaveLength(5);
    buttonDemoDefinitions.forEach((demo) => {
      expect(demo.component).toBe(demo.sourceComponent);
    });
  });

  it('keeps router demos as standalone iframe pages', () => {
    const pages = {
      'anchor.html': 'AnchorStandaloneDemo',
      'declarative-router.html': 'DeclarativeRouterCard',
      'router-history.html': 'RouterHistoryCard',
      'router-async.html': 'RouterAsyncCard',
      'router-links.html': 'RouterNavigationCard',
      'router-params.html': 'RouterParamsCard',
      'router-views-top.html': 'RouterViewsTopStandalone',
      'router-views.html': 'RouterViewsEditorStandalone'
    };

    Object.entries(pages).forEach(([file, component]) => {
      const html = readFileSync(`./src/examples/${file}`, 'utf8');
      expect(html).toContain(component);
      expect(html).toContain('.render().bindTo');
      expect(html).not.toContain('components-demo-shell');
      expect(html).not.toContain('index.router.js');
    });
  });

  it('keeps outer workspace styles when applying demo styles inside a frame', () => {
    const outer = document.createElement('section');
    const child = document.createElement('div');
    outer.className = 'components-workspace';
    outer.appendChild(child);
    document.body.appendChild(outer);

    applyDemoStyles(outer);
    expect(outer.style.display).toBe('flex');
    expect(outer.style.height).toBe('100%');

    applyDemoStyles(child);
    expect(outer.style.display).toBe('flex');
    expect(outer.style.height).toBe('100%');

    outer.remove();
  });

  it('renders the menu workspace and overview page', () => {
    root = renderExamplesIndex('#app');

    expect(document.querySelector('[data-components-demo-shell]')).not.toBeNull();
    expect(document.querySelector('[data-components-top-nav]')).not.toBeNull();
    expect(document.querySelector('.components-demo-shell').style.display).toBe('grid');
    expect(document.querySelector('.components-demo-shell').style.gap).toBe('0px');
    expect(document.querySelector('.components-demo-shell').style.background).toBe('');
    expect(document.querySelector('.components-demo-shell').style.height).toContain('100');
    expect(document.querySelector('[data-components-top-nav]').style.position).toBe('sticky');
    expect(document.querySelector('[data-components-top-nav]').style.background).toBe('');
    expect(document.querySelector('[data-components-top-nav]').style.minHeight).toBe('');
    expect(document.querySelector('[data-components-menu]').style.borderRadius).toBe('');
    expect(document.querySelector('[data-components-menu]').style.background).toBe('');
    expect(document.querySelector('[data-components-menu]').style.overflow).toBe('auto');
    expect(document.querySelector('[data-components-menu]').style.height).toBe('100%');
    expect(document.querySelector('[data-components-menu]').style.scrollbarWidth).toBe('');
    expect(document.head.querySelector('[data-demo-menu-scrollbar-style]')).toBeNull();
    expect(document.querySelector('[data-components-router-views]').style.overflow).toBe('auto');
    expect(document.querySelector('[data-components-router-views]').style.height).toBe('100%');
    expect(document.querySelector('.yoya-vrouter-views').dataset.titleLocked).toBe('true');
    expect(document.querySelector('.yoya-vrouter-views-content').style.overflow).toBe('auto');
    expect(document.querySelector('.components-workspace')).not.toBeNull();
    expect(document.querySelector('.yoya-vsplit-panel')).not.toBeNull();
    expect(document.querySelector('[data-components-menu]')).not.toBeNull();
    expect(document.querySelector('[data-components-router-views]')).not.toBeNull();
    expect(document.querySelector('.components-route-page--overview')).not.toBeNull();
    expect(document.querySelector('[data-overview-page]')).not.toBeNull();
    expect(document.querySelectorAll('.components-overview-grid')).toHaveLength(3);
    expect(document.querySelectorAll('[data-overview-principle]')).toHaveLength(3);
    expect(document.querySelectorAll('[data-overview-category]')).toHaveLength(13);
    expect(document.querySelectorAll('[data-overview-guide]')).toHaveLength(6);
    expect(document.querySelector('[data-components-menu] .components-menu-tree')).not.toBeNull();
    expect(document.querySelector('[data-components-menu] .yoya-vtree')).not.toBeNull();
    expect(document.querySelector('[data-components-menu] [data-node-id="guides"]')).not.toBeNull();
    expect(
      document.querySelector('[data-components-menu] [data-node-id="guides"]').textContent
    ).toContain('开发指南');
    expect(
      document.querySelector('[data-components-menu] [data-node-id="/components/guides/overview"]')
    ).not.toBeNull();
    expect(
      document.querySelector('[data-components-menu] [data-node-id="/components/layout/mobile"]')
    ).toBeNull();
    expect(document.querySelectorAll('[data-component-status="planned"]')).toHaveLength(0);
    expect(selectedRouteTitle()).toBe('概述');
  });

  it('provides a theme mode switch in the top navigation that persists the mode', async () => {
    root = renderExamplesIndex('#app');

    const switchGroup = document.querySelector('[data-components-top-nav]');
    expect(switchGroup.querySelector("[data-theme-mode='light']")).toBeTruthy();
    expect(switchGroup.querySelector("[data-theme-mode='dark']")).toBeTruthy();
    expect(switchGroup.querySelector("[data-theme-mode='system']")).toBeTruthy();

    switchGroup.querySelector("[data-theme-mode='dark']").click();

    expect(document.documentElement.dataset.yoyaMode).toBe('dark');
    expect(localStorage.getItem('yoya-theme-mode')).toBe('dark');

    delete document.documentElement.dataset.yoyaMode;
    localStorage.clear();
  });
  it('navigates and highlights the top navigation when a category is selected', async () => {
    root = renderExamplesIndex('#app');

    const navItems = document.querySelectorAll('[data-components-top-nav] [data-top-nav-item]');
    expect(navItems).toHaveLength(14);
    expect(
      document.querySelector('[data-top-nav-item="overview"]').getAttribute('aria-current')
    ).toBe('page');

    const layoutItem = document.querySelector('[data-top-nav-item="layout"]');
    expect(layoutItem.getAttribute('data-top-nav-path')).toBe('/components/layout/divider');

    layoutItem.click();

    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('分割线');
    });

    expect(
      document.querySelector('[data-top-nav-item="overview"]').getAttribute('aria-current')
    ).toBe(null);
    expect(layoutItem.getAttribute('aria-current')).toBe('page');
  });

  it('clears previous active states when navigating between menu items', async () => {
    root = renderExamplesIndex('#app');

    const layoutItem = document.querySelector('[data-top-nav-item="layout"]');
    const dataItem = document.querySelector('[data-top-nav-item="data-display"]');
    const dataPath = dataItem.getAttribute('data-top-nav-path');

    layoutItem.click();
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('分割线');
    });

    dataItem.click();
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('头像');
    });

    const activeTopItems = document.querySelectorAll(
      '[data-components-top-nav] .yoya-vmenu-item[data-active="true"]'
    );
    const activeMenuItems = document.querySelectorAll(
      '[data-components-menu] .yoya-vtree-node[aria-selected="true"]'
    );

    expect(activeTopItems).toHaveLength(1);
    expect(activeMenuItems).toHaveLength(1);
    expect(activeTopItems[0].getAttribute('data-top-nav-path')).toBe(dataPath);
    expect(activeMenuItems[0].getAttribute('data-node-id')).toBe('/components/data-display/avatar');
    expect(layoutItem.style.background).toBe('');
    expect(
      document
        .querySelector('[data-node-id="/components/layout/divider"]')
        .getAttribute('aria-selected')
    ).toBe('false');
  });

  it('renders the SVG icon library in a responsive grid', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/general/icons');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('图标');
    });

    const page = document.querySelector('[data-icons-page]');
    const grid = page.querySelector('[data-icons-grid]');
    const cells = grid.querySelectorAll('[data-icon-name]');
    const source = page.querySelector('.yoya-vcode-block .yoya-vcode-content');
    const copyButtons = grid.querySelectorAll('.components-icon-copy');
    const originalClipboard = navigator.clipboard;
    const writeText = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText }
    });

    expect(page.querySelector('h1').textContent).toBe('SVG 图标');
    expect(grid.style.gridTemplateColumns).toContain('minmax(200px, 1fr)');
    expect(cells.length).toBeGreaterThan(30);
    expect(Array.from(cells, (cell) => cell.dataset.iconName)).toContain('UploadOutlined');
    expect(cells[0].querySelector('svg').namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(cells[0].style.aspectRatio).toBe('1 / 1');
    expect(cells[0].style.gridTemplateRows).toContain('1fr');
    expect(cells[0].querySelector('.components-icon-symbol svg').style.width).toBe('40px');
    expect(cells[0].querySelector('.components-icon-symbol svg').style.height).toBe('40px');
    expect(cells[0].querySelector('strong').textContent).toBe('ArrowDownOutlined');
    expect(cells[0].querySelector('.components-icon-description').textContent).toBe('向下箭头');
    const sourceTrigger = cells[0].querySelector('.components-icon-source-trigger');
    expect(sourceTrigger.getAttribute('title')).toBe('源码定义');
    expect(sourceTrigger.getAttribute('aria-label')).toBe('查看源码定义');
    expect(sourceTrigger.querySelector('svg')).not.toBeNull();
    expect(sourceTrigger.style.position).toBe('absolute');
    expect(sourceTrigger.style.right).toBe('8px');
    expect(sourceTrigger.style.bottom).toBe('8px');
    expect(sourceTrigger.style.width).toBe('20px');
    expect(sourceTrigger.style.height).toBe('20px');
    expect(sourceTrigger.querySelector('svg').style.width).toBe('10px');
    expect(page.querySelector('[data-icons-source-section]')).not.toBeNull();
    expect(page.querySelector('[data-icons-api]')).not.toBeNull();
    expect(page.querySelector('[data-icons-api] table').textContent).toContain('SvgElementNode');
    expect(source.textContent).toContain('SearchOutlined');
    expect(copyButtons.length).toBe(cells.length);

    sourceTrigger.click();
    const dialog = page.querySelector('[data-icon-source-dialog]');
    expect(dialog.getAttribute('open')).not.toBeNull();
    expect(dialog.querySelector('.yoya-vcard')).not.toBeNull();
    expect(dialog.querySelector('.components-icon-source-dialog-title strong').textContent).toBe(
      '图标源码'
    );
    expect(dialog.querySelector('.components-icon-source-dialog-title span').textContent).toBe(
      'ArrowDownOutlined'
    );
    const dialogClose = dialog.querySelector('[aria-label="关闭"]');
    expect(dialogClose.tagName).toBe('BUTTON');
    expect(dialogClose.getAttribute('aria-label')).toBe('关闭');
    expect(dialogClose.style.width).toBe('28px');
    expect(dialogClose.style.height).toBe('28px');
    expect(dialogClose.style.borderWidth).toBe('0px');
    expect(dialog.querySelector('.components-icon-source-dialog-header').style.display).toBe(
      'flex'
    );
    expect(dialog.querySelector('.components-icon-source-dialog-code').textContent).toContain(
      'export function ArrowDownOutlined'
    );

    copyButtons[0].click();

    expect(writeText).toHaveBeenCalledWith(`${cells[0].dataset.iconName}()`);

    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard
    });
  });

  it('renders the standalone SVG animation demo page', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/general/svg');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('SVG 动画');
    });

    const page = document.querySelector('[data-svg-page]');
    expect(page.querySelector('h1').textContent).toBe('SVG 动画');
    const ringDemo = page.querySelector('[data-svg-demo="ring"]');
    expect(ringDemo).not.toBeNull();
    expect(ringDemo.querySelector('h2').textContent).toBe('可中断的环形进度');
    const ringLive = ringDemo.querySelector('[data-svg-demo-live]');
    const ring = ringLive.querySelector('svg [stroke-dasharray]');
    const fullOffset = Number(ring.getAttribute('stroke-dashoffset'));
    expect(fullOffset).toBeGreaterThan(0);
    expect(ringLive.querySelector('svg').namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(ringDemo.querySelector('[data-source-example]').textContent).toContain(
      'SvgProgressRingExample1'
    );
    const ringButtons = Array.from(ringLive.querySelectorAll('button'));
    const clickButton = (label) => {
      ringButtons.find((button) => button.textContent.trim() === label).click();
    };

    clickButton('25%');
    await vi.waitFor(
      () => {
        expect(Number(ring.getAttribute('stroke-dashoffset'))).toBeCloseTo(fullOffset * 0.75, 0);
      },
      { timeout: 3000 }
    );
    expect(ringLive.querySelector('svg text').textContent).toContain('25%');

    clickButton('70%');
    clickButton('40%');
    await vi.waitFor(
      () => {
        expect(Number(ring.getAttribute('stroke-dashoffset'))).toBeCloseTo(fullOffset * 0.6, 0);
      },
      { timeout: 3000 }
    );
    expect(ringLive.querySelector('svg text').textContent).toContain('40%');
  });

  it('renders the color picker docs page with favorites interaction', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/color-picker');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('颜色选择器');
    });

    const page = document.querySelector('[data-color-picker-docs]');
    expect(page.querySelector('h1').textContent).toBe('vColorPicker 颜色选择器');
    expect(page.querySelector('[data-color-picker-demo="basic"]')).not.toBeNull();
    expect(page.querySelector('[data-color-picker-demo="alpha"]')).not.toBeNull();

    const basicLive = page.querySelector('[data-color-picker-demo="basic"]');
    basicLive.querySelector('[data-vcolor-trigger]').click();
    basicLive.querySelector('[data-vcolor-palette] [data-vcolor-swatch="#3b82f6"]').click();
    expect(basicLive.querySelector('[data-color-picker-output]').textContent).toBe('#3b82f6');

    const alphaLive = page.querySelector('[data-color-picker-demo="alpha"]');
    const alphaInput = alphaLive.querySelector('[data-vcolor-alpha]');
    alphaInput.value = '50';
    alphaInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(alphaLive.querySelector('[data-color-picker-alpha-output]').textContent).toBe(
      'rgba(37, 99, 235, 0.5)'
    );
  });

  it.each([
    [
      '/components/form/slider',
      '滑动条',
      'slider',
      'vSlider 滑动条',
      'basic',
      'SliderBasicExample',
      'vSlider({'
    ],
    [
      '/components/form/cascader',
      '级联选择',
      'cascader',
      'vCascader 级联选择',
      'basic',
      'CascaderBasicExample',
      'vCascader({'
    ],
    [
      '/components/form/tags-input',
      '标签输入',
      'tags-input',
      'vTagsInput 标签输入',
      'basic',
      'TagsBasicExample',
      'vTagsInput({'
    ],
    [
      '/components/form/autocomplete',
      '自动完成',
      'autocomplete',
      'vAutocomplete 自动完成',
      'basic',
      'AutocompleteBasicExample',
      'vAutocomplete({'
    ]
  ])(
    'renders the %s form control docs page with live demos',
    async (path, routeTitle, docsKey, heading, firstDemoId, sourceName, sourceSnippet) => {
      root = renderExamplesIndex('#app');

      await openRoute(path);
      await vi.waitFor(() => {
        expect(selectedRouteTitle()).toBe(routeTitle);
      });

      const page = document.querySelector(`[data-form-docs="${docsKey}"]`);
      expect(page).not.toBeNull();
      expect(page.querySelector('h1').textContent).toBe(heading);

      const demo = page.querySelector(`[data-form-demo="${firstDemoId}"]`);
      expect(demo).not.toBeNull();
      const source = demo.querySelector('[data-source-example]');
      expect(source).not.toBeNull();
      expect(source.textContent).toContain(`export function ${sourceName}`);
      expect(source.textContent).toContain(sourceSnippet);
    }
  );

  it('interacts with the slider, cascader, tags and autocomplete live demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/slider');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('滑动条');
    });
    let page = document.querySelector('[data-form-docs="slider"]');
    const sliderLive = page.querySelector('[data-form-demo="basic"]');
    const sliderInput = sliderLive.querySelector('[data-vslider-input]');
    sliderInput.value = '85';
    sliderInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(sliderLive.querySelector('[data-slider-output]').textContent).toBe('85');

    const sliderStateLive = page.querySelector('[data-form-demo="state"]');
    const stateButtons = [...sliderStateLive.querySelectorAll('button')];
    const hideButton = stateButtons.find((button) => button.textContent.includes('隐藏数值'));
    const toggleButton = stateButtons.find((button) => button.textContent.includes('禁用'));
    hideButton.click();
    expect(sliderStateLive.querySelector('[data-vslider-input]').disabled).toBe(false);
    expect(sliderStateLive.querySelector('[data-vslider-value]').style.display).toBe('none');
    toggleButton.click();
    expect(sliderStateLive.querySelector('[data-vslider-input]').disabled).toBe(true);

    const verticalLive = page.querySelector('[data-form-demo="vertical"]');
    expect(verticalLive.querySelector('[data-vslider-input]').style.writingMode).toBe(
      'vertical-lr'
    );
    const verticalInput = verticalLive.querySelector('[data-vslider-input]');
    verticalInput.value = '35';
    verticalInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(verticalLive.querySelector('[data-slider-vertical-output]').textContent).toBe('35');

    await openRoute('/components/form/cascader');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('级联选择');
    });
    page = document.querySelector('[data-form-docs="cascader"]');
    const cascaderLive = page.querySelector('[data-form-demo="basic"]');
    cascaderLive.querySelector('[data-vcascader-trigger]').click();
    cascaderLive.querySelector('[data-vcascader-option="guangdong"]').click();
    cascaderLive.querySelector('[data-vcascader-option="shenzhen"]').click();
    expect(cascaderLive.querySelector('[data-cascader-output]').textContent).toBe(
      'guangdong / shenzhen'
    );

    const cascaderStateLive = page.querySelector('[data-form-demo="state"]');
    const cascaderButtons = [...cascaderStateLive.querySelectorAll('button')];
    cascaderButtons.find((button) => button.textContent.includes('回填广东')).click();
    expect(cascaderStateLive.querySelector('[data-vcascader-trigger]').textContent).toContain(
      '广东 / 深圳'
    );
    cascaderButtons.find((button) => button.textContent.includes('禁用')).click();
    expect(cascaderStateLive.querySelector('[data-vcascader-trigger]').disabled).toBe(true);

    await openRoute('/components/form/tags-input');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('标签输入');
    });
    page = document.querySelector('[data-form-docs="tags-input"]');
    const tagsLive = page.querySelector('[data-form-demo="basic"]');
    const tagsField = tagsLive.querySelector('[data-vtags-input]');
    tagsField.value = 'vue';
    tagsField.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    expect(tagsLive.querySelector('[data-tags-output]').textContent).toBe('vue');

    await openRoute('/components/form/autocomplete');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('自动完成');
    });
    page = document.querySelector('[data-form-docs="autocomplete"]');
    const acLive = page.querySelector('[data-form-demo="basic"]');
    const acField = acLive.querySelector('[data-vautocomplete-input]');
    acField.value = 'Vue';
    acField.dispatchEvent(new Event('input', { bubbles: true }));
    await vi.waitFor(() => {
      expect(acLive.querySelector('[data-vautocomplete-list]').style.display).not.toBe('none');
    });
    acLive
      .querySelector('[data-vautocomplete-list] [data-vautocomplete-option="Vue"]')
      .dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    expect(acLive.querySelector('[data-autocomplete-output]').textContent).toBe('Vue');
  });

  it('renders the split panel docs page with draggable dividers', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/layout/split-panel');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('分隔面板');
    });

    const page = document.querySelector('[data-component-route-item="layout:split-panel"]');
    expect(page.querySelector('[data-layout-demo="horizontal"]')).not.toBeNull();
    expect(page.querySelector('[data-layout-demo="vertical"]')).not.toBeNull();
    const divider = page.querySelector('[data-vsplit-divider]');
    expect(divider).not.toBeNull();
    expect(divider.getAttribute('role')).toBe('separator');
  });

  it('adjusts the responsive grid iframe width to demo auto column switching', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/layout/grid');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('栅格');
    });

    const page = document.querySelector('[data-component-route-item="layout:grid"]');
    const iframe = page.querySelector('[data-grid-responsive-frame]');
    expect(iframe).not.toBeNull();
    expect(iframe.getAttribute('src')).toBe('./grid-responsive.html');
    expect(iframe.style.width).toBe('768px');

    const slider = page.querySelector('[data-grid-responsive-width]');
    slider.value = '480';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(page.querySelector('[data-grid-responsive-width-text]').textContent).toBe('480px');
    expect(iframe.style.width).toBe('480px');

    page.querySelector('[data-grid-responsive-preset="1100"]').click();
    expect(iframe.style.width).toBe('1100px');
  });

  it('renders the file upload demo page with live component and source', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/upload');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('文件上传');
    });

    const page = document.querySelector('[data-component-route-item="form:upload"]');
    expect(page.querySelector('.yoya-vupload')).not.toBeNull();
    expect(page.querySelector('[data-source-example]').textContent).toContain('UploadExample1');
  });

  it('renders the rating demo page with live component and source', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/rate');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('评分');
    });

    const page = document.querySelector('[data-component-route-item="form:rate"]');
    expect(page.querySelector('.yoya-vrate')).not.toBeNull();
    expect(page.querySelector('[data-source-example]').textContent).toContain('RateExample1');
  });

  it('renders the digital board demo page with live component and source', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/board/digital-board');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('数字看板');
    });

    const page = document.querySelector('[data-component-route-item="board:digital-board"]');
    expect(page.querySelector('.yoya-vdigital-board')).not.toBeNull();
    expect(page.querySelectorAll('.yoya-vdigital-board-item').length).toBeGreaterThan(0);
    expect(page.querySelector('[data-source-example]').textContent).toContain('DigitalBoardDemo');
  });
  it('renders the dashboard family demo pages', async () => {
    root = renderExamplesIndex('#app');

    const cases = [
      ['/components/board/trend-card', 'yoya-vtrend-card', 'TrendCardDemo'],
      ['/components/board/sparkline', 'yoya-vsparkline', 'SparklineDemo'],
      ['/components/board/ring-stat', 'yoya-vring-stat', 'RingStatDemo'],
      ['/components/board/gauge', 'yoya-vgauge', 'GaugeDemo'],
      ['/components/board/timeline', 'yoya-vtimeline', 'TimelineDemo']
    ];
    for (const [path, className, demoName] of cases) {
      await openRoute(path);
      const itemIndex = path.split('/').pop();
      const page = document.querySelector(`[data-component-route-item="board:${itemIndex}"]`);
      expect(page).not.toBeNull();
      expect(page.querySelector(`.${className}`)).not.toBeNull();
      expect(page.querySelector('[data-source-example]').textContent).toContain(demoName);
    }
  });

  it('renders the scroll component docs with API and detailed demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/scroll');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('滚动组件');
    });

    const page = document.querySelector('[data-data-display-docs="scroll"]');
    const demos = page.querySelectorAll('[data-data-display-demo]');
    const basic = page.querySelector('[data-data-display-demo="basic"]');

    expect(page.querySelector('h1').textContent).toBe('vScroll 滚动组件');
    expect(page.textContent).toContain('scroll.loadMore(handler)');
    expect(demos).toHaveLength(4);
    expect(basic.querySelector('.yoya-vscroll')).not.toBeNull();
    expect(basic.querySelector('[data-source-example]').textContent).toContain(
      'ScrollBasicExample1'
    );

    const virtualDemo = page.querySelector('[data-data-display-demo="virtual"]');
    expect(virtualDemo.querySelector('.yoya-vscroll').dataset.virtual).toBe('true');
    expect(virtualDemo.querySelectorAll('.yoya-vscroll-virtual-item').length).toBeGreaterThan(0);
    expect(virtualDemo.querySelector('[data-source-example]').textContent).toContain(
      'ScrollVirtualExample1'
    );

    const loopDemo = page.querySelector('[data-data-display-demo="loop-block"]');
    const loopButton = [...loopDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('开启循环')
    );
    const blockButton = [...loopDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('阻止加载')
    );

    loopButton.click();
    expect(loopDemo.querySelector('.yoya-vscroll').dataset.loop).toBe('true');

    blockButton.click();
    expect(loopDemo.querySelector('.yoya-vscroll').dataset.blocked).toBe('true');
  });

  it('renders the carousel docs with API and demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/carousel');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('走马灯');
    });

    const page = document.querySelector('[data-data-display-docs="carousel"]');
    const demos = page.querySelectorAll('[data-data-display-demo]');
    const basic = page.querySelector('[data-data-display-demo="basic"]');
    const loopDemo = page.querySelector('[data-data-display-demo="loop"]');

    expect(page.querySelector('h1').textContent).toBe('vCarousel 走马灯');
    expect(page.textContent).toContain('carousel.autoplay(value)');
    expect(demos).toHaveLength(4);
    expect(basic.querySelector('.yoya-vcarousel')).not.toBeNull();
    expect(basic.querySelector('[data-source-example]').textContent).toContain(
      'CarouselBasicExample1'
    );

    const toggleLoopButton = [...loopDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('切换循环')
    );
    const nextButton = [...loopDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('下一项')
    );

    toggleLoopButton.click();
    nextButton.click();

    expect(loopDemo.querySelector('.yoya-vcarousel').dataset.loop).toBeUndefined();
    expect(loopDemo.querySelector('[data-carousel-loop-status]').textContent).toContain(
      '当前 2 / 3'
    );
  });

  it('renders the C-end docs category pages', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/c-end/skeleton');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('骨架屏');
    });

    const skeletonPage = document.querySelector('[data-c-end-docs="skeleton"]');
    expect(skeletonPage.querySelector('h1').textContent).toBe('vSkeleton 骨架屏');
    expect(skeletonPage.querySelector('.yoya-vskeleton')).not.toBeNull();
    expect(skeletonPage.querySelectorAll('[data-c-end-demo]').length).toBeGreaterThan(0);

    const toggleDemo = skeletonPage.querySelector('[data-c-end-demo="toggle"]');
    const loadedButton = [...toggleDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('切换为真实内容')
    );
    loadedButton.click();
    loadedButton.click();
    const contentHeadings = [...toggleDemo.querySelectorAll('h3')].filter((heading) =>
      heading.textContent.includes('订单 #1024')
    );
    expect(contentHeadings).toHaveLength(1);

    await openRoute('/components/c-end/image-preview');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('图片预览');
    });

    const previewPage = document.querySelector('[data-c-end-docs="image-preview"]');
    expect(previewPage.querySelector('h1').textContent).toBe('vImagePreview 图片预览');
    expect(previewPage.querySelector('.yoya-vimagepreview')).not.toBeNull();

    await openRoute('/components/c-end/transition');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('过渡动效');
    });

    const transitionPage = document.querySelector('[data-c-end-docs="transition"]');
    const forceDemo = transitionPage.querySelector('[data-c-end-demo="force"]');
    const toggleButton = [...forceDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('切换显示')
    );
    toggleButton.click();
    expect(forceDemo.querySelector('.yoya-vtransition').dataset.state).toBe('leave');

    await openRoute('/components/c-end/masonry');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('瀑布流');
    });

    const masonryPage = document.querySelector('[data-c-end-docs="masonry"]');
    const scrollDemo = masonryPage.querySelector('[data-c-end-demo="scroll"]');
    const scrollBox = scrollDemo.querySelector('[data-masonry-scroll]');
    expect(scrollDemo.querySelectorAll('.yoya-vmasonry > *')).toHaveLength(24);
    expect(scrollBox.style.overflow).toBe('auto');
  });

  it('renders the third-party ECharts demo page', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/third-party/echarts');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('ECharts 图表');
    });

    const page = document.querySelector('[data-echarts-page]');
    expect(page.querySelector('h1').textContent).toBe('ECharts 图表');
    expect(page.querySelectorAll('.components-echarts-grid .yoya-vcard')).toHaveLength(3);
    expect(page.querySelectorAll('.yoya-vechart')).toHaveLength(3);
    expect(page.querySelectorAll('[data-echarts-demo]')).toHaveLength(3);
    expect(page.querySelectorAll('[data-echarts-demo] [data-source-example]')).toHaveLength(3);
    expect(
      page.querySelector('[data-echarts-demo="bar"] [data-source-example]').textContent
    ).toContain("import { vEchart } from 'yoya-ui/echart';");
  });

  it('renders the third-party Signals demo page', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/third-party/signals');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('Signals 状态管理');
    });

    const page = document.querySelector('[data-signals-page]');
    expect(page.querySelector('h1').textContent).toBe('Signals 状态管理');
    expect(page.querySelectorAll('.components-signals-grid .yoya-vcard')).toHaveLength(4);
    expect(page.querySelectorAll('[data-signals-demo]')).toHaveLength(3);
    expect(page.querySelectorAll('[data-signals-demo] [data-source-example]')).toHaveLength(3);
    expect(
      page.querySelector('[data-signals-demo="counter"] [data-source-example]').textContent
    ).toContain("from '@preact/signals-core'");
    expect(
      page.querySelector('[data-signals-demo="counter"] [data-source-example]').textContent
    ).not.toContain('vCard');
    expect(page.querySelector('[data-signals-usage]')).not.toBeNull();
    expect(page.querySelectorAll('[data-signals-usage] li')).toHaveLength(4);
    expect(page.querySelector('[data-signals-advantages]')).not.toBeNull();
    expect(page.querySelectorAll('[data-signals-advantages] li')).toHaveLength(5);
  });

  it('syncs Signals state to the view without vStateNode', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/third-party/signals');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('Signals 状态管理');
    });

    const page = document.querySelector('[data-signals-page]');
    const counterDemo = page.querySelector('[data-signals-demo="counter"]');
    const plusButton = [...counterDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('+1')
    );

    plusButton.click();

    expect(counterDemo.querySelector('[data-signals-count]').textContent).toBe('1');
    expect(counterDemo.querySelector('[data-signals-double]').textContent).toBe('2');

    const inputDemo = page.querySelector('[data-signals-demo="input"]');
    const fillButton = [...inputDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('填入示例')
    );

    fillButton.click();

    expect(inputDemo.querySelector('[data-signals-output]').textContent).toBe(
      '当前输入：Hello yoya，长度：10'
    );

    const sharedDemo = page.querySelector('[data-signals-demo="shared"]');
    const sharedPlusButton = [...sharedDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('+1')
    );

    sharedPlusButton.click();

    expect(sharedDemo.querySelector('[data-signals-shared-count]').textContent).toBe('1');
  });

  it('switches the vStateNode dynamic form by type', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/guides/state-node');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('状态节点');
    });

    const page = document.querySelector('[data-state-docs="state"]');
    const demo = page.querySelector('[data-state-demo="dynamic-form"]');
    let select = demo.querySelector('[data-state-dynamic-select]');

    expect(demo.querySelectorAll('input')).toHaveLength(1);
    const sourceText = demo.querySelector('[data-source-example]').textContent;
    expect(sourceText.indexOf('export function DynamicFormFields')).toBeGreaterThan(
      sourceText.indexOf('import {')
    );
    expect(sourceText).toContain('export function DynamicFormFields');
    expect(sourceText).toContain('export function StateDynamicFormExample');

    select.value = 'number';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(demo.querySelectorAll('input')).toHaveLength(2);

    select = demo.querySelector('[data-state-dynamic-select]');
    expect(select.value).toBe('number');

    select.value = 'date';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(demo.querySelectorAll('input')).toHaveLength(1);
    expect(demo.querySelector('input[type="date"]')).not.toBeNull();
  });

  it('calls custom methods defined on a vStateNode config', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/guides/state-node');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('状态节点');
    });

    const page = document.querySelector('[data-state-docs="state"]');
    const demo = page.querySelector('[data-state-demo="methods"]');
    const buttons = [...demo.querySelectorAll('button')];
    const plusButton = buttons.find((button) => button.textContent.includes('+1'));
    const minusButton = buttons.find((button) => button.textContent.includes('-1'));
    const count = demo.querySelector('[data-state-methods-count]');

    plusButton.click();
    expect(count.textContent).toBe('1');

    minusButton.click();
    expect(count.textContent).toBe('0');

    plusButton.click();
    buttons[2].click();
    expect(count.textContent).toBe('0');

    const sourceText = demo.querySelector('[data-source-example]').textContent;
    expect(sourceText).toContain('increment()');
    expect(sourceText).toContain('decrement()');
    expect(sourceText).toContain('reset()');
  });

  it('drives the fragment, keyed and event-overwrite state demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/guides/state-node');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('状态节点');
    });

    const page = document.querySelector('[data-state-docs="state"]');
    const fragment = page.querySelector('[data-state-demo="fragment"] .components-state-demo-live');
    expect(fragment.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(fragment.querySelector('tbody').firstElementChild.tagName).toBe('TR');

    const keyed = page.querySelector(
      '[data-state-demo="keyed-children"] .components-state-demo-live'
    );
    expect(keyed.querySelectorAll('[data-row-key]')).toHaveLength(2);
    const appendButton = [...keyed.querySelectorAll('button')].find((button) =>
      button.textContent.includes('追加')
    );
    appendButton.click();
    expect(keyed.querySelectorAll('[data-row-key]')).toHaveLength(3);
    const removeButton = [...keyed.querySelectorAll('button')].find((button) =>
      button.textContent.includes('移除第一条')
    );
    removeButton.click();
    expect(keyed.querySelectorAll('[data-row-key]')).toHaveLength(2);

    const eventDemo = page.querySelector(
      '[data-state-demo="event-overwrite"] .components-state-demo-live'
    );
    const eventTarget = eventDemo.querySelector('[data-event-target]');
    const eventOutput = eventDemo.querySelector('[data-event-output]');
    const registerB = [...eventDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('注册 B')
    );
    registerB.click();
    eventTarget.click();
    eventTarget.click();
    expect(eventOutput.textContent).toBe('B 处理器已响应');
    const registerA = [...eventDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('注册 A')
    );
    registerA.click();
    eventTarget.click();
    expect(eventOutput.textContent).toBe('A 处理器已响应');

    const dynamic = page.querySelector(
      '[data-state-demo="dynamic-attrs"] .components-state-demo-live'
    );
    const statusBox = dynamic.querySelector('[data-dynamic-status]');
    const saveButton = [...dynamic.querySelectorAll('button')].find((button) =>
      button.textContent.includes('保存')
    );
    expect(statusBox.getAttribute('data-dynamic-status')).toBe('idle');
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.getAttribute('aria-busy')).toBeNull();

    saveButton.click();
    expect(statusBox.getAttribute('data-dynamic-status')).toBe('saving');
    expect(saveButton.disabled).toBe(true);
    expect(saveButton.getAttribute('aria-busy')).toBe('true');
    expect(saveButton.style.opacity).toBe('0.6');

    const finishButton = [...dynamic.querySelectorAll('button')].find((button) =>
      button.textContent.includes('完成')
    );
    finishButton.click();
    expect(statusBox.getAttribute('data-dynamic-status')).toBe('success');
    expect(saveButton.disabled).toBe(false);
    expect(saveButton.getAttribute('aria-busy')).toBeNull();
    expect(saveButton.style.opacity).toBe('');
  });

  it('renders the theme playground demo page', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/theme/theme');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('主题切换');
    });

    const page = document.querySelector('[data-theme-docs]');
    expect(page).toBeTruthy();
    expect(page.querySelector("[data-theme-mode='light']")).toBeTruthy();
    expect(page.querySelector("[data-theme-mode='dark']")).toBeTruthy();
    expect(page.querySelector("[data-theme-mode='system']")).toBeTruthy();
    expect(page.querySelector('[data-theme-density]')).toBeTruthy();
    expect(page.querySelector('[data-theme-accent]')).toBeTruthy();
    expect(page.querySelector('[data-source-example]')).toBeTruthy();
  });
  it('renders the component definition guide with define and compose demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/guides/component');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('组件');
    });

    const page = document.querySelector('[data-definition-page]');
    expect(page.querySelector('h1').textContent).toBe('定义组件');
    expect(page.querySelectorAll('[data-definition-demo]')).toHaveLength(3);
    expect(page.querySelectorAll('[data-definition-demo]')[0].dataset.definitionDemo).toBe(
      'define'
    );
    expect(page.querySelector('[data-definition-demo="compose"] .yoya-vavatar')).not.toBeNull();
    expect(page.querySelector('[data-definition-demo="compose"] .yoya-vbadge')).not.toBeNull();

    const interactiveDemo = page.querySelector('[data-definition-demo="interactive-compose"]');
    const jumpButton = [...interactiveDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('跳转第 3 步')
    );
    const nextButton = [...interactiveDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('下一步')
    );
    jumpButton.click();
    nextButton.click();
    expect(interactiveDemo.querySelector('[data-parent-log]').textContent).toContain(
      '父组件收到：第 3 步完成'
    );
  });

  it('renders the HTML native elements guide page with a live input demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/guides/html-native');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('HTML 原生元素');
    });

    const page = document.querySelector('[data-html-native-page]');
    expect(page.querySelector('h1').textContent).toBe('HTML 原生元素');
    const htmlDemo = page.querySelector('.components-html-native-demo');
    const inputElement = htmlDemo.querySelector('input');
    inputElement.value = 'yoya';
    htmlDemo.querySelector('button').click();
    expect(htmlDemo.querySelector('output').textContent).toBe('原生输入：yoya');
    expect(page.querySelector('[data-source-example]').textContent).toContain('render()');

    const usageNote = page.querySelector('[data-html-native-usage]');
    expect(usageNote).not.toBeNull();
    expect(usageNote.textContent).toContain("box.button('保存', (btn) => btn.on('click', save))");
    expect(usageNote.textContent).toContain("box.button('保存').on('click', save)");
  });

  it('renders the development guide overview and installation pages', async () => {
    root = renderExamplesIndex('#app');
    const guideCases = [
      ['/components/guides/overview', '概述', 'overview'],
      ['/components/guides/installation', '安装方式', 'installation']
    ];

    for (const [path, title, pageId] of guideCases) {
      await openRoute(path);
      await vi.waitFor(() => {
        expect(selectedRouteTitle()).toBe(title);
      });
      expect(document.querySelector(`[data-guide-page="${pageId}"]`)).not.toBeNull();
    }
  });

  it.each([
    [
      '/components/guides/i18n',
      '国际化',
      'i18n',
      'I18n 国际化',
      'reactive',
      'I18nReactiveExample1',
      'createI18n(',
      4
    ],
    [
      '/components/guides/state-node',
      '状态节点',
      'state',
      'vStateNode 状态节点',
      'counter',
      'StateCounterExample1',
      'vStateNode(',
      10
    ],
    [
      '/components/layout/divider',
      '分割线',
      'divider',
      'divider 分割线',
      'section',
      'DividerSectionExample1',
      'divider()',
      2
    ],
    [
      '/components/layout/flex',
      '弹性布局',
      'flex',
      'flex 弹性布局',
      'wrap',
      'FlexToolbarExample1',
      'flex(',
      3
    ],
    [
      '/components/layout/grid',
      '栅格',
      'grid',
      'grid 栅格',
      'fixed',
      'GridFixedExample1',
      'grid(',
      3
    ],
    [
      '/components/layout/body',
      '页面容器',
      'body',
      'vBody 页面容器',
      'shell',
      'BodyShellExample1',
      'vBody(',
      3
    ],
    [
      '/components/layout/spacer',
      '间距',
      'spacer',
      'spacer 间距',
      'toolbar',
      'SpacerToolbarExample1',
      'spacer()',
      2
    ],
    [
      '/components/layout/dialog',
      '弹窗',
      'popup',
      'vDialog 弹窗',
      'launch',
      'PopupLaunchExample1',
      'dialog.open(true)',
      3
    ],
    [
      '/components/layout/templates',
      '布局模板',
      'templates',
      '布局模板',
      'admin',
      'AdminTemplateExample1',
      'vContainer(',
      4
    ],
    [
      '/components/layout/mobile',
      '移动布局',
      'mobile',
      'mobileLayout 移动布局',
      'shell',
      'MobileLayoutExample1',
      'mobileLayout(',
      2
    ],
    [
      '/components/navigation/anchor',
      '锚点',
      'anchor',
      'vAnchor 锚点',
      'basic',
      'AnchorStandaloneDemo',
      'vAnchor(',
      1
    ],
    [
      '/components/navigation/breadcrumb',
      '面包屑',
      'breadcrumb',
      'vBreadcrumb 面包屑',
      'basic',
      'BreadcrumbBasicExample1',
      'vBreadcrumb(',
      2
    ],
    [
      '/components/navigation/menu',
      '菜单',
      'menu',
      'vMenu 菜单',
      'command',
      'CommandMenuCard',
      'vMenuDivider()',
      5
    ],
    [
      '/components/navigation/steps',
      '步骤条',
      'steps',
      'vSteps 步骤条',
      'basic',
      'StepsBasicExample1',
      'vSteps((steps)',
      3
    ],
    [
      '/components/navigation/tabs',
      '标签页',
      'tabs',
      'vTabs 标签页',
      'basic',
      'TabsBasicExample1',
      'vTabs((tabs)',
      3
    ],
    [
      '/components/navigation/navbar',
      '导航栏',
      'navbar',
      'vNavbar 横向导航栏',
      'shell',
      'NavbarShellExample1',
      'vNavbar(',
      3
    ],
    [
      '/components/navigation/router',
      '路由',
      'router',
      'Router 路由',
      'links',
      'RouterNavigationCard',
      'vRouterView(',
      5
    ],
    [
      '/components/navigation/router-views',
      '路由视图',
      'router-views',
      'vRouterViews 路由视图',
      'editor',
      'RouterViewsEditorStandalone',
      'vRouterViews(',
      2
    ],
    [
      '/components/feedback/message',
      '消息',
      'message',
      'vMessage 消息',
      'types',
      'MessageTypesExample1',
      "vMessage({ type: 'success'",
      4
    ],
    [
      '/components/form/field',
      '字段',
      'field',
      'vField 字段',
      'detail',
      'FieldDetailExample1',
      'vDetail((detail)',
      5
    ],
    [
      '/components/data-display/avatar',
      '头像',
      'avatar',
      'vAvatar 头像',
      'image',
      'AvatarImageExample1',
      'new URL(',
      5
    ],
    [
      '/components/data-display/badge',
      '徽标数',
      'badge',
      'vBadge 徽标数',
      'count',
      'BadgeCountExample1',
      'vBadge({',
      3
    ],
    [
      '/components/data-display/detail',
      '详情',
      'detail',
      'vDetail 详情',
      'basic',
      'DetailBasicExample1',
      'vDetail({',
      4
    ],
    [
      '/components/data-display/table',
      '表格',
      'table',
      'vTable 表格',
      'basic',
      'TableBasicExample1',
      'vTable({',
      4
    ],
    [
      '/components/data-display/tree',
      '树形控件',
      'tree',
      'vTree 树形控件',
      'basic',
      'TreeBasicExample1',
      'vTree((root) =>',
      4
    ],
    [
      '/components/data-display/progress',
      '进度条',
      'progress',
      'vProgress 进度条',
      'basic',
      'ProgressBasicExample1',
      'vProgress((progress)',
      3
    ]
  ])(
    'renders detailed docs for %s',
    async (
      _path,
      routeTitle,
      docsKey,
      heading,
      firstDemoId,
      sourceName,
      sourceSnippet,
      demoCount
    ) => {
      root = renderExamplesIndex('#app');

      await openRoute(_path);
      await vi.waitFor(() => {
        expect(selectedRouteTitle()).toBe(routeTitle);
      });

      const page = document.querySelector(
        `[data-layout-docs="${docsKey}"], [data-navigation-docs="${docsKey}"], [data-feedback-docs="${docsKey}"], [data-form-docs="${docsKey}"], [data-data-display-docs="${docsKey}"], [data-i18n-docs="${docsKey}"], [data-state-docs="${docsKey}"]`
      );
      expect(page).not.toBeNull();
      expect(page.querySelector('h1').textContent).toBe(heading);
      const demoNodes = page.querySelectorAll(
        '[data-layout-demo], [data-navigation-demo], [data-feedback-demo], [data-form-demo], [data-data-display-demo], [data-i18n-demo], [data-state-demo]'
      );
      expect(demoNodes).toHaveLength(demoCount);

      const source = page.querySelector(
        `[data-layout-demo="${firstDemoId}"] [data-source-example], [data-navigation-demo="${firstDemoId}"] [data-source-example], [data-feedback-demo="${firstDemoId}"] [data-source-example], [data-form-demo="${firstDemoId}"] [data-source-example], [data-data-display-demo="${firstDemoId}"] [data-source-example], [data-i18n-demo="${firstDemoId}"] [data-source-example], [data-state-demo="${firstDemoId}"] [data-source-example]`
      );
      expect(source).not.toBeNull();
      expect(source.textContent).toContain(`export function ${sourceName}`);
      expect(source.textContent).toContain(sourceSnippet);
    }
  );

  it('switches reactive I18n demos between languages', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/guides/i18n');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('国际化');
    });

    const page = document.querySelector('[data-i18n-docs]');
    const reactive = page.querySelector('[data-i18n-demo="reactive"] .components-i18n-demo-live');
    expect(reactive.textContent).toContain('服务控制台');
    expect(reactive.textContent).toContain('你好，Ada');
    expect(reactive.querySelector('.yoya-vlanguage-switch')).not.toBeNull();

    reactive.querySelector('.yoya-vdropdown-trigger').click();
    const reactiveEnglish = reactive.querySelector('.yoya-vmenu-item[data-language="en"]');
    reactiveEnglish.click();

    expect(reactive.textContent).toContain('Service Console');
    expect(reactive.textContent).toContain('Hello, Ada');
    expect(localStorage.getItem('yoya-ui:i18n-demo-language')).toBe('en');
    expect(reactive.querySelector('.yoya-vmenu-item[data-language="en"]').dataset.active).toBe(
      'true'
    );

    const params = page.querySelector('[data-i18n-demo="params"] .components-i18n-demo-live');
    const paramsEnglish = [...params.querySelectorAll('button')].find((button) =>
      button.textContent.includes('English')
    );
    paramsEnglish.click();

    expect(params.textContent).toContain('Users: 1');
    expect(params.textContent).toContain('未知状态');

    const patchButton = [...params.querySelectorAll('button')].find((button) =>
      button.textContent.includes('注册英文补丁')
    );
    patchButton.click();

    expect(params.textContent).toContain('Unknown status');

    const plusButton = [...params.querySelectorAll('button')].find((button) =>
      button.textContent.includes('数量 +1')
    );
    plusButton.click();

    expect(params.textContent).toContain('Users: 2');

    const shortcut = page.querySelector('[data-i18n-demo="shortcut"] .components-i18n-demo-live');
    const shortcutEnglish = [...shortcut.querySelectorAll('button')].find((button) =>
      button.textContent.includes('English')
    );
    shortcutEnglish.click();

    expect(shortcut.textContent).toContain('Saved');
    expect(shortcut.textContent).toContain('Hello, Ada');

    const extend = page.querySelector('[data-i18n-demo="extend"] .components-i18n-demo-live');
    expect(extend.querySelectorAll('.yoya-vmenu-item')).toHaveLength(2);

    const addJapanese = [...extend.querySelectorAll('button')].find((button) =>
      button.textContent.includes('添加日语')
    );
    addJapanese.click();

    expect(extend.querySelectorAll('.yoya-vmenu-item')).toHaveLength(3);

    const japaneseItem = extend.querySelector('.yoya-vmenu-item[data-language="ja"]');
    expect(japaneseItem).not.toBeNull();
    japaneseItem.click();

    expect(extend.textContent).toContain('こんにちは、Ada');
    expect(extend.querySelector('.yoya-vdropdown-trigger').textContent).toContain('日本語');
  });

  it('runs state node demos with update and rebuild modes', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/guides/state-node');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('状态节点');
    });

    const page = document.querySelector('[data-state-docs="state"]');
    const counter = page.querySelector('[data-state-demo="counter"] .components-state-demo-live');
    const plusButton = [...counter.querySelectorAll('button')].find((button) =>
      button.textContent.includes('+1')
    );

    expect(counter.textContent).toContain('0');
    plusButton.click();
    expect(counter.textContent).toContain('1');

    const inputDemo = page.querySelector('[data-state-demo="input"] .components-state-demo-live');
    const inputElement = inputDemo.querySelector('input[data-state-demo-input]');
    inputElement.focus();
    inputElement.value = 'yoya';
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    expect(inputDemo.querySelector('[data-state-input-output]').textContent).toContain(
      '当前输入：yoya，长度：4'
    );
    expect(document.activeElement).toBe(inputElement);
    expect(inputDemo.querySelector('input')).toBe(inputElement);

    const rebuild = page.querySelector('[data-state-demo="rebuild"] .components-state-demo-live');
    const rebuildCard = rebuild.querySelector('.yoya-vcard');
    const rebuildWidth = rebuildCard.style.width;
    const rebuildMaxWidth = rebuildCard.style.maxWidth;
    const executeButton = [...rebuild.querySelectorAll('button')].find((button) =>
      button.textContent.includes('执行')
    );
    executeButton.click();

    expect(rebuild.textContent).toContain('状态：running');
    expect(rebuild.textContent).toContain('次数：1');
    expect(rebuild.querySelector('.yoya-vcard')).not.toBe(rebuildCard);
    expect(rebuild.querySelector('.yoya-vcard').style.width).toBe(rebuildWidth);
    expect(rebuild.querySelector('.yoya-vcard').style.maxWidth).toBe(rebuildMaxWidth);

    const toggle = page.querySelector('[data-state-demo="toggle"] .components-state-demo-live');
    const toggleCard = toggle.querySelector('.yoya-vcard');
    const toggleWidth = toggleCard.style.width;
    const toggleMaxWidth = toggleCard.style.maxWidth;
    const toggleButton = [...toggle.querySelectorAll('button')].find((button) =>
      button.textContent.includes('隐藏')
    );
    toggleButton.click();

    expect(toggle.textContent).toContain('当前内容已隐藏');
    expect(toggle.querySelector('button').textContent).toBe('显示');
    expect(toggle.querySelector('.yoya-vcard')).not.toBe(toggleCard);
    expect(toggle.querySelector('.yoya-vcard').style.width).toBe(toggleWidth);
    expect(toggle.querySelector('.yoya-vcard').style.maxWidth).toBe(toggleMaxWidth);
  });

  it('keeps popup documentation dialogs closed until the trigger is clicked', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/layout/dialog');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('弹窗');
    });
    await Promise.resolve();

    const page = document.querySelector('[data-layout-docs="popup"]');
    expect(page).not.toBeNull();
    expect(page.querySelector('dialog[open]')).toBeNull();

    const launchDemo = page.querySelector('[data-layout-demo="launch"]');
    launchDemo.querySelector('button').click();

    expect(launchDemo.querySelector('dialog[open]')).not.toBeNull();
  });

  it('validates a vForm inside the popup form demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/layout/dialog');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('弹窗');
    });

    const page = document.querySelector('[data-layout-docs="popup"]');
    const formDemo = page.querySelector('[data-layout-demo="form"]');
    const openButton = [...formDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('新建发布')
    );
    openButton.click();

    const dialog = formDemo.querySelector('dialog[open]');
    expect(dialog).not.toBeNull();

    const submitButton = [...dialog.querySelectorAll('button')].find((button) =>
      button.textContent.includes('创建')
    );
    submitButton.click();
    expect(dialog.querySelector('.yoya-vform-item-error')).not.toBeNull();
    expect(formDemo.textContent).toContain('请检查必填项');

    const title = dialog.querySelector('input[name="title"]');
    title.value = 'v2026.08.25';
    title.dispatchEvent(new Event('input', { bubbles: true }));
    const environment = dialog.querySelector('select[name="environment"]');
    environment.value = '生产';
    environment.dispatchEvent(new Event('change', { bubbles: true }));
    submitButton.click();

    expect(formDemo.querySelector('dialog[open]')).toBeNull();
    expect(formDemo.textContent).toContain('已创建');
  });

  it('renders layout template demos inside isolated iframes', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/layout/templates');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('布局模板');
    });

    const page = document.querySelector('[data-layout-docs="templates"]');
    const frames = page.querySelectorAll('[data-layout-demo-frame]');
    expect(frames).toHaveLength(4);
    frames.forEach((frame) => {
      expect(frame.tagName).toBe('IFRAME');
    });
  });

  it('renders mobile layout demos inside phone-shaped iframes', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/layout/mobile');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('移动布局');
    });

    const page = document.querySelector('[data-layout-docs="mobile"]');
    const phoneFrames = page.querySelectorAll('[data-layout-demo-phone]');

    expect(phoneFrames).toHaveLength(2);
    phoneFrames.forEach((frame) => {
      expect(frame.tagName).toBe('IFRAME');
      expect(frame.style.width).toBe('360px');
    });
  });

  it('shows interactive state changes in the horizontal navbar demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/navigation/navbar');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('导航栏');
    });

    const shellDemo = document.querySelector('[data-navigation-demo="shell"]');
    expect(shellDemo).not.toBeNull();

    const status = shellDemo.querySelector('[data-navbar-demo-status]');
    const items = shellDemo.querySelectorAll('.yoya-vnavbar-menu .yoya-vmenu-item');

    expect(status.textContent).toBe('当前：概览');
    expect(items[0].getAttribute('aria-current')).toBe('page');

    items[1].click();

    expect(status.textContent).toBe('当前：组件');
    expect(items[0].getAttribute('aria-current')).toBeNull();
    expect(items[1].getAttribute('aria-current')).toBe('page');

    shellDemo.querySelector('.yoya-vnavbar-actions .yoya-vbutton').click();

    expect(status.textContent).toBe('已触发：登录');
  });

  it('moves the current step in the steps docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/navigation/steps');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('步骤条');
    });

    const demo = document.querySelector('[data-navigation-demo="basic"]');
    const status = demo.querySelector('[data-steps-basic-status]');
    const nextButton = [...demo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('下一步')
    );
    const steps = demo.querySelector('.yoya-vsteps');

    expect(status.textContent).toBe('当前第 2 步：配置');
    expect(steps.dataset.current).toBe('1');

    nextButton.click();

    expect(status.textContent).toBe('当前第 3 步：发布');
    expect(steps.dataset.current).toBe('2');
    expect(demo.querySelectorAll('.yoya-vstep')[2].dataset.status).toBe('process');
  });

  it('switches tabs in the tabs docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/navigation/tabs');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('标签页');
    });

    const demo = document.querySelector('[data-navigation-demo="basic"]');
    const status = demo.querySelector('[data-tabs-basic-status]');
    const triggers = demo.querySelectorAll('.yoya-vtab-trigger');

    expect(status.textContent).toBe('当前：概览');
    expect(triggers[0].getAttribute('aria-selected')).toBe('true');

    triggers[1].click();

    expect(status.textContent).toBe('当前：日志');
    expect(triggers[1].getAttribute('aria-selected')).toBe('true');
    expect(demo.querySelector('.yoya-vtab-panel').hidden).toBe(true);
  });

  it('switches the active item in the breadcrumb docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/navigation/breadcrumb');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('面包屑');
    });

    const demo = document.querySelector('[data-navigation-demo="dynamic"]');
    const status = demo.querySelector('[data-breadcrumb-demo-status]');
    const consoleButton = [...demo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('控制台')
    );

    expect(status.textContent).toBe('当前：服务详情');
    expect(demo.querySelector('.yoya-vbreadcrumb-item[data-current="true"]').textContent).toContain(
      '服务详情'
    );

    consoleButton.click();

    expect(status.textContent).toBe('当前：控制台');
    expect(demo.querySelector('.yoya-vbreadcrumb-item[data-current="true"]').textContent).toContain(
      '控制台'
    );
  });

  it('shows tree selection and checkbox state changes in the tree docs demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/tree');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('树形控件');
    });

    const basicDemo = document.querySelector('[data-data-display-demo="basic"]');
    const status = basicDemo.querySelector('[data-tree-demo-status]');

    basicDemo.querySelector('[data-node-id="web"]').click();

    expect(status.textContent).toBe('当前：Web 门户');

    const checkableDemo = document.querySelector('[data-data-display-demo="checkable"]');
    const checkStatus = checkableDemo.querySelector('[data-tree-check-status]');
    const apiInput = checkableDemo.querySelector('[data-node-id="api-gateway"] input');

    apiInput.checked = true;
    apiInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(checkStatus.textContent).toBe('已选 1 项');

    const fileManagerDemo = document.querySelector('[data-data-display-demo="file-manager"]');
    fileManagerDemo.querySelector('[data-node-id="tree.js"]').click();

    expect(fileManagerDemo.querySelector('[data-tree-file-name]').textContent).toBe('tree.js');
    expect(fileManagerDemo.querySelector('[data-tree-file-type]').textContent).toBe('JavaScript');

    const emptyToggle = fileManagerDemo.querySelector(
      '[data-node-id="components"] .yoya-vtree-toggle'
    );
    expect(emptyToggle.getAttribute('aria-expanded')).toBe('false');

    emptyToggle.click();

    expect(
      fileManagerDemo
        .querySelector('[data-node-id="components"] .yoya-vtree-toggle')
        .getAttribute('aria-expanded')
    ).toBe('true');

    const srcToggle = fileManagerDemo.querySelector('[data-node-id="src"] .yoya-vtree-toggle');
    expect(srcToggle.getAttribute('aria-expanded')).toBe('true');
    expect(srcToggle.querySelector('svg')).not.toBeNull();

    srcToggle.click();

    const collapsedToggle = fileManagerDemo.querySelector(
      '[data-node-id="src"] .yoya-vtree-toggle'
    );
    expect(collapsedToggle.getAttribute('aria-expanded')).toBe('false');
    expect(collapsedToggle.querySelector('svg path').getAttribute('d')).toContain('M20 20a2');

    collapsedToggle.click();

    const expandedToggle = fileManagerDemo.querySelector('[data-node-id="src"] .yoya-vtree-toggle');
    expect(expandedToggle.getAttribute('aria-expanded')).toBe('true');
    expect(expandedToggle.querySelector('svg path').getAttribute('d')).toContain('m6 14 1.45-2.9');

    const builderDemo = document.querySelector('[data-data-display-demo="builder"]');
    const builderStatus = builderDemo.querySelector('[data-tree-builder-status]');
    builderDemo.querySelector('[data-tree-builder-action="finance"]').click();

    expect(builderStatus.textContent).toBe('操作：财务');
    expect(
      builderDemo.querySelector('[data-node-id="finance"]').getAttribute('aria-selected')
    ).toBe('false');

    builderDemo.querySelector('[data-node-id="finance"]').click();

    expect(builderStatus.textContent).toBe('当前：财务');
  });

  it('shows the updated dropdown menu docs page with sticky selection state', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/navigation/dropdown');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('下拉菜单');
    });

    const page = document.querySelector('[data-component-route-item="navigation:dropdown"]');
    const dropdown = page.querySelector('[data-dropdown-demo]');
    const status = page.querySelector('[data-dropdown-demo-status]');
    const trigger = page.querySelector('[data-dropdown-demo-trigger]');
    const exportItem = page.querySelector('[data-dropdown-demo-item="export"]');

    expect(status.textContent).toBe('当前：未选择');
    expect(dropdown.dataset.placement).toBe('bottom-end');
    expect(page.querySelector('[data-source-example]').textContent).toContain(
      "placement('bottom-end')"
    );
    expect(page.querySelector('[data-source-example]').textContent).toContain(
      'closeOnSelect(false)'
    );

    trigger.click();

    expect(dropdown.dataset.open).toBe('true');

    exportItem.click();

    expect(status.textContent).toBe('当前：导出报表');
    expect(dropdown.dataset.open).toBe('true');
  });

  it('shows interactive row actions in the table documentation demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/table');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('表格');
    });

    const tableDemo = document.querySelector('[data-data-display-demo="basic"]');
    expect(tableDemo).not.toBeNull();

    const status = tableDemo.querySelector('[data-table-demo-status]');
    expect(status.textContent).toBe('等待操作');

    tableDemo.querySelector('[data-table-row-action="worker"]').click();

    expect(status.textContent).toBe('已选择 worker');
    expect(tableDemo.querySelector('.yoya-vtable-caption').textContent).toBe('服务列表');
    expect(tableDemo.querySelectorAll('.yoya-vtable-row')).toHaveLength(3);
  });

  it('shows declarative table sections in the table documentation demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/table');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('表格');
    });

    const declarativeDemo = document.querySelector('[data-data-display-demo="declarative"]');

    expect(declarativeDemo).not.toBeNull();
    const tableElement = declarativeDemo.querySelector('.yoya-vtable-table');
    expect(tableElement.querySelector('.yoya-vtable-head th:nth-child(2)').textContent).toBe(
      '状态'
    );
    expect(tableElement.querySelectorAll('.yoya-vtable-table > tbody tr')).toHaveLength(2);
    expect(tableElement.querySelector('.yoya-vtable-foot td').textContent).toBe(
      '表尾单元格可以跨列'
    );
  });

  it('updates value and status in the progress docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/progress');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('进度条');
    });

    const demo = document.querySelector('[data-data-display-demo="dynamic"]');
    const progress = demo.querySelector('.yoya-vprogress');
    const status = demo.querySelector('[data-progress-dynamic-status]');
    const addButton = [...demo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('加 10')
    );
    const resetButton = [...demo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('重置')
    );

    expect(status.textContent).toBe('当前 40%');
    expect(progress.dataset.status).toBe('processing');

    addButton.click();
    addButton.click();
    addButton.click();
    addButton.click();
    addButton.click();
    addButton.click();

    expect(status.textContent).toBe('当前 100%');
    expect(progress.dataset.status).toBe('success');

    resetButton.click();

    expect(status.textContent).toBe('当前 0%');
    expect(progress.dataset.status).toBe('processing');
  });

  it('updates badge counts and overflow text in the badge docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/badge');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('徽标数');
    });

    const countDemo = document.querySelector('[data-data-display-demo="count"]');
    const status = countDemo.querySelector('[data-badge-count-status]');
    const addButton = [...countDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('加 1')
    );

    expect(status.textContent).toBe('当前 0');
    expect(countDemo.querySelector('.yoya-vbadge-count').textContent).toBe('0');
    expect(countDemo.textContent).toContain('99+');

    addButton.click();

    expect(status.textContent).toBe('当前 1');
    expect(countDemo.querySelector('.yoya-vbadge-count').textContent).toBe('1');
  });

  it('switches avatar status in the avatar docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/avatar');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('头像');
    });

    const demo = document.querySelector('[data-data-display-demo="interactive"]');
    const status = demo.querySelector('[data-avatar-demo-status]');
    const statusButton = [...demo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('切换状态')
    );

    expect(status.textContent).toBe('online');
    statusButton.click();
    expect(status.textContent).toBe('busy');
  });

  it('renders image avatars in the avatar docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/avatar');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('头像');
    });

    const demo = document.querySelector('[data-data-display-demo="image"]');
    const images = demo.querySelectorAll('.yoya-vavatar-image');

    expect(images).toHaveLength(3);
    images.forEach((image) => {
      expect(image.getAttribute('src')).toBeTruthy();
    });
  });

  it('renders the avatar upload demo below the avatar demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/avatar');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('头像');
    });

    const page = document.querySelector('[data-data-display-docs="avatar"]');
    const demos = page.querySelectorAll('[data-data-display-demo]');
    const uploadDemo = page.querySelector('[data-data-display-demo="upload"]');

    expect(demos).toHaveLength(5);
    expect(demos[demos.length - 1].dataset.dataDisplayDemo).toBe('upload');
    expect(uploadDemo.querySelector('.yoya-vavatar-upload')).not.toBeNull();
    expect(uploadDemo.querySelector('[data-avatar-upload-status]').textContent).toBe('未选择头像');
  });

  it('updates detail values when switching services in the detail docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/detail');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('详情');
    });

    const detailDemo = document.querySelector('[data-data-display-demo="dynamic"]');
    const detail = detailDemo.querySelector('.yoya-vdetail');
    const switchButton = [...detailDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('切换服务')
    );

    expect(detail.textContent).toContain('api-gateway');
    expect(detail.textContent).toContain('运行中');

    switchButton.click();

    expect(detail.textContent).toContain('worker');
    expect(detail.textContent).toContain('维护中');
  });

  it('dynamically changes detail column counts in the detail docs demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/data-display/detail');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('详情');
    });

    const columnsDemo = document.querySelector('[data-data-display-demo="columns"]');
    const detail = columnsDemo.querySelector('.yoya-vdetail');
    const status = columnsDemo.querySelector('[data-detail-columns-status]');
    const threeColumnsButton = [...columnsDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('3 列')
    );

    expect(status.textContent).toBe('当前 2 列');
    expect(detail.dataset.columns).toBe('2');
    expect(detail.style.gridTemplateColumns).toBe('repeat(2, minmax(0, 1fr))');

    threeColumnsButton.click();

    expect(status.textContent).toBe('当前 3 列');
    expect(detail.dataset.columns).toBe('3');
    expect(detail.style.gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
  });

  it('keeps the button source compact and directly reusable', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/general/button');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const page = document.querySelector('[data-component-route-item="general:button"]');
    const source = page.querySelector('[data-source-example]').textContent;

    expect(source).toContain("import { vButton } from 'yoya-ui';");
    expect(source).toContain('export function ButtonExample1()');
    expect(source).toContain('return {');
    expect(source).toContain('render()');
    expect(source).toContain("return vButton('OK')");
    expect(source).toContain(".variant('primary')");
    expect(source).toContain(".on('click', () => {");
    expect(source).toContain("console.log('clicked')");
    expect(source).not.toContain('DeploymentTaskCard');
    expect(source).not.toContain('vCard');
  });

  it('renders the vButton documentation page as stacked interactive examples', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/general/button');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const page = document.querySelector('[data-button-docs="true"]');
    expect(page).not.toBeNull();
    expect(page.querySelector('h1').textContent).toBe('vButton 按钮');
    expect(page.querySelector('[data-button-usage]')).not.toBeNull();

    const demos = page.querySelectorAll('[data-button-demo]');
    expect(demos).toHaveLength(5);
    demos.forEach((demo) => {
      const live = demo.querySelector('[data-button-live]');
      const source = demo.querySelector('.source-panel');
      expect(live).not.toBeNull();
      expect(source).not.toBeNull();
      expect(live.compareDocumentPosition(source) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(source.querySelector('[data-source-example]').textContent).toMatch(
        /export function Button(?:[A-Za-z]+)?Example1\(\)/
      );
      expect(source.querySelector('[data-source-example]').textContent).toContain('return {');
      expect(source.querySelector('[data-source-example]').textContent).toContain('render()');
    });

    const loadingButton = page.querySelector(
      '[data-button-demo="states"] [data-button-live] button'
    );
    const basicSource = page.querySelector('[data-button-demo="basic"] [data-source-example]');
    expect(basicSource.textContent).toContain("return vButton('OK')");
    expect(basicSource.textContent).not.toContain('const button =');
    expect(basicSource.textContent).toContain("console.log('clicked')");
    expect(basicSource.textContent).toContain(".variant('primary')");
    expect(basicSource.textContent).toContain(".on('click'");
    loadingButton.click();
    expect(loadingButton.getAttribute('aria-busy')).toBe('true');
  });

  it('renders visibly different button sizes in the size example', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/general/button');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const buttons = document.querySelectorAll(
      '[data-button-demo="sizes"] [data-button-live] button'
    );
    const row = document.querySelector(
      '[data-button-demo="sizes"] [data-button-live] .yoya-hstack'
    );

    expect(row.style.alignItems).toBe('center');
    expect([...buttons].map((button) => button.dataset.size)).toEqual(['small', 'medium', 'large']);
  });

  it('renders an interactive form demo', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/input');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('输入框');
    });

    const page = document.querySelector('[data-component-route-item="form:input"]');
    const input = page.querySelector('.yoya-vinput');

    expect(input.value).toBe('yoya-ui');
    input.value = 'service-gateway';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(page.textContent).toContain('service-gateway');
    expect(page.querySelector('[data-source-example]').textContent).toContain(
      'export function InputExample1'
    );
  });

  it('renders the form documentation page with basic and validated demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/form');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('表单');
    });

    const page = document.querySelector('[data-form-docs="form"]');
    expect(page).not.toBeNull();
    expect(page.querySelector('h1').textContent).toBe('vForm 表单');
    expect(page.querySelectorAll('[data-form-demo]')).toHaveLength(3);
    expect(page.textContent).toContain('基础表单');
    expect(page.textContent).toContain('表单校验');
    expect(page.textContent).toContain('自定义取值');
    expect(
      page.querySelector('[data-form-demo="basic"] [data-source-example]').textContent
    ).toContain('export function FormExample1');
    expect(
      page.querySelector('[data-form-demo="basic"] [data-source-example]').textContent
    ).not.toContain('vCard');
    expect(
      page.querySelector('[data-form-demo="validated"] [data-source-example]').textContent
    ).toContain('export function FormExample2');
    expect(
      page.querySelector('[data-form-demo="validated"] [data-source-example]').textContent
    ).not.toContain('vCard');
    expect(
      page.querySelector('[data-form-demo="collect-value"] [data-source-example]').textContent
    ).toContain('export function FormExample3');
    expect(
      page.querySelector('[data-form-demo="collect-value"] [data-source-example]').textContent
    ).toContain('collectValue');

    const validated = page.querySelector('[data-form-demo="validated"]');
    validated.querySelector('button[type="submit"]').click();
    expect(validated.textContent).toContain('项目名称不能为空');
    expect(validated.textContent).toContain('请选择负责人角色');
    expect(validated.textContent).toContain('请检查必填项');

    const collect = page.querySelector('[data-form-demo="collect-value"]');
    collect.querySelector('button[type="submit"]').click();
    expect(collect.textContent).toContain('负责人：SRE Team');
  });

  it('renders vField docs combined with vDetail and saves edited values', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/field');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('字段');
    });

    const page = document.querySelector('[data-form-docs="field"]');
    expect(page.querySelector('h1').textContent).toBe('vField 字段');
    expect(page.querySelectorAll('[data-form-demo]')).toHaveLength(5);

    const detailDemo = page.querySelector('[data-form-demo="detail"]');
    const detailField = detailDemo.querySelector('.yoya-vfield');
    const detailItem = detailDemo.querySelector('.yoya-vdetail-item');

    expect(detailItem.dataset.labelVisible).toBeUndefined();
    expect(detailItem.style.gridTemplateColumns).toBe('minmax(0, 1fr)');
    expect(detailField.querySelector('.yoya-vfield-label').textContent).toBe('服务名称');

    detailField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    const detailAction = detailField.querySelector('.yoya-vfield-action');

    expect(detailAction.style.opacity).toBe('1');
    detailAction.click();
    expect(detailField.dataset.mode).toBe('edit');

    const saveDemo = page.querySelector('[data-form-demo="save"]');
    const saveField = saveDemo.querySelector('.yoya-vfield');
    saveField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    saveField.querySelector('.yoya-vfield-action').click();
    const saveInput = saveField.querySelector('input');
    saveInput.value = 'worker';
    saveInput.dispatchEvent(new Event('input', { bubbles: true }));
    const saveButton = [...saveDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('保存')
    );
    saveButton.click();

    expect(saveDemo.querySelector('[data-field-save-status]').textContent).toContain('worker');

    const validationDemo = page.querySelector('[data-form-demo="validation"]');
    const validationField = validationDemo.querySelector('.yoya-vfield');
    validationField.dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    validationField.querySelector('.yoya-vfield-action').click();
    const validationInput = validationField.querySelector('input');
    validationInput.value = '';
    validationInput.dispatchEvent(new Event('input', { bubbles: true }));
    const validateButton = [...validationDemo.querySelectorAll('button')].find((button) =>
      button.textContent.includes('校验')
    );
    validateButton.click();

    expect(validationDemo.querySelector('[data-field-validation-status]').textContent).toBe(
      '校验未通过'
    );
    expect(validationDemo.textContent).toContain('服务名称不能为空');
  });

  it('renders the tooltip documentation page with placement and trigger demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/feedback/tooltip');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('提示');
    });

    const page = document.querySelector('[data-feedback-docs="tooltip"]');
    const demos = page.querySelectorAll('[data-feedback-demo]');
    const placementDemo = page.querySelector('[data-feedback-demo="placement"]');
    const placementTargets = placementDemo.querySelectorAll('.yoya-vtooltip');

    expect(page.querySelector('h1').textContent).toBe('vTooltip 提示');
    expect(demos).toHaveLength(2);
    expect(placementTargets).toHaveLength(8);

    placementTargets[0]
      .querySelector('.yoya-vtooltip-target')
      .dispatchEvent(new MouseEvent('mouseenter', { bubbles: false }));
    expect(placementTargets[0].dataset.open).toBe('true');

    const triggerDemo = page.querySelector('[data-feedback-demo="trigger"]');
    triggerDemo.querySelector('.yoya-vbutton').click();
    expect(triggerDemo.querySelector('.yoya-vtooltip').dataset.open).toBe('true');

    document
      .querySelector('.components-workspace')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(triggerDemo.querySelector('.yoya-vtooltip').dataset.open).toBeUndefined();

    const placementSource = placementDemo.querySelector('[data-source-example]').textContent;
    expect(placementSource).toContain('export function TooltipPlacementExample1');
    expect(placementSource).toContain("import { section, vTooltip } from 'yoya-ui';");
    expect(placementSource).toContain("'top-left'");
    expect(placementSource).toContain("'bottom-left'");
  });

  it('renders the vButtons documentation page with grouped and selectable demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/general/button-group');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮组');
    });

    const page = document.querySelector('[data-component-route-item="general:button-group"]');
    expect(page.querySelector('h1').textContent).toBe('vButtons 按钮组');
    expect(page.querySelectorAll('[data-button-group-demo]')).toHaveLength(3);
    expect(page.querySelectorAll('[data-button-group-demo] [data-source-example]')).toHaveLength(3);
    expect(
      page.querySelector('[data-button-group-demo="basic"] [data-source-example]').textContent
    ).toContain("import { vButtons } from 'yoya-ui';");

    const selectDemo = page.querySelector('[data-button-group-demo="select"]');
    const runningButton = [...selectDemo.querySelectorAll('.yoya-vbutton')].find((button) =>
      button.textContent.includes('运行中')
    );

    runningButton.click();

    expect(selectDemo.querySelector('[data-button-group-output]').textContent).toBe('running');

    const joinedDemo = page.querySelector('[data-button-group-demo="joined"]');
    const cardButton = [...joinedDemo.querySelectorAll('.yoya-vbutton')].find((button) =>
      button.textContent.includes('卡片')
    );

    cardButton.click();

    expect(joinedDemo.querySelector('[data-button-group-joined-output]').textContent).toBe('card');
  });

  it('renders the vFloatButton documentation page with icon and label demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/general/float-button');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('悬浮按钮');
    });

    const page = document.querySelector('[data-component-route-item="general:float-button"]');
    expect(page.querySelector('h1').textContent).toBe('vFloatButton 悬浮按钮');
    expect(page.querySelectorAll('[data-float-button-demo]')).toHaveLength(3);
    expect(page.querySelectorAll('[data-float-button-demo] [data-source-example]')).toHaveLength(3);
    expect(
      page.querySelector('[data-float-button-demo="basic"] [data-source-example]').textContent
    ).toContain("import { PlusOutlined, div, vFloatButton, vText } from 'yoya-ui';");

    const basicDemo = page.querySelector('[data-float-button-demo="basic"]');
    basicDemo.querySelector('.yoya-vfloat-button').click();

    expect(basicDemo.querySelector('[data-float-button-output]').textContent).toBe(
      '已触发新建操作'
    );
  });

  it('renders the vRadio documentation page with group and form demos', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/form/radio');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('单选框');
    });

    const page = document.querySelector('[data-component-route-item="form:radio"]');
    expect(page.querySelector('h1').textContent).toBe('vRadio 单选框');
    expect(page.querySelectorAll('[data-radio-demo]')).toHaveLength(3);
    expect(page.querySelectorAll('[data-radio-demo] [data-source-example]')).toHaveLength(3);
    expect(
      page.querySelector('[data-radio-demo="group"] [data-source-example]').textContent
    ).toContain("import { div, vRadios, vText } from 'yoya-ui';");

    const groupDemo = page.querySelector('[data-radio-demo="group"]');
    const prodInput = [...groupDemo.querySelectorAll('input')][2];
    prodInput.checked = true;
    prodInput.dispatchEvent(new Event('change', { bubbles: true }));

    expect(groupDemo.querySelector('[data-radio-group-output]').textContent).toBe('prod');

    const formDemo = page.querySelector('[data-radio-demo="form"]');
    const buttons = [...formDemo.querySelectorAll('button')];
    const submitButton = buttons.find((button) => button.textContent.includes('提交'));
    const clearButton = buttons.find((button) => button.textContent.includes('清空'));
    const formOutput = formDemo.querySelector('[data-radio-form-output]');

    submitButton.click();
    expect(formOutput.textContent).toBe('已提交：rolling');

    clearButton.click();
    submitButton.click();
    expect(formOutput.textContent).toBe('校验未通过');
  });

  it('renders the reusable source helper as an object component', () => {
    function SampleCard() {
      return {
        render() {
          return 'sample';
        }
      };
    }

    const sourceText = componentSource(SampleCard, ['vCard']);
    const sourcePanel = ComponentSource({
      component: SampleCard,
      imports: ['vCard'],
      title: '示例源码'
    });
    const element = sourcePanel.render().renderDom();

    expect(sourceText).toBe(`import { vCard } from 'yoya-ui';

export function SampleCard() {
  return {
    render() {
      return 'sample';
    }
  };
}`);
    const customImportSource = componentSource(SampleCard, [
      { from: 'yoya-ui', names: ['vCard'] },
      { from: 'yoya-ui/echart', names: ['vEchart'] }
    ]);
    expect(customImportSource).toContain("import { vCard } from 'yoya-ui';");
    expect(customImportSource).toContain("import { vEchart } from 'yoya-ui/echart';");
    expect(element.classList.contains('source-panel')).toBe(true);
    expect(element.querySelector('h2').textContent).toBe('示例源码');
  });

  it('renders router demos inside isolated iframes without touching the parent URL', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/navigation/router');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('路由');
    });

    const routerPage = document.querySelector('[data-navigation-docs="router"]');
    const linksFrame = routerPage.querySelector(
      '[data-navigation-demo="links"] [data-navigation-demo-frame]'
    );
    const declarativeFrame = routerPage.querySelector(
      '[data-navigation-demo="declarative"] [data-navigation-demo-frame]'
    );
    const historyFrame = routerPage.querySelector(
      '[data-navigation-demo="history"] [data-navigation-demo-frame]'
    );

    expect(linksFrame).not.toBeNull();
    expect(declarativeFrame).not.toBeNull();
    expect(historyFrame).not.toBeNull();
    expect(linksFrame.getAttribute('src')).toContain('router-links.html');
    expect(declarativeFrame.getAttribute('src')).toContain('declarative-router.html');
    expect(historyFrame.getAttribute('src')).toContain('router-history.html');
    expect(routerPage.querySelector('.yoya-vrouter-view')).toBeNull();
    expect(window.location.hash).toContain('/components/navigation/router');

    await openRoute('/components/navigation/router-views');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('路由视图');
    });

    const viewsPage = document.querySelector('[data-navigation-docs="router-views"]');
    const editorFrame = viewsPage.querySelector(
      '[data-navigation-demo="editor"] [data-navigation-demo-frame]'
    );
    const topFrame = viewsPage.querySelector(
      '[data-navigation-demo="top"] [data-navigation-demo-frame]'
    );

    expect(editorFrame).not.toBeNull();
    expect(topFrame).not.toBeNull();
    expect(editorFrame.getAttribute('src')).toContain('router-views.html');
    expect(topFrame.getAttribute('src')).toContain('router-views-top.html');
    expect(viewsPage.querySelector('.yoya-vrouter-views')).toBeNull();
    expect(window.location.hash).toContain('/components/navigation/router-views');
  });

  it('renders the anchor demo inside an isolated iframe', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/navigation/anchor');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('锚点');
    });

    const page = document.querySelector('[data-navigation-docs="anchor"]');
    const frame = page.querySelector('[data-navigation-demo="basic"] [data-navigation-demo-frame]');

    expect(frame).not.toBeNull();
    expect(frame.getAttribute('src')).toContain('anchor.html');
    expect(page.querySelector('.yoya-vanchor')).toBeNull();
    expect(window.location.hash).toContain('/components/navigation/anchor');
  });

  it('opens the glow button demo under the effects category', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/effects/glow-button');

    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('按钮');
    });

    const page = document.querySelector('[data-glow-button-docs]');
    expect(page).not.toBeNull();
    expect(page.querySelectorAll('.yoya-vglow-button').length).toBeGreaterThan(0);
    const glowButton = page.querySelector('.yoya-vglow-button');
    expect(glowButton.classList.contains('yoya-vbutton')).toBe(true);
    expect(glowButton.dataset.glowPlay).toBe('auto');
  });
});
