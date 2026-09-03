// 外壳结果结构（纯数据）：菜单模块与路由，服务端返回后由 toItem 映射。
class Route {
  constructor({ path, title, viewKey, permCode = null }) {
    this.path = path;
    this.title = title;
    this.viewKey = viewKey;
    this.permCode = permCode;
  }
}

class Module {
  constructor({ key, label, icon, routes = [] }) {
    this.key = key;
    this.label = label;
    this.icon = icon;
    this.routes = routes.map((route) => new Route(route));
  }
}

export default { Module, Route };
