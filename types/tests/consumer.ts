/**
 * Type-level smoke test: exercises the public API through the package's own
 * `exports` map. Run with `npm run typecheck`.
 */
import {
  VButton,
  div,
  flex,
  htmls,
  vBadge,
  vButton,
  vCard,
  vCardBody,
  vDetail,
  vDetailItem,
  vForm,
  vInput,
  vPagination,
  vSelect,
  vTable,
  vTabs,
  vTree,
  vText,
  computed,
  createI18n,
  EMPTY_CHILDREN,
  appendNodeChild,
  elementAttrs,
  elementClassNames,
  elementHasClass,
  elementStyles,
  installSignals,
  isKeySet,
  keySet,
  li,
  nodeChildren,
  ref,
  renderToString,
  router,
  svgs,
  toast,
  ul,
  SearchOutlined
} from 'yoya-ui';
import { ElementNode, ViewNode } from 'yoya-ui/core';
import { configureRequest, RequestBase, Result } from 'yoya-ui/api';
import {
  VButton as ActionsVButton,
  vButton as actionsVButton,
  vFloatButton as actionsVFloatButton
} from 'yoya-ui/actions';
import {
  VBreadcrumb as NavigationVBreadcrumb,
  VMenu as NavigationVMenu,
  VTabs as NavigationVTabs,
  vBreadcrumb as navigationVBreadcrumb,
  vMenu as navigationVMenu,
  vTabs as navigationVTabs
} from 'yoya-ui/navigation';
import {
  VDialog as FeedbackVDialog,
  VMessage as FeedbackVMessage,
  VTooltip as FeedbackVTooltip,
  toast as feedbackToast,
  vDialog as feedbackVDialog,
  vMessage as feedbackVMessage,
  vTooltip as feedbackVTooltip
} from 'yoya-ui/feedback';
import {
  VForm as FormVForm,
  VInput as FormVInput,
  VSelect as FormVSelect,
  vCheckbox as formVCheckbox,
  vForm as formVForm,
  vInput as formVInput,
  vRate as formVRate,
  vSelect as formVSelect,
  vUpload as formVUpload
} from 'yoya-ui/form';
import {
  VBadge as DisplayVBadge,
  VTable as DisplayVTable,
  vBadge as displayVBadge,
  vPagination as displayVPagination,
  vTable as displayVTable,
  vTree as displayVTree
} from 'yoya-ui/data-display';
import {
  vDynamicLoader as asyncVDynamicLoader,
  vLazyImage as asyncVLazyImage,
  vSkeleton as asyncVSkeleton
} from 'yoya-ui/async';
import { vEchart } from 'yoya-ui/echart';
import { vThree } from 'yoya-ui/three';
import { vLink, vRoute, vRouter } from 'yoya-ui/router';
import type { SignalsAdapter } from 'yoya-ui/core';
import { hydrate, mount, parseState, renderToString as ssrRender } from 'yoya-ui/router';
import {
  disableDevtools,
  enableDevtools,
  isDevtoolsEnabled,
  subscribeDevtools
} from 'yoya-ui/devtools';
import 'yoya-ui/ui.css';

// Element factories accept callback/text/object forms.
const page = div((root) => {
  root.className('page');
  root.style({ padding: '16px' });

  root.vButton('启动任务', (button) => {
    button.variant('primary');
    button.size('large');
    button.on('click', () => toast.success('任务已启动'));
  });

  root.flex({ gap: 8, direction: 'column' }, (column) => {
    column.vCard((card) => {
      card.vCardHeader('服务详情');
      card.vCardBody((body) => {
        body.vDetail((detail) => {
          detail.vDetailItem('服务名称', 'api-gateway');
          detail.vDetailItem('状态', '运行中');
        });
      });
    });
  });

  root.vInput((input) => {
    input.placeholder('请输入');
    input.clearable(true);
  });

  root.vSelect((select) => {
    select.options([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b' }
    ]);
  });
});

// Communication contracts live in their own API entry.
const requestCommand: RequestBase = new RequestBase();
const requestResult: Result<string> = Result.from({ ok: true, data: 'ok' });
void configureRequest({ submit: () => ({ ok: true, data: null }) });
void requestCommand;
void requestResult;

// Return types are concrete node types.
const buttonNode: VButton = vButton('label', (b) => b.variant('danger'));
const badge = vBadge('notifications').count(3);
const form = vForm((f) => {
  f.vFormItem((item) => {
    item.name('name');
    item.label('名称');
  });
});

