let transport = null;

/**
 * 注册请求传输层：RequestBase.submit() 会调用这里提供的 submit(request)。
 * 传输层返回统一包装结构，由调用方决定如何解析（如 Result.from(raw, request)）。
 */
export function configureRequest({ submit } = {}) {
  transport = typeof submit === 'function' ? submit : null;
  return transport;
}

/**
 * 请求基类：定义请求描述与提交的默认逻辑，子类覆写或扩展特殊方法。
 * 子类像 views 一样在构造器里声明字段，覆写 address/method/params/body 等方法。
 */
export class RequestBase {
  method() {
    return 'GET';
  }

  headers() {
    return {};
  }

  cookies() {
    return null;
  }

  body() {
    return null;
  }

  params() {
    return {};
  }

  address() {
    return '';
  }

  submit() {
    if (typeof transport !== 'function') {
      throw new Error('RequestBase: 未注册请求传输，请先 configureRequest({ submit })');
    }
    return transport(this);
  }
}
