/** 角色结果结构类型声明（对应 role.views.js）。 */
export type RoleStatus = 'active' | 'disabled';

export class ListItem {
  id: number;
  name: string;
  code: string;
  description: string;
  status: RoleStatus;
  sort: number;
  constructor(init?: {
    id: number;
    name: string;
    code: string;
    description?: string;
    status?: RoleStatus;
    sort?: number;
  });
}

export class Detail {
  id: number;
  name: string;
  code: string;
  description: string;
  status: RoleStatus;
  sort: number;
  constructor(init?: {
    id: number;
    name: string;
    code: string;
    description?: string;
    status?: RoleStatus;
    sort?: number;
  });
}

declare const Roles: {
  ListItem: typeof ListItem;
  Detail: typeof Detail;
};

export default Roles;
