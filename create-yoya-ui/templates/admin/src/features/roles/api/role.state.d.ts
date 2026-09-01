/** 角色页状态类类型声明（对应 role.state.js）。 */
import Roles from './role.views.js';

type RoleListItem = InstanceType<typeof Roles.ListItem>;

export default class RolesPageState {
  constructor();
  items(): RoleListItem[];
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
