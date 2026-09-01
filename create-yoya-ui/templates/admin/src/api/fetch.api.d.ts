/** 原始传输层类型声明（对应 fetch.api.js）。 */
import type { RequestCommand } from '@yoyaflow/yoya-ui';

export function fetchSubmit(req: RequestCommand): Promise<unknown>;
