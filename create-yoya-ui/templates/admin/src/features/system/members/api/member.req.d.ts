/** 外部请求命令类型声明（对应 member.req.js）。 */
import { RequestBase } from '@yoyaflow/yoya-ui';
import Members from './member.views.js';

type MemberListItem = InstanceType<typeof Members.ListItem>;

declare class QueryAvailable extends RequestBase {
  address(): string;
  toItem(row: Record<string, unknown>): MemberListItem;
}

declare const MemberReq: {
  QueryAvailable: (init?: unknown) => QueryAvailable;
};

export default MemberReq;
