/** 取数转发（只写逻辑名，地址由环境给）—— 与 apps/main 各写各的，**不共用文件**。 */
export const ROUTES = {
  orders_page: { logical: 'orders-db', method: 'GET', path: '/orders', params: ['page', 'pageSize'] }
};

function resolveHost(logical) {
  const base = (globalThis.__GENUI_HOSTS__ ?? {})[logical];
  if (!base) throw new Error(`缺少地址：逻辑来源 "${logical}" 没有配置（运行时目录的 hosts 表 / 部署方提供）`);
  return String(base).replace(/\/+$/, '');
}

export function custodians() {
  const actions = {};
  for (const [key, route] of Object.entries(ROUTES)) {
    actions[key] = { type: 'http', method: route.method, url: resolveHost(route.logical) + route.path, key };
  }
  return { actions };
}
