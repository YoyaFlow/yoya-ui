/** 字典结果结构类型声明（对应 dict.views.js）。 */
export type DictStatus = 'active' | 'disabled';

export class DictTypeItem {
  id: number;
  name: string;
  code: string;
  status: DictStatus;
  remark: string;
  constructor(init?: {
    id: number;
    name?: string;
    code?: string;
    status?: DictStatus;
    remark?: string;
  });
}

export class DictItem {
  id: number;
  typeId: number | null;
  label: string;
  value: string;
  sort: number;
  status: DictStatus;
  constructor(init?: {
    id: number;
    typeId?: number | null;
    label?: string;
    value?: string;
    sort?: number;
    status?: DictStatus;
  });
}

declare const Dicts: {
  DictTypeItem: typeof DictTypeItem;
  DictItem: typeof DictItem;
};

export default Dicts;
