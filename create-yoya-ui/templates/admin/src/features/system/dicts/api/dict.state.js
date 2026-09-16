// 字典页状态类：字典类型 + 当前类型下的字典值。视图字段都用 ref 持有，
// 动作写句柄即完成通知——表格绑句柄，页面与弹窗都不需要手动重建。
import { computed, ref } from '@yoyaflow/yoya-ui';
import { mergeRowsByKey } from '../../../../shared/state.rows.js';
import DictMgr from './dict.mgr.js';

export default class DictsPageState {
  constructor() {
    this.types = ref([]);
    this.items = ref([]);
    this.selectedTypeId = ref(null);
    this.page = ref(1);
    this.pageSize = ref(10);
    this.total = ref(0);
    // 派生值：当前选中的字典类型（多信号组合用 computed）
    this.selectedType = computed(
      () => this.types.value.find((type) => type.id === this.selectedTypeId.value) ?? null
    );
  }

  setPage(value) {
    this.page.value = Math.max(1, Number(value) || 1);
  }

  setPageSize(value) {
    this.pageSize.value = Math.max(1, Number(value) || 10);
  }

  async loadTypes() {
    const result = await DictMgr.QueryTypes({
      page: this.page.value,
      pageSize: this.pageSize.value
    }).submit();
    this.types.value = mergeRowsByKey(this.types.peek(), result.data);
    this.total.value = result.total;
    if (!this.selectedTypeId.value && this.types.peek().length > 0) {
      this.selectedTypeId.value = this.types.peek()[0].id;
    }
    await this.loadItems();
    return result;
  }

  async selectType(id) {
    this.selectedTypeId.value = id;
    await this.loadItems();
    return this;
  }

  async loadItems() {
    if (this.selectedTypeId.value === null) {
      this.items.value = [];
      return [];
    }
    const result = await DictMgr.QueryItems({ typeId: this.selectedTypeId.value }).submit();
    this.items.value = mergeRowsByKey(this.items.peek(), result.data);
    return this.items.value;
  }

  async addType(payload) {
    await DictMgr.CreateType(payload).submit();
    this.page.value = 1;
    await this.loadTypes();
    return payload;
  }

  async editType(id, payload) {
    await DictMgr.UpdateType({ id, ...payload }).submit();
    await this.loadTypes();
    return payload;
  }

  async removeType(id) {
    await DictMgr.RemoveType({ id }).submit();
    if (this.selectedTypeId.value === id) {
      this.selectedTypeId.value = null;
    }
    if (this.types.peek().length === 1 && this.page.value > 1) {
      this.page.value -= 1;
    }
    await this.loadTypes();
  }

  async addItem(payload) {
    await DictMgr.CreateItem({ typeId: this.selectedTypeId.value, ...payload }).submit();
    await this.loadItems();
    return payload;
  }

  async editItem(id, payload) {
    await DictMgr.UpdateItem({ id, ...payload }).submit();
    await this.loadItems();
    return payload;
  }

  async removeItem(id) {
    await DictMgr.RemoveItem({ id }).submit();
    await this.loadItems();
  }
}
