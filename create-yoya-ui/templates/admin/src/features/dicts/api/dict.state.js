// 字典页状态类：字典类型 + 当前类型下的字典项。
import DictMgr from './dict.mgr.js';

export default class DictsPageState {
  constructor() {
    this._types = [];
    this._selectedTypeId = null;
    this._items = [];
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

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async loadTypes() {
    const result = await new DictMgr.QueryTypes().submit();
    this._types = result.data;
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
    const result = await new DictMgr.QueryItems(this._selectedTypeId).submit();
    this._items = result.data;
  }

  async addType(payload) {
    await new DictMgr.CreateType(payload).submit();
    await this.loadTypes();
    return payload;
  }

  async editType(id, payload) {
    await new DictMgr.UpdateType(id, payload).submit();
    await this.loadTypes();
    return payload;
  }

  async removeType(id) {
    await new DictMgr.RemoveType(id).submit();
    if (this._selectedTypeId === id) {
      this._selectedTypeId = null;
    }
    await this.loadTypes();
  }

  async addItem(payload) {
    await new DictMgr.CreateItem(this._selectedTypeId, payload).submit();
    await this.loadItems();
    this._emit();
    return payload;
  }

  async editItem(id, payload) {
    await new DictMgr.UpdateItem(id, payload).submit();
    await this.loadItems();
    this._emit();
    return payload;
  }

  async removeItem(id) {
    await new DictMgr.RemoveItem(id).submit();
    await this.loadItems();
    this._emit();
  }

  _emit() {
    this._listeners.forEach((listener) => listener());
  }
}
