// 权限页状态类：权限树用 ref 持有，动作写句柄即完成通知。
import { ref } from '@yoyaflow/yoya-ui';
import PermissionMgr from './permission.mgr.js';

export default class PermissionsPageState {
  constructor() {
    this.tree = ref([]);
  }

  async load() {
    const result = await PermissionMgr.QueryTree().submit();
    this.tree.value = result.data;
    return result;
  }

  async add(parentId, payload) {
    await PermissionMgr.Create({ parentId, ...payload }).submit();
    await this.load();
    return payload;
  }

  async edit(id, payload) {
    await PermissionMgr.Update({ id, ...payload }).submit();
    await this.load();
    return payload;
  }

  async remove(id) {
    await PermissionMgr.Remove({ id }).submit();
    await this.load();
  }
}
