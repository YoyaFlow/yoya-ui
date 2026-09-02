// 字典结果结构（纯数据）。
class DictTypeItem {
  constructor({ id, name = '', code = '', status = 'active', remark = '' } = {}) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.status = status;
    this.remark = remark;
  }
}

class DictItem {
  constructor({ id, typeId = null, label = '', value = '', sort = 0, status = 'active' } = {}) {
    this.id = id;
    this.typeId = typeId;
    this.label = label;
    this.value = value;
    this.sort = sort;
    this.status = status;
  }
}

export default { DictTypeItem, DictItem };
