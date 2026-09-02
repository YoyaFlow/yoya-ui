// 领域结果结构（纯数据）：类不单独 export，统一由默认导出命名空间提供。
class ListItem {
  constructor({ id, name, email, role, status }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
  }
}

class Detail {
  constructor({ id, name, email, role, status, remark = '' }) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
    this.remark = remark;
  }
}

export default { ListItem, Detail };
