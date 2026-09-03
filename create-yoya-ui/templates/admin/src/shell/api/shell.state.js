// 外壳状态类：会话（用户/角色/权限）+ 菜单 + 导航状态（当前模块 / 当前路径）的唯一事实源。
// load() 先加载会话并注入全局权限上下文，再按权限过滤菜单、创建路由并订阅导航。
import { createAccess, currentAccess, installAccess } from '@yoyaflow/yoya-ui';
import ShellReq from './shell.req.js';
import { createAppRouter } from '../router.js';

export default class ShellState {
  constructor() {
    this._menus = [];
    this._router = null;
    this._activeModuleKey = null;
    this._activePath = null;
    this._user = null;
    this._permissions = [];
    this._roles = [];
    this._listeners = new Set();
    this._unsubscribeRouter = null;
  }

  menus() {
    return this._menus;
  }

  user() {
    return this._user;
  }

  permissions() {
    return this._permissions.slice();
  }

  roles() {
    return this._roles.slice();
  }

  router() {
    return this._router;
  }

  activeModuleKey() {
    return this._activeModuleKey;
  }

  activePath() {
    return this._activePath;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async load() {
    await this.loadSession();

    const result = await ShellReq.QueryMenus().submit();
    this._menus = filterMenusByAccess(result.data);
    this._router = createAppRouter(this._menus);
    this._unsubscribeRouter = this._router.subscribe((context) => this.syncFromPath(context.path));
    this._emit();
    return result;
  }

  // 加载会话：当前用户 / 角色 / 权限码，并注入全局权限上下文。
  async loadSession() {
    const result = await ShellReq.Me().submit();
    this._user = result.data.user;
    this._permissions = [...(result.data.permissions || [])];
    this._roles = [...(result.data.roles || [])];
    installAccess(createAccess({ permissions: this.permissions(), roles: this.roles() }));
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

  syncFromPath(path) {
    const module = this._menus.find((entry) => entry.routes.some((route) => route.path === path));
    const changed = this._activePath !== path || (module && this._activeModuleKey !== module.key);
    this._activePath = path;
    if (module) {
      this._activeModuleKey = module.key;
    }
    if (changed) {
      this._emit();
    }
    return this;
  }

  destroy() {
    this._unsubscribeRouter?.();
    this._listeners.clear();
  }

  _emit() {
    this._listeners.forEach((listener) => listener());
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
