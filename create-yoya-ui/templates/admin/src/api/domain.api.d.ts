/** 领域请求入口类型声明（对应 domain.api.js）。 */
import type { RequestCommand } from '@yoyaflow/yoya-ui';

export function mockRequest(
  method: string,
  address: string | RegExp,
  handler: (req: RequestCommand) => Promise<Record<string, unknown>>
): void;

export function domainSubmit(req: RequestCommand): Promise<unknown>;
