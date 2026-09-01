// 权限页状态类：持有权限树，动作构造命令并 submit 后写入状态、通知订阅者。
import PermissionMgr from './permission.mgr.js';

export default class PermissionsPageState {
  constructor() {
    this._tree = [];
    this._listeners = new Set();
  }

  tree() {
    return this._tree;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  async load() {
    const result = await new PermissionMgr.QueryTree().submit();
    this._tree = result.data;
    this._emit();
    return result;
  }

  async add(parentId, payload) {
    await new PermissionMgr.Create(parentId, payload).submit();
    await this.load();
    return payload;
  }

  async edit(id, payload) {
    await new PermissionMgr.Update(id, payload).submit();
    await this.load();
    return payload;
  }

  async remove(id) {
    await new PermissionMgr.Remove(id).submit();
    await this.load();
  }

  _emit() {
    this._listeners.forEach((listener) => listener());
  }
}
