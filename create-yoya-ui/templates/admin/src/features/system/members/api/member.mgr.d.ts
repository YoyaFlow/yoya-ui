/** 管理请求命令类型声明（对应 member.mgr.js）。 */
import { RequestBase } from '@yoyaflow/yoya-ui';
import Members from './member.views.js';

type MemberListItem = InstanceType<typeof Members.ListItem>;
type MemberDetail = InstanceType<typeof Members.Detail>;

declare class Query extends RequestBase {
  constructor(init?: { page?: number; pageSize?: number; keyword?: string; status?: string });
  address(): string;
  params(): { page: number; pageSize: number; keyword: string; status: string };
  toItem(row: Record<string, unknown>): MemberListItem;
}

declare class Create extends RequestBase {
  constructor(init?: { name?: string; email?: string; role?: string; status?: string });
  method(): 'POST';
  address(): string;
  body(): { name: string; email: string; role: string; status: string };
  toDetail(member: Record<string, unknown>): MemberDetail;
}

declare class Update extends RequestBase {
  constructor(init?: { id: number; name?: string; email?: string; role?: string; status?: string });
  method(): 'PUT';
  address(): string;
  body(): { name: string; email: string; role: string; status: string };
  toDetail(member: Record<string, unknown>): MemberDetail;
}

declare class Remove extends RequestBase {
  constructor(init?: { id: number });
  method(): 'DELETE';
  address(): string;
}

declare const MemberMgr: {
  Query: (
    init?: { page?: number; pageSize?: number; keyword?: string; status?: string }
  ) => Query;
  Create: (init?: { name?: string; email?: string; role?: string; status?: string }) => Create;
  Update: (
    init?: { id: number; name?: string; email?: string; role?: string; status?: string }
  ) => Update;
  Remove: (init?: { id: number }) => Remove;
};

export default MemberMgr;
