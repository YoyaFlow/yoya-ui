// 字典结果结构（纯数据）：行内展示且会原地变化的字段用句柄，
// key 与不参与原地刷新的字段（如关系字段）保持普通值。
import { ref } from '@yoyaflow/yoya-ui';
import { fieldValue } from '../../../../shared/state.rows.js';

class DictTypeItem {
  constructor(row = {}) {
    this.id = row.id; // key：普通值，不能是句柄
    this.name = ref(fieldValue(row.name) ?? '');
    this.code = ref(fieldValue(row.code) ?? '');
    this.status = ref(fieldValue(row.status) ?? 'active');
    this.remark = ref(fieldValue(row.remark) ?? '');
  }

  /** 合并而非重建：实例身份不变，keyed 复用行节点，只刷句柄绑定的位置。 */
  apply(row) {
    this.name.value = fieldValue(row.name) ?? '';
    this.code.value = fieldValue(row.code) ?? '';
    this.status.value = fieldValue(row.status) ?? 'active';
    this.remark.value = fieldValue(row.remark) ?? '';
    return this;
  }
}

class DictItem {
  constructor(row = {}) {
    this.id = row.id; // key：普通值，不能是句柄
    this.typeId = fieldValue(row.typeId) ?? null; // 关系字段：不参与原地刷新
    this.label = ref(fieldValue(row.label) ?? '');
    this.value = ref(fieldValue(row.value) ?? '');
    this.sort = ref(fieldValue(row.sort) ?? 0);
    this.status = ref(fieldValue(row.status) ?? 'active');
  }

  apply(row) {
    this.typeId = fieldValue(row.typeId) ?? this.typeId;
    this.label.value = fieldValue(row.label) ?? '';
    this.value.value = fieldValue(row.value) ?? '';
    this.sort.value = fieldValue(row.sort) ?? 0;
    this.status.value = fieldValue(row.status) ?? 'active';
    return this;
  }
}

export default { DictTypeItem, DictItem };
