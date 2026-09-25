/** 角色结果结构类型声明（对应 role.views.js）。 */
import type { SignalHandle } from '@yoyaflow/yoya-ui';

/** 角色状态：与 utils/options.js 的 statusOptions 对齐 */
export type RoleStatus = 'active' | 'disabled';

export type RoleListRow = {
  id: number;
  name?: string;
  code?: string;
  description?: string;
  status?: RoleStatus;
  sort?: number;
};

export class ListItem {
  /** key：普通值，不能是句柄 */
  id: number;
  /** 行内热字段：句柄写入即刷新对应单元格 */
  name: SignalHandle<string>;
  code: SignalHandle<string>;
  description: SignalHandle<string>;
  status: SignalHandle<string>;
  /** 冷字段：表格不展示，随行结构变化刷新 */
  sort: number;
  constructor(row?: RoleListRow);
  apply(row: RoleListRow): this;
}

export class Detail {
  id: number;
  name: string;
  code: string;
  description: string;
  status: string;
  sort: number;
  constructor(init: {
    id: number;
    name: string;
    code: string;
    description?: string;
    status?: string;
    sort?: number;
  });
}

declare const Roles: {
  ListItem: typeof ListItem;
  Detail: typeof Detail;
};

export default Roles;
