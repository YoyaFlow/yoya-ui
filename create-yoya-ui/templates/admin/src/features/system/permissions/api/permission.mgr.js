// 权限管理请求命令：查询树、新增、编辑、删除。
import { RequestBase } from '@yoyaflow/yoya-ui';
import Permissions from './permission.views.js';

class QueryTree extends RequestBase {
  address() {
    return '/permissions/tree';
  }

  toItem(node) {
    return new Permissions.PermissionNode({
      ...node,
      children: (node.children ?? []).map((child) => this.toItem(child))
    });
  }
}

class Create extends RequestBase {
  constructor({ parentId = null, name = '', code = '', type = 'menu', sort = 0 } = {}) {
    super();
    this.parentId = parentId;
    this.name = name;
    this.code = code;
    this.type = type;
    this.sort = sort;
  }

  method() {
    return 'POST';
  }

  address() {
    return '/permissions';
  }

  body() {
    return { parentId: this.parentId, name: this.name, code: this.code, type: this.type, sort: this.sort };
  }
}

class Update extends RequestBase {
  constructor({ id, name = '', code = '', type = 'menu', sort = 0 } = {}) {
    super();
    this.id = id;
    this.name = name;
    this.code = code;
    this.type = type;
    this.sort = sort;
  }

  method() {
    return 'PUT';
  }

  address() {
    return `/permissions/${this.id}`;
  }

  body() {
    return { name: this.name, code: this.code, type: this.type, sort: this.sort };
  }
}

class Remove extends RequestBase {
  constructor({ id } = {}) {
    super();
    this.id = id;
  }

  method() {
    return 'DELETE';
  }

  address() {
    return `/permissions/${this.id}`;
  }
}

export default {
  QueryTree: (init) => new QueryTree(init),
  Create: (init) => new Create(init),
  Update: (init) => new Update(init),
  Remove: (init) => new Remove(init)
};
