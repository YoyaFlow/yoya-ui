/** 字典管理请求命令类型声明（对应 dict.mgr.js）。 */
import { RequestBase } from '@yoyaflow/yoya-ui';
import Dicts, { DictStatus } from './dict.views.js';

type DictTypeInstance = InstanceType<typeof Dicts.DictTypeItem>;
type DictItemInstance = InstanceType<typeof Dicts.DictItem>;

declare class QueryTypes extends RequestBase {
  constructor(init?: { page?: number; pageSize?: number });
  address(): string;
  params(): { page: number; pageSize: number };
  toItem(row: Record<string, unknown>): DictTypeInstance;
}

declare class CreateType extends RequestBase {
  constructor(init?: { name?: string; code?: string; status?: DictStatus; remark?: string });
  method(): 'POST';
  address(): string;
  body(): { name: string; code: string; status: DictStatus; remark: string };
}

declare class UpdateType extends RequestBase {
  constructor(init?: {
    id: number;
    name?: string;
    code?: string;
    status?: DictStatus;
    remark?: string;
  });
  method(): 'PUT';
  address(): string;
  body(): { name: string; code: string; status: DictStatus; remark: string };
}

declare class RemoveType extends RequestBase {
  constructor(init?: { id: number });
  method(): 'DELETE';
  address(): string;
}

declare class QueryItems extends RequestBase {
  constructor(init?: { typeId: number });
  address(): string;
  toItem(row: Record<string, unknown>): DictItemInstance;
}

declare class CreateItem extends RequestBase {
  constructor(init?: {
    typeId: number;
    label?: string;
    value?: string;
    sort?: number;
    status?: DictStatus;
  });
  method(): 'POST';
  address(): string;
  body(): { label: string; value: string; sort: number; status: DictStatus };
}

declare class UpdateItem extends RequestBase {
  constructor(init?: {
    id: number;
    label?: string;
    value?: string;
    sort?: number;
    status?: DictStatus;
  });
  method(): 'PUT';
  address(): string;
  body(): { label: string; value: string; sort: number; status: DictStatus };
}

declare class RemoveItem extends RequestBase {
  constructor(init?: { id: number });
  method(): 'DELETE';
  address(): string;
}

declare const DictMgr: {
  QueryTypes: (init?: { page?: number; pageSize?: number }) => QueryTypes;
  CreateType: (init?: {
    name?: string;
    code?: string;
    status?: DictStatus;
    remark?: string;
  }) => CreateType;
  UpdateType: (init?: {
    id: number;
    name?: string;
    code?: string;
    status?: DictStatus;
    remark?: string;
  }) => UpdateType;
  RemoveType: (init?: { id: number }) => RemoveType;
  QueryItems: (init?: { typeId: number }) => QueryItems;
  CreateItem: (init?: {
    typeId: number;
    label?: string;
    value?: string;
    sort?: number;
    status?: DictStatus;
  }) => CreateItem;
  UpdateItem: (init?: {
    id: number;
    label?: string;
    value?: string;
    sort?: number;
    status?: DictStatus;
  }) => UpdateItem;
  RemoveItem: (init?: { id: number }) => RemoveItem;
};

export default DictMgr;