// Layout options autocomplete and node helpers.
const layout = flex({ gap: 12, justify: 'space-between' }, (f) => {
  f.child(div('left'), div('right'));
});

// Node-internals helpers: class-node components touch child lists / classes / styles / attrs through these.
const helperBox = div('x');
appendNodeChild(helperBox, li('y'));
const helperChildren: ViewNode[] = nodeChildren(helperBox);
elementStyles(helperBox).color = 'red';
elementAttrs(helperBox)['data-mode'] = 'dark';
const helperClasses: string[] = elementClassNames(helperBox);
const helperHasClass: boolean = elementHasClass(helperBox, 'acme-badge');
void helperChildren;
void helperClasses;
void helperHasClass;
void EMPTY_CHILDREN;

// keySet: a key-addressed container that hands per-row apis to keyed().
const keySetRows = keySet<{ id: number; label: string }>(
  [],
  (row) => row.id,
  (item) => {
    item.api.selected = ref(false);
  }
);
const keySetEntry = keySetRows.item(1);
if (keySetEntry) {
  keySetEntry.data.label = keySetEntry.data.label.toUpperCase();
}
keySetRows.remove(1);
const keySetList = ul((root) => {
  root.keyed(keySetRows, (item, index) => li(`${item.data.label}@${index}`));
});
void isKeySet(keySetRows);
void keySetList;

// Data display components.
vTable((table) => {
  table.columns([
    { key: 'name', title: '名称', dataIndex: 'name' },
    { key: 'status', title: '状态', render: (value) => vBadge(String(value)) }
  ]);
  table.rows([
    { name: 'gateway', status: 'running' },
    { name: 'worker', status: 'idle' }
  ]);
});

vTabs((tabs) => {
  tabs.items([
    { key: 'a', label: '概览', content: div('A') },
    { key: 'b', label: '设置', content: div('B') }
  ]);
  tabs.change((key) => void key);
});

const pagination = vPagination({ total: 120 });
pagination.page(2).pageSize(20);

const tree = vTree({
  nodes: [{ id: 'root', label: '根节点', children: [{ id: 'a', label: 'A' }] }],
  checkable: true
});
tree.expandAll().checkedKeys(['a']);

// Rebuildable region API.
const region = div((ele) => {
  ele.rebuildable(() => true);
  ele.child('region');
});
region.rebuildable(null);
region.rebuild();
region.rebuild({ force: true });
const rebuildPending: boolean = region.rebuildPending();
void rebuildPending;
region.flush();
region.flushAll();

// Signals drive values: handles go straight into value positions.
const count = ref(0);
const counter = div((ele) => {
  ele.attr('data-count', count);
  ele.child(vText(computed(() => `count=${count.value}`)));
});
counter.flush();

// Text positions take handles directly: HTML child() and SVG text hosts.
const label = ref('待处理');
const labelLine = div((ele) => ele.child(vText(label)));
const labelChild = div((ele) => ele.child(label));
const labelText = svgs.text((line) => line.text(label));
void labelLine;
void labelChild;
void labelText;

// Element value positions take literals, signal handles and zero-argument readers.
const readerCount = ref(3);
const readerNode = div((ele) => {
  ele.attr('data-count', readerCount);
  ele.attr('data-doubled', () => readerCount.value * 2);
  ele.style('width', () => `${readerCount.value}px`);
  ele.styles({ opacity: () => (readerCount.value > 0 ? 1 : 0) });
  ele.toggleClass('is-many', () => readerCount.value > 1);
  ele.child(vText(() => `count=${readerCount.value}`));
});
readerNode.mountable(() => readerCount.value > 0);
readerNode.flush();
void readerNode;

// @ts-expect-error parameterized readers are rejected at runtime and by the types
readerNode.attr('data-invalid', (value: string) => value);

// Component props take handles; readers belong to element value positions.
const propName = ref('待处理');
const propInput = vInput({ name: 'prop', value: propName, placeholder: '搜索' });
void propInput;

// Keyed children, event removal and class toggling are part of the node API.
const keyedHost = div((ele) => {
  ele.addChild('row-1', ele.span('A'));
  ele.getChild('row-1');
  ele.removeChild('row-1');
  ele.on('click', () => {});
  ele.off('click');
  ele.toggleClass('is-active', true);
  ele.toggleClass('is-busy', label);
});
void keyedHost;

