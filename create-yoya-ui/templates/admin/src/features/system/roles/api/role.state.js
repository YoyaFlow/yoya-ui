// 角色页状态类。
import RoleMgr from './role.mgr.js';

export default class RolesPageState {
  constructor() {
    this._items = [];
    this._keyword = '';
    this._status = '';
    this._page = 1;
    this._pageSize = 10;
    this._total = 0;
    this._listeners = new Set();
  }

  items() {
    return this._items;
  }

  keyword() {
    return this._keyword;
  }

  status() {
    return this._status;
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

  setKeyword(value) {
    this._keyword = value;
  }

  setStatus(value) {
    this._status = value;
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

  async load() {
    const result = await RoleMgr.Query({
      page: this._page,
      pageSize: this._pageSize,
      keyword: this._keyword,
      status: this._status
    }).submit();
    this._items = result.data;
    this._total = result.total;
    this._emit();
    return result;
  }

  async add(payload) {
    await RoleMgr.Create(payload).submit();
    this._page = 1;
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
    if (this._items.length === 1 && this._page > 1) {
      this._page -= 1;
    }
    await this.load();
  }

  _emit() {
    this._listeners.forEach((listener) => listener());
  }
}
