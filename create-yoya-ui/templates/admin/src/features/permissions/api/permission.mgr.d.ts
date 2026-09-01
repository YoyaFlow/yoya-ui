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
    parentId: number | null,
    init?: { name?: string; code?: string; type?: PermissionType; sort?: number }
  );
  method(): 'POST';
  address(): string;
  body(): { parentId: number | null; name: string; code: string; type: PermissionType; sort: number };
}

declare class Update extends RequestBase {
  constructor(
    id: number,
    init?: { name?: string; code?: string; type?: PermissionType; sort?: number }
  );
  method(): 'PUT';
  address(): string;
  body(): { name: string; code: string; type: PermissionType; sort: number };
}

declare class Remove extends RequestBase {
  constructor(id: number);
  method(): 'DELETE';
  address(): string;
}

declare const PermissionMgr: {
  QueryTree: typeof QueryTree;
  Create: typeof Create;
  Update: typeof Update;
  Remove: typeof Remove;
};

export default PermissionMgr;
