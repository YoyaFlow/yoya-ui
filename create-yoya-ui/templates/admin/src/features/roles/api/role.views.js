// 角色结果结构（纯数据）。
class ListItem {
  constructor({ id, name, code, description = '', status = 'active', sort = 0 }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.description = description;
    this.status = status;
    this.sort = sort;
  }
}

class Detail {
  constructor({ id, name, code, description = '', status = 'active', sort = 0 }) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.description = description;
    this.status = status;
    this.sort = sort;
  }
}

export default { ListItem, Detail };
