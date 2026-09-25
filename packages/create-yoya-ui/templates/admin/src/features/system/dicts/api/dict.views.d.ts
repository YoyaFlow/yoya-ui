/** 字典结果结构类型声明（对应 dict.views.js）。 */
import type { SignalHandle } from '@yoyaflow/yoya-ui';

/** 字典状态：与 utils/options.js 的 statusOptions 对齐 */
export type DictStatus = 'active' | 'disabled';

export type DictTypeRow = {
  id: number;
  name?: string;
  code?: string;
  status?: DictStatus;
  remark?: string;
};

export type DictItemRow = {
  id: number;
  typeId?: number | null;
  label?: string;
  value?: string;
  sort?: number;
  status?: DictStatus;
};

export class DictTypeItem {
  /** key：普通值，不能是句柄 */
  id: number;
  /** 行内热字段：句柄写入即刷新对应单元格 */
  name: SignalHandle<string>;
  code: SignalHandle<string>;
  status: SignalHandle<string>;
  remark: SignalHandle<string>;
  constructor(row?: DictTypeRow);
  apply(row: DictTypeRow): this;
}

export class DictItem {
  /** key：普通值，不能是句柄 */
  id: number;
  /** 关系字段：不参与原地刷新 */
  typeId: number | null;
  label: SignalHandle<string>;
  value: SignalHandle<string>;
  sort: SignalHandle<number>;
  status: SignalHandle<string>;
  constructor(row?: DictItemRow);
  apply(row: DictItemRow): this;
}

declare const Dicts: {
  DictTypeItem: typeof DictTypeItem;
  DictItem: typeof DictItem;
};

export default Dicts;
