/** 权限结果结构类型声明（对应 permission.views.js）。 */
export type PermissionType = 'menu' | 'button';

export class PermissionNode {
  id: number;
  parentId: number | null;
  name: string;
  code: string;
  type: PermissionType;
  sort: number;
  children: PermissionNode[];
  constructor(init?: {
    id: number;
    parentId?: number | null;
    name?: string;
    code?: string;
    type?: PermissionType;
    sort?: number;
    children?: PermissionNode[];
  });
}

declare const Permissions: {
  PermissionNode: typeof PermissionNode;
};

export default Permissions;
