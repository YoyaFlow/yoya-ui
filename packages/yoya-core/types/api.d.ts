// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/** 请求传输层：RequestBase.submit() 会调用它，返回统一包装结构（如 Result.from 的 raw）。 */
export type RequestSubmit = (request: RequestCommand) => unknown;

/** 注册请求传输层；传 null 清除注册。 */
export function configureRequest(options?: { submit?: RequestSubmit | null }): RequestSubmit | null;

/** 请求实例：描述请求与映射，方法由 RequestBase 或子类提供。 */
export interface RequestCommand {
  address(): string;
  method(): string;
  headers(): Record<string, string>;
  cookies(): string | null;
  body(): unknown;
  params(): Record<string, unknown>;
  submit(): unknown;
  toItem?: (row: unknown) => unknown;
  toDetail?: (data: unknown) => unknown;
  [key: string]: unknown;
}

/** 请求基类：定义请求描述与提交的默认逻辑，子类覆写或扩展。 */
export class RequestBase {
  method(): string;
  headers(): Record<string, string>;
  cookies(): string | null;
  body(): unknown;
  params(): Record<string, unknown>;
  address(): string;
  submit(): unknown;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

export type ResultKind = 'detail' | 'list' | 'page';

/** 统一返回结构：自动判断 detail / list / page 并完成映射，失败时 from 抛错。 */
export class Result<T = unknown> {
  ok: boolean;
  code: string;
  msg: string | null;
  showType: number;
  data: T;
  kind: ResultKind;
  pageNum: number | null;
  pageSize: number | null;
  total: number | null;
  readonly isSuccess: boolean;
  readonly pages: number;

  constructor(init?: Partial<Result<T>>);

  static from<T = unknown>(
    raw: unknown,
    command?: { toItem?: (item: unknown) => unknown; toDetail?: (data: unknown) => unknown }
  ): Result<T>;
}
