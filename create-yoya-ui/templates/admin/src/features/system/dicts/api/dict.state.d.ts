/** 字典页状态类类型声明（对应 dict.state.js）。 */
import Dicts from './dict.views.js';

type DictTypeInstance = InstanceType<typeof Dicts.DictTypeItem>;
type DictItemInstance = InstanceType<typeof Dicts.DictItem>;

export default class DictsPageState {
  constructor();
  types(): DictTypeInstance[];
  selectedTypeId(): number | null;
  selectedType(): DictTypeInstance | null;
  items(): DictItemInstance[];
  page(): number;
  pageSize(): number;
  total(): number;
  setPage(value: number): void;
  setPageSize(value: number): void;
  subscribe(listener: () => void): () => void;
  loadTypes(): Promise<unknown>;
  selectType(id: number): void;
  loadItems(): Promise<void>;
  addType(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  editType(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  removeType(id: number): Promise<void>;
  addItem(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  editItem(id: number, payload: Record<string, unknown>): Promise<Record<string, unknown>>;
  removeItem(id: number): Promise<void>;
}
