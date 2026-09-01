/**
 * 统一返回结构：自动判断 detail / list / page 并完成映射。
 * 失败（ok === false）统一抛错，错误带 code / showType。
 */
export class Result {
  constructor({
    ok = true,
    code = '0',
    msg = null,
    showType = 0,
    data = null,
    kind = 'detail',
    pageNum = null,
    pageSize = null,
    total = null
  } = {}) {
    this.ok = ok;
    this.code = code;
    this.msg = msg;
    this.showType = showType;
    this.data = data;
    this.kind = kind;
    this.pageNum = pageNum;
    this.pageSize = pageSize;
    this.total = total;
  }

  get isSuccess() {
    return Boolean(this.ok);
  }

  get pages() {
    return this.pageSize > 0 ? Math.ceil((this.total ?? 0) / this.pageSize) : 0;
  }

  static from(raw, command = {}) {
    if (!raw || raw.ok === false) {
      const error = new Error(raw?.msg || '请求失败');
      error.code = raw?.code;
      error.showType = raw?.showType;
      throw error;
    }

    const data = raw.data;
    const isPage = Array.isArray(data) && raw.pageNum != null;
    const isList = Array.isArray(data);

    return new Result({
      ok: raw.ok,
      code: raw.code,
      msg: raw.msg,
      showType: raw.showType,
      kind: isPage ? 'page' : isList ? 'list' : 'detail',
      data:
        isPage || isList
          ? (data ?? []).map((item) => (command.toItem ? command.toItem(item) : item))
          : command.toDetail
            ? command.toDetail(data)
            : data,
      pageNum: raw.pageNum,
      pageSize: raw.pageSize,
      total: raw.total
    });
  }
}
