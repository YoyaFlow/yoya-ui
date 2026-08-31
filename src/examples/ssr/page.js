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
export const createLocale = (initial = {}) =>
  createI18n({ language: initial.locale || 'zh-CN', messages });

export function createSsrPage(initial = {}, deps = {}) {
  const router = createRouter();
  router.mode(initial.mode || 'hash');
  router.route('/home', '欢迎使用服务端渲染'.s('welcome'));
  router.route('/chart', '图表页'.s('chartPage'));
  router.notFound('未找到');

  const form = vForm();
  const emailItem = vFormItem({ label: '邮箱'.s('email'), name: 'email', required: true });
  emailItem.control(vInput({ name: 'email', placeholder: '邮箱'.s('email') }));
  form.child(emailItem);
  form.validate();

  const page = div((root) => {
    root.h1('SSR 示例'.s('title'));
    root.nav((nav) => {
      nav.child(vLink(router, { label: '欢迎使用服务端渲染'.s('welcome'), to: '/home' }));
      nav.child(vLink(router, { label: '图表'.s('chart'), to: '/chart' }));
    });
    root.child(router);
    root.child(form);
    root.child(
      vClientOnly(() =>
        vEchart({
          echartsLib: deps.echartsLib,
          option: chartOption,
          renderer: 'svg'
        })
      )
    );
  });

  router.renderPath(initial.path || '/home');
  return page;
}
