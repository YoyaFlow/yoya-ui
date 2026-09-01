// 领域请求入口：统一 Result 解析 + mock / 真实传输切换。
import { configureRequest, Result } from '@yoyaflow/yoya-ui';
import { fetchSubmit } from './fetch.api.js';

const mockHandlers = new Map();

export function mockRequest(method, address, handler) {
  const pattern =
    address instanceof RegExp
      ? new RegExp(`^${method} ${address.source.replace(/^\^/, '').replace(/\$$/, '')}$`)
      : `${method} ${address}`;
  mockHandlers.set(pattern, handler);
}

function matchMock(req) {
  const key = `${req.method()} ${req.address()}`;
  for (const [pattern, handler] of mockHandlers) {
    if (pattern === key || (pattern instanceof RegExp && pattern.test(key))) {
      return handler;
    }
  }
  return null;
}

export async function domainSubmit(req) {
  const mock = matchMock(req);
  const raw = mock ? await mock(req) : await fetchSubmit(req);
  return Result.from(raw, req);
}

configureRequest({ submit: domainSubmit });
