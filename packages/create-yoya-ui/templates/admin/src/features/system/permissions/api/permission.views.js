// 权限结果结构（纯数据）：权限树是层级结构，只做整树重建（vTree 是命令式组件），
// 所以节点字段保持普通值；要做行级原地刷新时再按需升级为句柄。
class PermissionNode {
  constructor({
    id,
    parentId = null,
    name = '',
    code = '',
    type = 'menu',
    sort = 0,
    children = []
  } = {}) {
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
