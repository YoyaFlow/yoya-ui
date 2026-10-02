/**
 * 入口：把页面声明（JSON）交给 yoya-ui 渲染。
 *
 * 页面声明是**真相**（可 diff / review），这里只做三件事：
 *   ① 建 GenUI 实例并装上 yoya-ui 插件（基础库能力面）；
 *   ② 把取数转发（`custodians`）接上 —— 页面只写逻辑名，地址由环境给，缺地址当场报错；
 *   ③ 绑到 DOM。
 */
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { plugin as yoyaUIPlugin } from '@yoyaflow/yoya-ui/genui-plugin';
import ordersList from './pages/orders-list.genui.json';
import ordersNew from './pages/orders-new.genui.json';
import { custodians } from './actions.js';

/** 模板不做路由：两页用 `?page=new` 切（真做多页请上 yoya-ui 的 router）。 */
const PAGES = { list: ordersList, new: ordersNew };
const which = new URLSearchParams(location.search).get('page') ?? 'list';
const page = PAGES[which] ?? ordersList;

const genui = createGenUI();
genui.use(yoyaUIPlugin);

/**
 * 取数转发：缺地址**不当场炸页面** —— 把问题记进控制台，页面照样渲染，
 * 数据那条线由运行时报到 `/ui/errors/<name>`（缺地址 ≠ 白屏，但也绝不静默给空表）。
 */
let custodianTree = {};
try {
  custodianTree = custodians();
} catch (error) {
  console.error('[genui] 取数转发没配好：', error.message);
}

const surface = genui.fromJson(page, {
  // 数据面：页面里 `@actions:/orders_page` 只能来自这张表（页面拿不到地址本身）
  custodians: custodianTree,
  onWarn: (message) => console.warn('[genui]', message)
});

surface.bindTo(document.getElementById('app'));
