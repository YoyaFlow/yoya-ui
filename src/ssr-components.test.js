// @vitest-environment node
// 无 DOM 环境下对全量组件做 SSR 冒烟：任何组件在 render()/toHTML() 路径
// 直接访问 document/window（如工厂阶段调用 renderDom）都会在这里暴露。
import { describe, expect, it } from 'vitest';
import { renderToString } from './yoya.ssr.js';
import {
  codeBlock,
  createI18n,
  createRouter,
  div,
  hstack,
  mobileLayout,
  responsiveGrid,
  vAnchor,
  vAvatar,
  vBadge,
  vBody,
  vBreadcrumb,
  vButton,
  vCard,
  vCarousel,
  vCascader,
  vChart,
  vCheckbox,
  vCol,
  vColorPicker,
  vContainer,
  vContextMenu,
  vDetail,
  vDialog,
  vDigitalBoard,
  vDropdownMenu,
  vField,
  vFloatButton,
  vForm,
  vGauge,
  vGlowButton,
  vImagePreview,
  vInput,
  vLazyImage,
  vMasonry,
  vMenu,
  vMessageContainer,
  vMessageManager,
  vNavbar,
  vPagination,
  vProgress,
  vRadio,
  vRate,
  vRingStat,
  vRouter,
  vRouterViews,
  vRow,
  vScroll,
  vSelect,
  vSidebar,
  vSkeleton,
  vSlider,
  vSparkline,
  vSplitPanel,
  vSteps,
  vSwitch,
  vTable,
  vTabs,
  vTextarea,
  vTimeline,
  vTooltip,
  vTransition,
  vTrendCard,
  vTree,
  vTreeRanger,
  vUpload
} from './index.js';

function buildAllComponentsPage() {
  const router = createRouter();
  router.mode('history');
  router.route('/home', '首页');
  router.notFound('未找到');
  router.renderPath('/home');
  const i18n = createI18n({ language: 'zh-CN' });

  return div((root) => {
    root.child(vButton('按钮'));
    root.child(vCard((card) => card.vCardBody('卡片')));
    root.child(vBadge({ count: 5, children: '徽标' }));
    root.child(vAvatar({ text: 'A' }));
    root.child(vDetail((d) => d.vDetailItem('名称', '值')));
    root.child(codeBlock({ content: 'code' }));
    root.child(vProgress({ percent: 40 }));
    root.child(vTable((t) => t.vTr((r) => r.vTd('x'))));
    root.child(vTree({ nodes: [{ id: 'a', label: '节点' }] }));
    root.child(vTreeRanger({ columns: [{ title: '列', load: () => [] }] }));
    root.child(vTimeline((tl) => tl.vTimelineItem('事件')));
    root.child(vTrendCard({ data: [1, 2, 3], title: '趋势' }));
    root.child(vRingStat({ percent: 50, label: '占比' }));
    root.child(vGauge({ value: 40 }));
    root.child(vSparkline({ data: [1, 2, 3] }));
    root.child(vDigitalBoard((b) => b.vDigitalBoardItem((i) => i.label('指标').value('1'))));
    root.child(vCarousel({ children: ['1', '2'] }));
    root.child(vScroll((s) => s.items([1, 2, 3], (n) => div(String(n)))));
    root.child(vSplitPanel({ first: '左', second: '右' }));
    root.child(vCol({ span: 6 }));
    root.child(vRow((r) => r.vCol({ span: 12 })));
    root.child(responsiveGrid({ minColumnWidth: 100, children: ['a'] }));
    root.child(mobileLayout({ children: 'mobile' }));
    root.child(vMasonry({ children: ['a', 'b'] }));
    root.child(vContainer((c) => c.vHeader('头').vMain('体').vFooter('脚')));
    root.child(vBody({ children: 'body' }));
    root.child(vTabs((tabs) => tabs.vTab({ key: 'a', label: 'A', content: 'A页' })));
    root.child(vSteps((s) => s.vStep({ title: '步骤' })));
    root.child(vPagination({ page: 1, total: 10 }));
    root.child(vBreadcrumb((b) => b.vBreadcrumbItem('首页')));
    root.child(vNavbar((n) => n.title('导航')));
    root.child(vMenu((m) => m.vMenuItem('菜单')));
    root.child(vDropdownMenu((d) => d.menuContent((m) => m.vMenuItem('项'))));
    root.child(vContextMenu((c) => c.menuContent((m) => m.vMenuItem('项'))));
    root.child(vSidebar((s) => s.vMenuGroup((g) => g.label('组'))));
    root.child(vAnchor((a) => a.vAnchorItem({ href: '#x', title: '锚点' })));
    root.child(vTooltip({ content: '提示' }));
    root.child(vDialog({ children: '弹窗' }));
    root.child(vMessageContainer());
    root.child(vMessageManager());
    root.child(vForm((f) => f.vInput({ name: 'x' })));
    root.child(vInput({ value: 'v' }));
    root.child(vTextarea({ value: 't' }));
    root.child(vSelect({ options: ['a', 'b'], value: 'a' }));
    root.child(vCheckbox({ label: '勾选' }));
    root.child(vRadio({ options: ['a', 'b'], value: 'a' }));
    root.child(vSwitch({ label: '开关' }));
    root.child(vRate({ value: 3 }));
    root.child(vSlider({ value: 50 }));
    root.child(vCascader({ options: [] }));
    root.child(vColorPicker());
    root.child(vUpload());
    root.child(vField((f) => f.label('字段').display('值')));
    root.child(vFloatButton({ label: '浮' }));
    root.child(vGlowButton('流光'));
    root.child(vSkeleton());
    root.child(vLazyImage({ src: '/a.png', alt: '图' }));
    root.child(vTransition({ children: '动效' }));
    root.child(vImagePreview({ src: '/a.png', alt: '图' }));
    root.child(
      vChart({
        adapter: { init: () => ({}), update() {}, resize() {}, destroy() {} },
        data: [1, 2]
      })
    );
    root.child(vRouterViews(router, { lockTitle: true, title: '工作区' }));
    root.child(vRouter(router));
    root.child(hstack((row) => row.p(i18n.t('hello', {}, 'zh-CN'))));
  });
}

describe('SSR 全组件冒烟（无 DOM）', () => {
  it('renders every component without touching document/window', () => {
    const { html } = renderToString(buildAllComponentsPage);
    expect(html.length).toBeGreaterThan(0);
  });

  it('is deterministic across renders', () => {
    const first = renderToString(buildAllComponentsPage).html;
    const second = renderToString(buildAllComponentsPage).html;
    expect(second).toBe(first);
  });
});
