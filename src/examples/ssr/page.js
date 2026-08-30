import {
  createI18n,
  createRouter,
  div,
  vClientOnly,
  vForm,
  vFormItem,
  vInput,
  vLink
} from '../../index.js';
import { vEchart } from '../../yoya.echart.js';

const messages = {
  'zh-CN': {
    chart: '图表',
    chartPage: '图表页',
    email: '邮箱',
    title: 'SSR 示例',
    welcome: '欢迎使用服务端渲染'
  },
  'en-US': {
    chart: 'Chart',
    chartPage: 'Chart Page',
    email: 'Email',
    title: 'SSR Demo',
    welcome: 'Welcome to SSR'
  }
};

const chartOption = {
  xAxis: { data: ['A', 'B', 'C'], type: 'category' },
  yAxis: { type: 'value' },
  series: [{ data: [1, 3, 2], type: 'bar' }]
};

/**
 * SSR 页面工厂：每请求创建独立实例，locale 与当前路由来自请求上下文。
 * 服务端与客户端都调用 createSsrPage(initialState)，保证双端一致。
 */
export function createSsrPage(initial = {}) {
  const locale = createI18n({ language: initial.locale || 'zh-CN', messages });
  const router = createRouter();
  router.mode(initial.mode || 'hash');
  router.route('/home', locale.t('welcome'));
  router.route('/chart', locale.t('chartPage'));
  router.notFound('未找到');

  const form = vForm();
  const emailItem = vFormItem({ label: locale.t('email'), name: 'email', required: true });
  emailItem.control(vInput({ name: 'email', placeholder: locale.t('email') }));
  form.child(emailItem);
  form.validate();

  const page = div((root) => {
    root.h1(locale.t('title'));
    root.nav((nav) => {
      nav.child(vLink(router, { label: locale.t('welcome'), to: '/home' }));
      nav.child(vLink(router, { label: locale.t('chart'), to: '/chart' }));
    });
    root.child(router);
    root.child(form);
    root.child(vClientOnly(() => vEchart({ option: chartOption })));
  });

  router.renderPath(initial.path || '/home');
  return page;
}
