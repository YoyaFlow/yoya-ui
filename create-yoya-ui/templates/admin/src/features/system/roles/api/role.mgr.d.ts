/** 角色管理请求命令类型声明（对应 role.mgr.js）。 */
import { RequestBase } from '@yoyaflow/yoya-ui';
import Roles, { RoleStatus } from './role.views.js';

type RoleListItem = InstanceType<typeof Roles.ListItem>;
type RoleDetail = InstanceType<typeof Roles.Detail>;

declare class Query extends RequestBase {
  constructor(init?: { page?: number; pageSize?: number; keyword?: string; status?: string });
  address(): string;
  params(): { page: number; pageSize: number; keyword: string; status: string };
  toItem(row: Record<string, unknown>): RoleListItem;
}

declare class Create extends RequestBase {
  constructor(init?: {
    name?: string;
    code?: string;
    description?: string;
    status?: RoleStatus;
    sort?: number;
  });
  method(): 'POST';
  address(): string;
  body(): { name: string; code: string; description: string; status: RoleStatus; sort: number };
}

declare class Update extends RequestBase {
  constructor(init?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
    status?: RoleStatus;
    sort?: number;
  });
  method(): 'PUT';
  address(): string;
  body(): { name: string; code: string; description: string; status: RoleStatus; sort: number };
}

declare class Remove extends RequestBase {
  constructor(init?: { id: number });
  method(): 'DELETE';
  address(): string;
}

declare const RoleMgr: {
  Query: (init?: { page?: number; pageSize?: number; keyword?: string; status?: string }) => Query;
  Create: (init?: {
    name?: string;
    code?: string;
    description?: string;
    status?: RoleStatus;
    sort?: number;
  }) => Create;
  Update: (init?: {
    id: number;
    name?: string;
    code?: string;
    description?: string;
    status?: RoleStatus;
    sort?: number;
  }) => Update;
  Remove: (init?: { id: number }) => Remove;
};

export default RoleMgr;
