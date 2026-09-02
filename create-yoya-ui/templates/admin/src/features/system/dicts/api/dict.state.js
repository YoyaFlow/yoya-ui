// 字典页状态类：字典类型 + 当前类型下的字典项。
import DictMgr from './dict.mgr.js';

export default class DictsPageState {
  constructor() {
    this._types = [];
    this._selectedTypeId = null;
    this._items = [];
    this._page = 1;
    this._pageSize = 10;
    this._total = 0;
    this._listeners = new Set();
  }

  types() {
    return this._types;
  }

  selectedTypeId() {
    return this._selectedTypeId;
  }

  selectedType() {
    return this._types.find((type) => type.id === this._selectedTypeId) ?? null;
  }

  items() {
    return this._items;
  }

  page() {
    return this._page;
  }

  pageSize() {
    return this._pageSize;
  }

  total() {
    return this._total;
  }

  setPage(value) {
    this._page = Math.max(1, Number(value) || 1);
  }

  setPageSize(value) {
    this._pageSize = Math.max(1, Number(value) || 10);
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async loadTypes() {
    const result = await DictMgr.QueryTypes({
      page: this._page,
      pageSize: this._pageSize
    }).submit();
    this._types = result.data;
    this._total = result.total;
    if (!this._selectedTypeId && this._types.length > 0) {
      this._selectedTypeId = this._types[0].id;
    }
    await this.loadItems();
    this._emit();
    return result;
  }

  async selectType(id) {
    this._selectedTypeId = id;
    await this.loadItems();
    this._emit();
    return this;
  }

  async loadItems() {
    if (this._selectedTypeId === null) {
      this._items = [];
      return;
    }
    const result = await DictMgr.QueryItems({ typeId: this._selectedTypeId }).submit();
    this._items = result.data;
  }

  async addType(payload) {
    await DictMgr.CreateType(payload).submit();
    this._page = 1;
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
    if (this._selectedTypeId === id) {
      this._selectedTypeId = null;
    }
    if (this._types.length === 1 && this._page > 1) {
      this._page -= 1;
    }
    await this.loadTypes();
  }

  async addItem(payload) {
    await DictMgr.CreateItem({ typeId: this._selectedTypeId, ...payload }).submit();
    await this.loadItems();
    this._emit();
    return payload;
  }

  async editItem(id, payload) {
    await DictMgr.UpdateItem({ id, ...payload }).submit();
    await this.loadItems();
    this._emit();
    return payload;
  }

  async removeItem(id) {
    await DictMgr.RemoveItem({ id }).submit();
    await this.loadItems();
    this._emit();
  }

  _emit() {
    this._listeners.forEach((listener) => listener());
  }
}
