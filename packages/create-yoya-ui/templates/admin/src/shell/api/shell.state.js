// 外壳状态类：会话（用户/角色/权限）+ 菜单 + 导航状态（当前模块 / 当前路径）的唯一事实源。
// 导航字段用 ref 持有——组件绑句柄 / 读信号，写句柄即完成通知，不需要额外订阅转发。
// load() 先加载会话并注入全局权限上下文，再按权限过滤菜单、创建路由并订阅导航。
import { ref } from '@yoyaflow/yoya-ui';
import { createAccess, currentAccess, installAccess } from '@yoyaflow/yoya-ui';
import ShellReq from './shell.req.js';
import { createAppRouter } from '../router.js';

export default class ShellState {
  constructor() {
    // 视图字段：顶栏 / 侧栏从这里派生高亮
    this.menus = ref([]);
    this.activeModuleKey = ref(null);
    this.activePath = ref(null);
    // 会话数据不参与渲染，按普通值持有
    this.user = null;
    this.permissions = [];
    this.roles = [];
    this._router = null;
    this._unsubscribeRouter = null;
  }

  router() {
    return this._router;
  }

  async load() {
    await this.loadSession();

    const result = await ShellReq.QueryMenus().submit();
    this.menus.value = filterMenusByAccess(result.data);
    this._router = createAppRouter(this.menus.value);
    // 路由是外部事件源：订阅它把路径写回导航信号（组件读信号，不再需要二次通知）
    this._unsubscribeRouter = this._router.subscribe((context) => this.syncFromPath(context.path));
    return result;
  }

  // 加载会话：当前用户 / 角色 / 权限码，并注入全局权限上下文。
  async loadSession() {
    const result = await ShellReq.Me().submit();
    this.user = result.data.user;
    this.permissions = [...(result.data.permissions || [])];
    this.roles = [...(result.data.roles || [])];
    installAccess(createAccess({ permissions: this.permissions, roles: this.roles }));
    return result;
  }

  start() {
    this._router?.start();
    return this;
  }

  // 顶栏切换模块：进入模块首个路由。
  switchModule(module) {
    const first = module?.routes?.[0];
    if (first) {
      this._router?.navigate(first.path);
    }
    return this;
  }

  // 侧栏 / 任意入口：打开指定路径。
  navigate(path) {
    this._router?.navigate(path);
    return this;
  }

  // 路由回调 → 写入导航信号（值相同不通知，重复同步无副作用）。
  syncFromPath(path) {
    const module = this.menus
      .peek()
      .find((entry) => entry.routes.some((route) => route.path === path));
    this.activePath.value = path;
    if (module) {
      this.activeModuleKey.value = module.key;
    }
    return this;
  }

  destroy() {
    this._unsubscribeRouter?.();
  }
}

// 菜单按当前访问上下文过滤：无 permCode 的路由放行，无读权限的路由隐藏。
function filterMenusByAccess(menus) {
  const access = currentAccess();
  if (!access) {
    return menus;
  }

  return menus
    .map((module) => ({
      ...module,
      routes: module.routes.filter((route) => !route.permCode || access.canRead(route.permCode))
    }))
    .filter((module) => module.routes.length > 0);
}
