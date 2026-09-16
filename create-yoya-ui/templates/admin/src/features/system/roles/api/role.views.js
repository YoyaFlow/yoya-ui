// 角色结果结构（纯数据）：行内展示且会原地变化的字段用句柄，其余保持普通值。
import { ref } from '@yoyaflow/yoya-ui';
import { fieldValue } from '../../../../shared/state.rows.js';

class ListItem {
  constructor(row = {}) {
    this.id = row.id; // key：普通值，不能是句柄
    this.name = ref(fieldValue(row.name) ?? '');
    this.code = ref(fieldValue(row.code) ?? '');
    this.description = ref(fieldValue(row.description) ?? '');
    this.status = ref(fieldValue(row.status) ?? 'active');
    this.sort = fieldValue(row.sort) ?? 0; // 冷字段：表格不展示，随行结构变化即可
  }

  /** 合并而非重建：实例身份不变，keyed 复用行节点，只刷句柄绑定的位置。 */
  apply(row) {
    this.name.value = fieldValue(row.name) ?? '';
    this.code.value = fieldValue(row.code) ?? '';
    this.description.value = fieldValue(row.description) ?? '';
    this.status.value = fieldValue(row.status) ?? 'active';
    this.sort = fieldValue(row.sort) ?? 0;
    return this;
  }
}

class Detail {
  constructor({ id, name, code, description = '', status = 'active', sort = 0 } = {}) {
    this.id = id;
    this.name = name;
    this.code = code;
    this.description = description;
    this.status = status;
    this.sort = sort;
  }
}

export default { ListItem, Detail };
