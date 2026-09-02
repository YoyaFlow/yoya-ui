// 角色管理请求命令。
import { RequestBase } from '@yoyaflow/yoya-ui';
import Roles from './role.views.js';

class Query extends RequestBase {
  constructor({ page = 1, pageSize = 10, keyword = '', status = '' } = {}) {
    super();
    this.page = page;
    this.pageSize = pageSize;
    this.keyword = keyword;
    this.status = status;
  }

  address() {
    return '/roles';
  }

  params() {
    return { page: this.page, pageSize: this.pageSize, keyword: this.keyword, status: this.status };
  }

  toItem(row) {
    return new Roles.ListItem(row);
  }
}

class Create extends RequestBase {
  constructor({ name = '', code = '', description = '', status = 'active', sort = 0 } = {}) {
    super();
    this.name = name;
    this.code = code;
    this.description = description;
    this.status = status;
    this.sort = sort;
  }

  method() {
    return 'POST';
  }

  address() {
    return '/roles';
  }

  body() {
    return {
      name: this.name,
      code: this.code,
      description: this.description,
      status: this.status,
      sort: this.sort
    };
  }
}

class Update extends RequestBase {
  constructor({ id, name = '', code = '', description = '', status = 'active', sort = 0 } = {}) {
    super();
    this.id = id;
    this.name = name;
    this.code = code;
    this.description = description;
    this.status = status;
    this.sort = sort;
  }

  method() {
    return 'PUT';
  }

  address() {
    return `/roles/${this.id}`;
  }

  body() {
    return {
      name: this.name,
      code: this.code,
      description: this.description,
      status: this.status,
      sort: this.sort
    };
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
    return `/roles/${this.id}`;
  }
}

export default {
  Query: (init) => new Query(init),
  Create: (init) => new Create(init),
  Update: (init) => new Update(init),
  Remove: (init) => new Remove(init)
};
