/** 权限页状态类类型声明（对应 permission.state.js）。 */
import type { SignalHandle } from '@yoyaflow/yoya-ui';
import type { Result } from '@yoyaflow/yoya-core/api';
import Permissions from './permission.views.js';

type PermissionNodeInstance = InstanceType<typeof Permissions.PermissionNode>;

export default class PermissionsPageState {
  constructor();
  /** 视图字段：权限树整体重建，页面读值后喂给 vTree */
  tree: SignalHandle<PermissionNodeInstance[]>;
  load(): Promise<Result<PermissionNodeInstance[]>>;
  add(parentId: number | null, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  edit(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(id: number): Promise<void>;
}
