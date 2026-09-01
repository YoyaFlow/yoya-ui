// 字典管理请求命令：字典类型与字典项。
import { RequestBase } from '@yoyaflow/yoya-ui';
import Dicts from './dict.views.js';

class QueryTypes extends RequestBase {
  address() {
    return '/dicts/types';
  }

  toItem(row) {
    return new Dicts.DictTypeItem(row);
  }
}

class CreateType extends RequestBase {
  constructor({ name = '', code = '', status = 'active', remark = '' } = {}) {
    super();
    this.name = name;
    this.code = code;
    this.status = status;
    this.remark = remark;
  }

  method() {
    return 'POST';
  }

  address() {
    return '/dicts/types';
  }

  body() {
    return { name: this.name, code: this.code, status: this.status, remark: this.remark };
  }
}

class UpdateType extends RequestBase {
  constructor(id, { name = '', code = '', status = 'active', remark = '' } = {}) {
    super();
    this.id = id;
    this.name = name;
    this.code = code;
    this.status = status;
    this.remark = remark;
  }

  method() {
    return 'PUT';
  }

  address() {
    return `/dicts/types/${this.id}`;
  }

  body() {
    return { name: this.name, code: this.code, status: this.status, remark: this.remark };
  }
}

class RemoveType extends RequestBase {
  constructor(id) {
    super();
    this.id = id;
  }

  method() {
    return 'DELETE';
  }

  address() {
    return `/dicts/types/${this.id}`;
  }
}

class QueryItems extends RequestBase {
  constructor(typeId) {
    super();
    this.typeId = typeId;
  }

  address() {
    return `/dicts/types/${this.typeId}/items`;
  }

  toItem(row) {
    return new Dicts.DictItem(row);
  }
}

class CreateItem extends RequestBase {
  constructor(typeId, { label = '', value = '', sort = 0, status = 'active' } = {}) {
    super();
    this.typeId = typeId;
    this.label = label;
    this.value = value;
    this.sort = sort;
    this.status = status;
  }

  method() {
    return 'POST';
  }

  address() {
    return `/dicts/types/${this.typeId}/items`;
  }

  body() {
    return { label: this.label, value: this.value, sort: this.sort, status: this.status };
  }
}

class UpdateItem extends RequestBase {
  constructor(id, { label = '', value = '', sort = 0, status = 'active' } = {}) {
    super();
    this.id = id;
    this.label = label;
    this.value = value;
    this.sort = sort;
    this.status = status;
  }

  method() {
    return 'PUT';
  }

  address() {
    return `/dicts/items/${this.id}`;
  }

  body() {
    return { label: this.label, value: this.value, sort: this.sort, status: this.status };
  }
}

class RemoveItem extends RequestBase {
  constructor(id) {
    super();
    this.id = id;
  }

  method() {
    return 'DELETE';
  }

  address() {
    return `/dicts/items/${this.id}`;
  }
}

export default {
  QueryTypes,
  CreateType,
  UpdateType,
  RemoveType,
  QueryItems,
  CreateItem,
  UpdateItem,
  RemoveItem
};
