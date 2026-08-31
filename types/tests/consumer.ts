/**
 * Type-level smoke test: exercises the public API through the package's own
 * `exports` map. Run with `npm run typecheck`.
 */
import {
  VButton,
  div,
  flex,
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
  createI18n,
  renderToString,
  router,
  toast,
  SearchOutlined
} from 'yoya-ui';
import { ElementNode, vStateNode } from 'yoya-ui/core';
import { vEchart } from 'yoya-ui/echart';
import { hydrate, mount, parseState, renderToString as ssrRender } from 'yoya-ui/ssr';
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

// State node with typed state.
const counter = vStateNode<{ count: number }>({
  state: { count: 0 },
  render(state) {
    return div(String(state.count));
  }
});
counter.setState({ count: 5 });

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

const hydrated = hydrate(() => div('hello'), '#app', {});
const mounted = mount(() => div('hello'), document.body);
void hydrated;
void mounted;

// ECharts component and icons.
vEchart((chart) => {
  chart.option({ series: [] });
  chart.height('300px');
});

SearchOutlined().className('yoya-icon');

// ElementNode generic helpers.
const node: ElementNode = div('x');
node.child(vText('y'));

// Keep variables referenced to avoid unused-import lint concerns.
void page;
void buttonNode;
void badge;
void form;
void layout;
void counter;
void ssrRender;
void i18n;
