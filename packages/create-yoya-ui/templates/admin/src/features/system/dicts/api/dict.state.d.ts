/** 字典页状态类类型声明（对应 dict.state.js）。 */
import type { SignalHandle } from '@yoyaflow/yoya-ui';
import type { Result } from '@yoyaflow/yoya-core/api';
import Dicts from './dict.views.js';

type DictTypeInstance = InstanceType<typeof Dicts.DictTypeItem>;
type DictItemInstance = InstanceType<typeof Dicts.DictItem>;

export default class DictsPageState {
  constructor();
  /** 视图字段：表格 / 弹窗直接绑句柄，写入即更新 */
  types: SignalHandle<DictTypeInstance[]>;
  items: SignalHandle<DictItemInstance[]>;
  selectedTypeId: SignalHandle<number | null>;
  page: SignalHandle<number>;
  pageSize: SignalHandle<number>;
  total: SignalHandle<number>;
  /** 派生值：当前选中的字典类型 */
  selectedType: SignalHandle<DictTypeInstance | null>;
  setPage(value: number): void;
  setPageSize(value: number): void;
  loadTypes(): Promise<Result<DictTypeInstance[]>>;
  selectType(id: number | null): Promise<this>;
  loadItems(): Promise<DictItemInstance[]>;
  addType(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  editType(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  removeType(id: number): Promise<void>;
  addItem(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  editItem(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  removeItem(id: number): Promise<void>;
}
