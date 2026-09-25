/** 角色页状态类类型声明（对应 role.state.js）。 */
import type { SignalHandle } from '@yoyaflow/yoya-ui';
import type { Result } from '@yoyaflow/yoya-core/api';
import Roles from './role.views.js';

type RoleListItem = InstanceType<typeof Roles.ListItem>;

export default class RolesPageState {
  constructor();
  /** 视图字段：页面与组件直接绑句柄，写入即更新 */
  items: SignalHandle<RoleListItem[]>;
  total: SignalHandle<number>;
  page: SignalHandle<number>;
  pageSize: SignalHandle<number>;
  keyword: SignalHandle<string>;
  status: SignalHandle<string>;
  setKeyword(value: string): void;
  setStatus(value: string): void;
  setPage(value: number): void;
  setPageSize(value: number): void;
  load(): Promise<Result<RoleListItem[]>>;
  add(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  edit(id: number, patch: Record<string, unknown>): Promise<Record<string, unknown>>;
  remove(id: number): Promise<void>;
}
