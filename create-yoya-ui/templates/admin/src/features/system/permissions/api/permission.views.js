// 权限结果结构（纯数据）。
class PermissionNode {
  constructor({ id, parentId = null, name = '', code = '', type = 'menu', sort = 0, children = [] } = {}) {
    this.id = id;
    this.parentId = parentId;
    this.name = name;
    this.code = code;
    this.type = type;
    this.sort = sort;
    this.children = children;
  }
}

export default { PermissionNode };
