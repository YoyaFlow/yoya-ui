/** 领域结果结构类型声明（对应 member.views.js）。 */
import type { SignalHandle } from '@yoyaflow/yoya-ui';

export type MemberListRow = {
  id: number;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
};

export class ListItem {
  /** key：普通值，不能是句柄 */
  id: number;
  /** 行内热字段：句柄写入即刷新对应单元格 */
  name: SignalHandle<string>;
  email: SignalHandle<string>;
  role: SignalHandle<string>;
  status: SignalHandle<string>;
  constructor(row?: MemberListRow);
  /** 合并而非重建：实例身份不变 */
  apply(row: MemberListRow): this;
}

export class Detail {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  remark: string;
  constructor(init: {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    remark?: string;
  });
}

declare const Members: {
  ListItem: typeof ListItem;
  Detail: typeof Detail;
};

export default Members;
