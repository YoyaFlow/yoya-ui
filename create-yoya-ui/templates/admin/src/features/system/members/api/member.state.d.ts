/** 页面数据状态类类型声明（对应 member.state.js）。 */
import type { SignalHandle } from '@yoyaflow/yoya-ui';
import type { Result } from '@yoyaflow/yoya-ui/api';
import Members from './member.views.js';

type MemberListItem = InstanceType<typeof Members.ListItem>;

export default class MembersPageState {
  constructor();
  /** 视图字段：页面与组件直接绑句柄，写入即更新 */
  items: SignalHandle<MemberListItem[]>;
  total: SignalHandle<number>;
  page: SignalHandle<number>;
  pageSize: SignalHandle<number>;
  keyword: SignalHandle<string>;
  status: SignalHandle<string>;
  setKeyword(value: string): void;
  setStatus(value: string): void;
  setPage(value: number): void;
  setPageSize(value: number): void;
  load(): Promise<Result<MemberListItem[]>>;
  add(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  edit(id: number, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(id: number): Promise<void>;
}
