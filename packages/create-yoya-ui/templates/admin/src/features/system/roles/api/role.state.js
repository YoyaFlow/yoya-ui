// 角色页状态类：视图字段用 ref 持有，动作写句柄即完成通知。
import { ref } from '@yoyaflow/yoya-ui';
import { mergeRowsByKey } from '../../../../shared/state.rows.js';
import RoleMgr from './role.mgr.js';

export default class RolesPageState {
  constructor() {
    this.items = ref([]);
    this.total = ref(0);
    this.page = ref(1);
    this.pageSize = ref(10);
    this.keyword = ref('');
    this.status = ref('');
  }

  setKeyword(value) {
    this.keyword.value = value;
  }

  setStatus(value) {
    this.status.value = value;
  }

  setPage(value) {
    this.page.value = Math.max(1, Number(value) || 1);
  }

  setPageSize(value) {
    this.pageSize.value = Math.max(1, Number(value) || 10);
  }

  async load() {
    const result = await RoleMgr.Query({
      page: this.page.value,
      pageSize: this.pageSize.value,
      keyword: this.keyword.value,
      status: this.status.value
    }).submit();
    this.items.value = mergeRowsByKey(this.items.peek(), result.data);
    this.total.value = result.total;
    return result;
  }

  async add(payload) {
    await RoleMgr.Create(payload).submit();
    this.page.value = 1;
    await this.load();
    return payload;
  }

  async edit(id, patch) {
    await RoleMgr.Update({ id, ...patch }).submit();
    await this.load();
    return patch;
  }

  async remove(id) {
    await RoleMgr.Remove({ id }).submit();
    if (this.items.peek().length === 1 && this.page.value > 1) {
      this.page.value -= 1;
    }
    await this.load();
  }
}
