// 页面数据状态类：要驱动视图的字段用 ref 持有——动作里写句柄即完成通知，
// 页面不需要订阅回调去手动 refresh。subscribe() 只留给非视图副作用（埋点 / 持久化）。
import { ref } from '@yoyaflow/yoya-ui';
import { mergeRowsByKey } from '../../../../shared/state.rows.js';
import MemberMgr from './member.mgr.js';

export default class MembersPageState {
  constructor() {
    this.items = ref([]);
    this.total = ref(0);
    this.page = ref(1);
    this.pageSize = ref(5);
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
    this.pageSize.value = Math.max(1, Number(value) || 5);
  }

  async load() {
    const result = await MemberMgr.Query({
      page: this.page.value,
      pageSize: this.pageSize.value,
      keyword: this.keyword.value,
      status: this.status.value
    }).submit();
    // 按 key 合并：能复用的行保持实例身份，表格只刷变化的格子
    this.items.value = mergeRowsByKey(this.items.peek(), result.data);
    this.total.value = result.total;
    return result;
  }

  async add(payload) {
    await MemberMgr.Create(payload).submit();
    this.page.value = 1;
    await this.load();
    return payload;
  }

  async edit(id, patch) {
    await MemberMgr.Update({ id, ...patch }).submit();
    await this.load();
    return patch;
  }

  async remove(id) {
    await MemberMgr.Remove({ id }).submit();
    if (this.items.peek().length === 1 && this.page.value > 1) {
      this.page.value -= 1;
    }
    await this.load();
  }
}
