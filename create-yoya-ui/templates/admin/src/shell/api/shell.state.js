// 外壳状态类：菜单数据 + 导航状态（当前模块 / 当前路径）的唯一事实源，
// 加载时创建并持有路由，暴露导航动作（switchModule / navigate），由路由订阅驱动 syncFromPath。
import ShellReq from './shell.req.js';
import { createAppRouter } from '../router.js';

export default class ShellState {
  constructor() {
    this._menus = [];
    this._router = null;
    this._activeModuleKey = null;
    this._activePath = null;
    this._listeners = new Set();
    this._unsubscribeRouter = null;
  }

  menus() {
    return this._menus;
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
    const result = await ShellReq.QueryMenus().submit();
    this._menus = result.data;
    this._router = createAppRouter(this._menus);
    this._unsubscribeRouter = this._router.subscribe((context) => this.syncFromPath(context.path));
    this._emit();
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
    const module = this._menus.find((entry) =>
      entry.routes.some((route) => route.path === path)
    );
    const changed =
      this._activePath !== path || (module && this._activeModuleKey !== module.key);
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
