// 外壳请求命令：其他模块（启动装配）调用本域能力的入口，方便后续替换为服务端接口（去掉 mock 即可）。
import { RequestBase } from '@yoyaflow/yoya-ui';
import Shell from './shell.views.js';

class QueryMenus extends RequestBase {
  address() {
    return '/menus';
  }

  toItem(row) {
    return new Shell.Module(row);
  }
}

class Me extends RequestBase {
  address() {
    return '/auth/me';
  }
}

export default {
  QueryMenus: (init) => new QueryMenus(init),
  Me: (init) => new Me(init)
};
