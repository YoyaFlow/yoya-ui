// 管理请求命令：字段在构造器声明，方法由 RequestBase 基类提供、子类覆写。
import { RequestBase } from '@yoyaflow/yoya-ui';
import Members from './member.views.js';

class Query extends RequestBase {
  constructor({ page = 1, pageSize = 10, keyword = '', status = '' } = {}) {
    super();
    this.page = page;
    this.pageSize = pageSize;
    this.keyword = keyword;
    this.status = status;
  }

  address() {
    return '/members';
  }

  params() {
    return { page: this.page, pageSize: this.pageSize, keyword: this.keyword, status: this.status };
  }

  toItem(row) {
    return new Members.ListItem(row);
  }
}

class Create extends RequestBase {
  constructor({ name = '', email = '', role = 'viewer', status = 'active' } = {}) {
    super();
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
  }

  method() {
    return 'POST';
  }

  address() {
    return '/members';
  }

  body() {
    return { name: this.name, email: this.email, role: this.role, status: this.status };
  }

  toDetail(member) {
    return new Members.Detail(member);
  }
}

class Update extends RequestBase {
  constructor(id, { name = '', email = '', role = 'viewer', status = 'active' } = {}) {
    super();
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
  }

  method() {
    return 'PUT';
  }

  address() {
    return `/members/${this.id}`;
  }

  body() {
    return { name: this.name, email: this.email, role: this.role, status: this.status };
  }

  toDetail(member) {
    return new Members.Detail(member);
  }
}

class Remove extends RequestBase {
  constructor(id) {
    super();
    this.id = id;
  }

  method() {
    return 'DELETE';
  }

  address() {
    return `/members/${this.id}`;
  }
}

export default { Query, Create, Update, Remove };
