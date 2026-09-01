/** 页面数据状态类类型声明（对应 member.state.js）。 */
import Members from './member.views.js';

type MemberListItem = InstanceType<typeof Members.ListItem>;

export default class MembersPageState {
  constructor();
  items(): MemberListItem[];
  keyword(): string;
  status(): string;
  page(): number;
  pageSize(): number;
  total(): number;
  setKeyword(value: string): void;
  setStatus(value: string): void;
  setPage(value: number): void;
  setPageSize(value: number): void;
  subscribe(listener: () => void): () => void;
  load(): Promise<unknown>;
  add(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  edit(id: number, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(id: number): Promise<void>;
}
