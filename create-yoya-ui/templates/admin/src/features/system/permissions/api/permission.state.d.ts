/** 权限页状态类类型声明（对应 permission.state.js）。 */
import Permissions from './permission.views.js';

type PermissionNodeInstance = InstanceType<typeof Permissions.PermissionNode>;

export default class PermissionsPageState {
  constructor();
  tree(): PermissionNodeInstance[];
  subscribe(listener: () => void): () => void;
  load(): Promise<unknown>;
  add(parentId: number | null, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  edit(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(id: number): Promise<void>;
}
