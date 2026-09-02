/** 权限管理请求命令类型声明（对应 permission.mgr.js）。 */
import { RequestBase } from '@yoyaflow/yoya-ui';
import Permissions, { PermissionType } from './permission.views.js';

type PermissionNodeInstance = InstanceType<typeof Permissions.PermissionNode>;

declare class QueryTree extends RequestBase {
  address(): string;
  toItem(node: Record<string, unknown>): PermissionNodeInstance;
}

declare class Create extends RequestBase {
  constructor(
    init?: { parentId: number | null; name?: string; code?: string; type?: PermissionType; sort?: number }
  );
  method(): 'POST';
  address(): string;
  body(): { parentId: number | null; name: string; code: string; type: PermissionType; sort: number };
}

declare class Update extends RequestBase {
  constructor(
    init?: { id: number; name?: string; code?: string; type?: PermissionType; sort?: number }
  );
  method(): 'PUT';
  address(): string;
  body(): { name: string; code: string; type: PermissionType; sort: number };
}

declare class Remove extends RequestBase {
  constructor(init?: { id: number });
  method(): 'DELETE';
  address(): string;
}

declare const PermissionMgr: {
  QueryTree: (init?: unknown) => QueryTree;
  Create: (
    init?: { parentId: number | null; name?: string; code?: string; type?: PermissionType; sort?: number }
  ) => Create;
  Update: (
    init?: { id: number; name?: string; code?: string; type?: PermissionType; sort?: number }
  ) => Update;
  Remove: (init?: { id: number }) => Remove;
};

export default PermissionMgr;
