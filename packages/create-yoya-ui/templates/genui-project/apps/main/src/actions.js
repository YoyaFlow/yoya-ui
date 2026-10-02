/**
 * 取数转发（本 UI 唯一的"行为"入口）—— 纪律：**只写逻辑名，不写地址**。
 *
 * 真实地址由环境给：
 * - 本机开发：运行时目录里的解析表（机器绑定，不进 Git）；
 * - 部署：部署方注入 `globalThis.__GENUI_HOSTS__`（`genui.export.json` 里占位）。
 * **缺地址就当场报错**（不静默返回空表）—— 这是"换环境只换 host"能成立的前提。
 */

/** 逻辑名 → 路由（方法 / 路径 / 参数名；导出时进 `genui.export.json`）。 */
export const ROUTES = {
  orders_page: {
    logical: 'orders-db',
    method: 'GET',
    path: '/orders',
    params: ['keyword', 'status', 'page', 'pageSize']
  },
  /** 写：`vButton` 的 `$action: orders_create` 走这条（POST + JSON body）。 */
  orders_create: {
    logical: 'orders-db',
    method: 'POST',
    path: '/orders',
    params: ['customer', 'amount', 'status', 'owner']
  }
};

/** 逻辑来源名 → 地址。 */
function resolveHost(logical) {
  const hosts = globalThis.__GENUI_HOSTS__ ?? {};
  const base = hosts[logical];
  if (!base) {
    throw new Error(
      `缺少地址：逻辑来源 "${logical}" 没有配置。` +
        '本机开发请配运行时目录的解析表（~/.genui），部署时请由部署方提供 hosts。'
    );
  }
  return String(base).replace(/\/+$/, '');
}

/**
 * 组装成宿主约定的**保管者树**：`{ actions: { <key>: { type, method, url } } }`。
 * 页面里写 `@actions:/orders_page`，运行时就按这张表取数。
 */
export function custodians() {
  const actions = {};
  for (const [key, route] of Object.entries(ROUTES)) {
    const base = resolveHost(route.logical);
    actions[key] = { type: 'http', method: route.method, url: base + route.path, key };
  }
  return { actions };
}
