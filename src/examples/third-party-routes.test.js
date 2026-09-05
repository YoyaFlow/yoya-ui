import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('quill', () => {
  return {
    default: class FakeQuill {
      constructor(root, options) {
        this.root = root;
        this.options = options;
      }

      destroy() {}

      getSemanticHTML() {
        return '<p>hello yoya-ui</p>';
      }

      getText() {
        return 'hello yoya-ui';
      }
    }
  };
});

vi.mock('ag-grid-community', () => {
  return {
    AllCommunityModule: { moduleName: 'AllCommunity' },
    colorSchemeDark: {},
    ModuleRegistry: { registerModules: vi.fn() },
    themeQuartz: { withPart: vi.fn(() => ({})) },
    createGrid: (root, options) => ({
      destroy() {},
      options,
      root,
      setGridOption() {}
    })
  };
});

vi.mock('leaflet', () => {
  const layer = { addTo: vi.fn() };
  const map = {
    flyTo: vi.fn(),
    invalidateSize: vi.fn(),
    remove: vi.fn()
  };

  return {
    default: {
      circleMarker: vi.fn(() => layer),
      map: vi.fn(() => map),
      tileLayer: vi.fn(() => layer)
    }
  };
});

vi.mock('codemirror', () => {
  return {
    EditorView: class FakeEditorView {
      constructor(config) {
        this.config = config;
        this.state = { doc: { length: 1, toString: () => '' } };
      }

      destroy() {}

      dispatch() {}
    },
    basicSetup: {}
  };
});

vi.mock('@codemirror/lang-javascript', () => ({
  javascript: () => ({})
}));

vi.mock('@toast-ui/editor/viewer', () => ({
  default: class FakeViewer {
    constructor(config) {
      this.config = config;
    }

    destroy() {}

    setMarkdown() {}
  }
}));

vi.mock('@toast-ui/editor', () => ({
  default: class FakeEditor {
    constructor(config) {
      this.config = config;
    }

    destroy() {}

    getMarkdown() {
      return this.config.initialValue;
    }

    on() {}
  }
}));

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

describe('third-party interop routes', () => {
  it('renders the interop overview with five demos and the integration policy', async () => {
    root = renderExamplesIndex('#app');

    await openRoute('/components/third-party/overview');
    await vi.waitFor(() => {
      expect(selectedRouteTitle()).toBe('互操作概览');
    });

    const page = document.querySelector('[data-interop-overview]');
    expect(page).not.toBeNull();
    expect(page.querySelectorAll('[data-interop-demo]')).toHaveLength(5);
    expect(page.textContent).toContain('vClientOnly');
  });

  it.each([
    ['quill', 'Quill 富文本', 'Quill 富文本编辑器', 'data-quill-host'],
    ['ag-grid', 'AG Grid 表格', 'AG Grid Community 数据表格', 'data-ag-grid-host'],
    ['leaflet', 'Leaflet 地图', 'Leaflet 地图', 'data-leaflet-host'],
    ['codemirror', 'CodeMirror 编辑', 'CodeMirror 6 代码编辑', 'data-codemirror-host'],
    [
      'markdown-viewer',
      'Markdown 查看',
      'Toast UI Viewer Markdown 查看',
      'data-markdown-viewer-host'
    ]
  ])(
    'renders the %s demo page with a mounted live host and source panel',
    async (key, menuTitle, heading, hostAttribute) => {
      root = renderExamplesIndex('#app');

      await openRoute(`/components/third-party/${key}`);
      await vi.waitFor(() => {
        expect(selectedRouteTitle()).toBe(menuTitle);
      });

      const page = document.querySelector(`[data-third-party-docs="${key}"]`);
      expect(page).not.toBeNull();
      expect(page.querySelector('h1').textContent).toBe(heading);
      const demoSections = page.querySelectorAll('[data-third-party-demo]');
      expect(demoSections.length).toBe(key === 'ag-grid' ? 4 : 1);
      demoSections.forEach((demoSection) => {
        expect(demoSection.querySelector('[data-third-party-demo-live]')).not.toBeNull();
        expect(
          demoSection.querySelector(
            hostAttribute === 'data-quill-host' ? '[data-quill-host]' : `[${hostAttribute}]`
          )
        ).not.toBeNull();
        const sourceExamples = Array.from(demoSection.querySelectorAll('[data-source-example]'));
        if (key === 'ag-grid') {
          expect(sourceExamples.length).toBe(1);
          expect(
            sourceExamples.some((node) => node.dataset.sourceExample.includes('使用案例源码'))
          ).toBe(true);
        } else {
          expect(sourceExamples.length).toBe(2);
          expect(
            sourceExamples.some((node) => node.dataset.sourceExample.includes('胶水类源码'))
          ).toBe(true);
          expect(
            sourceExamples.some((node) => node.dataset.sourceExample.includes('使用案例源码'))
          ).toBe(true);
        }
      });
      if (key === 'ag-grid') {
        expect(
          page.querySelector('[data-source-example="AG Grid 统一胶水入口源码"]')
        ).not.toBeNull();
      }
    }
  );
});
