/** 字典管理请求命令类型声明（对应 dict.mgr.js）。 */
import { RequestBase } from '@yoyaflow/yoya-ui';
import Dicts, { DictStatus } from './dict.views.js';

type DictTypeInstance = InstanceType<typeof Dicts.DictTypeItem>;
type DictItemInstance = InstanceType<typeof Dicts.DictItem>;

declare class QueryTypes extends RequestBase {
  address(): string;
  toItem(row: Record<string, unknown>): DictTypeInstance;
}

declare class CreateType extends RequestBase {
  constructor(init?: { name?: string; code?: string; status?: DictStatus; remark?: string });
  method(): 'POST';
  address(): string;
  body(): { name: string; code: string; status: DictStatus; remark: string };
}

declare class UpdateType extends RequestBase {
  constructor(
    id: number,
    init?: { name?: string; code?: string; status?: DictStatus; remark?: string }
  );
  method(): 'PUT';
  address(): string;
  body(): { name: string; code: string; status: DictStatus; remark: string };
}

declare class RemoveType extends RequestBase {
  constructor(id: number);
  method(): 'DELETE';
  address(): string;
}

declare class QueryItems extends RequestBase {
  constructor(typeId: number);
  address(): string;
  toItem(row: Record<string, unknown>): DictItemInstance;
}

declare class CreateItem extends RequestBase {
  constructor(
    typeId: number,
    init?: { label?: string; value?: string; sort?: number; status?: DictStatus }
  );
  method(): 'POST';
  address(): string;
  body(): { label: string; value: string; sort: number; status: DictStatus };
}

declare class UpdateItem extends RequestBase {
  constructor(
    id: number,
    init?: { label?: string; value?: string; sort?: number; status?: DictStatus }
  );
  method(): 'PUT';
  address(): string;
  body(): { label: string; value: string; sort: number; status: DictStatus };
}

declare class RemoveItem extends RequestBase {
  constructor(id: number);
  method(): 'DELETE';
  address(): string;
}

declare const DictMgr: {
  QueryTypes: typeof QueryTypes;
  CreateType: typeof CreateType;
  UpdateType: typeof UpdateType;
  RemoveType: typeof RemoveType;
  QueryItems: typeof QueryItems;
  CreateItem: typeof CreateItem;
  UpdateItem: typeof UpdateItem;
  RemoveItem: typeof RemoveItem;
};

export default DictMgr;
