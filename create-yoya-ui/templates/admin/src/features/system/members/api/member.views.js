// 领域结果结构（纯数据）：字段按热度分——行内会展示、会原地变化的用句柄，
// key 与不参与原地刷新的字段保持普通值。类不单独 export，由默认导出命名空间提供。
import { ref } from '@yoyaflow/yoya-ui';
import { fieldValue } from '../../../../shared/state.rows.js';

class ListItem {
  constructor(row = {}) {
    this.id = row.id; // key：普通值，不能是句柄
    this.name = ref(fieldValue(row.name) ?? ''); // 热字段：句柄 → 只刷那一格
    this.email = ref(fieldValue(row.email) ?? '');
    this.role = ref(fieldValue(row.role) ?? 'viewer');
    this.status = ref(fieldValue(row.status) ?? 'active');
  }

  /** 合并而非重建：实例身份不变，keyed 复用行节点，只刷句柄绑定的位置。 */
  apply(row) {
    this.name.value = fieldValue(row.name) ?? '';
    this.email.value = fieldValue(row.email) ?? '';
    this.role.value = fieldValue(row.role) ?? 'viewer';
    this.status.value = fieldValue(row.status) ?? 'active';
    return this;
  }
}

// 详情结构不参与列表对账，按普通值持有即可。
class Detail {
  constructor({ id, name, email, role, status, remark = '' } = {}) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.status = status;
    this.remark = remark;
  }
}

export default { ListItem, Detail };