// Row-level update protocol: keep the node when the row is content-equivalent,
// or update it in place when it really changed.
const keyedRows = ref([{ id: 1, title: 'A' }]);
const keyedWithProtocol = ul((ele) => {
  ele.keyed(
    keyedRows,
    (row) => row.id,
    (row) => li((item) => item.child(vText(row.title))),
    {
      equals: (previous, next) => previous.title === next.title,
      update: (node, previous, next) => {
        void previous;
        void next;
        return node;
      }
    }
  );
});
void keyedWithProtocol;

// htmls namespace: every WHATWG tag factory on one object, style alias included.
const byNamespace = htmls.div((root) => root.span('via htmls'));
const styleFactory = htmls.style;
const htmlFactory = htmls.html;
void byNamespace;
void styleFactory;
void htmlFactory;

// i18n.
const i18n = createI18n({
  language: 'zh-CN',
  messages: {
    'zh-CN': { hello: '你好' },
    en: { hello: 'Hello' }
  }
});
i18n.setLanguage('en');
const translated = i18n.t('hello');
void translated;

// Router.
router((r) => {
  r.mode('hash');
  r.default('/home');
  r.route('/home', () => div('首页'));
  r.notFound(() => div('404'));
  r.start();
  r.navigate('/home');
});

// SSR helpers.
const result = renderToString(() => div('hello'), { state: { path: '/home' } });
const serialized = result.state;
const parsed = parseState(serialized);
void parsed;

// Pluggable state engine: the adapter contract is public and plugins are user-written
// (the examples site ships a copy-paste template).
const myEngine: SignalsAdapter = {
  name: 'my-engine',
  createSignal: (initial: unknown) => ({ value: initial, listeners: new Set<() => void>() }),
  read: (source: any) => source.value,
  write: (source: any, value: unknown) => {
    source.value = value;
    source.listeners.forEach((listener: () => void) => listener());
  },
  subscribe: (source: any, listener: (value: unknown) => void) => {
    const notify = () => listener(source.value);
    source.listeners.add(notify);
    return () => source.listeners.delete(notify);
  },
  batch: <T>(run: () => T) => run()
};
installSignals(myEngine);
installSignals(null);

const hydrated = hydrate(() => div('hello'), '#app', {});
const mounted = mount(() => div('hello'), document.body);
void hydrated;
void mounted;

// Document routes: internal HTML addresses and external links jump as real documents.
const documentRouter = vRouter({
  routes: [
    vRoute('/legacy/report.html', { title: '旧报表', url: true }),
    vRoute('/docs', { target: '_blank', url: 'https://example.com/docs' })
  ]
});
documentRouter.navigateDocument('/legacy/report.html', { replace: true });
const documentLink = vLink(documentRouter, { label: '文档', to: '/docs' });
void documentLink;

// ECharts component and icons.
vEchart((chart) => {
  chart.option({ series: [] });
  chart.height('300px');
});

// Three.js component and lifecycle api.
vThree((three) => {
  three.autoRender(false);
  three.height('320px');
  three.onReady(({ renderer, scene }) => {
    renderer.render(scene, three.getCamera());
  });
});

SearchOutlined().className('yoya-icon');

// ElementNode generic helpers.
const node: ElementNode = div('x');
node.child(vText('y'));

// Devtools opt-in runtime lives on its own subpath.
enableDevtools();
const devtoolsEnabled: boolean = isDevtoolsEnabled();
const stopDevtools: () => void = subscribeDevtools((event) => {
  const eventType: string = event.type;
  void eventType;
});
disableDevtools();
void devtoolsEnabled;
void stopDevtools;

// Keep variables referenced to avoid unused-import lint concerns.
void page;
void buttonNode;
void badge;
void form;
void layout;
void counter;
void ssrRender;
void i18n;

// Category subpath entries resolve to the same component contracts.
void ActionsVButton;
void actionsVButton;
void actionsVFloatButton;
void NavigationVBreadcrumb;
void NavigationVMenu;
void NavigationVTabs;
void navigationVBreadcrumb;
void navigationVMenu;
void navigationVTabs;
void FeedbackVDialog;
void FeedbackVMessage;
void FeedbackVTooltip;
void feedbackToast;
void feedbackVDialog;
void feedbackVMessage;
void feedbackVTooltip;
void FormVForm;
void FormVInput;
void FormVSelect;
void formVCheckbox;
void formVForm;
void formVInput;
void formVRate;
void formVSelect;
void formVUpload;
void DisplayVBadge;
void DisplayVTable;
void displayVBadge;
void displayVPagination;
void displayVTable;
void displayVTree;
void asyncVDynamicLoader;
void asyncVLazyImage;
void asyncVSkeleton;
