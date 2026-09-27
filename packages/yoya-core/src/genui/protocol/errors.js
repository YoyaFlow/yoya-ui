/** 错误码：调用方按码分支，比按 message 匹配可靠。 */
export const ERROR_CODES = Object.freeze({
  /** 输入不是合法 JSON / 不是协议对象 */
  protocol: 'GENUI_PROTOCOL',
  /** schema 结构校验失败 */
  schema: 'GENUI_SCHEMA',
  /** 组件名不在注册表里 */
  component: 'GENUI_COMPONENT',
  /** 方言不认输入（名字未注册 / 消息流不合法 / 缺少 beginRendering） */
  dialect: 'GENUI_DIALECT',
  /** 动作表达式或动作分发失败 */
  action: 'GENUI_ACTION',
  /** 渲染期错误（节点形状不对、props 用错位置等） */
  render: 'GENUI_RENDER'
});

/**
 * yoya-genui 的统一错误类型。
 *
 * 带 `path`（JSON 指针式路径，如 `root.children[2].props.label`）与 `componentId`，
 * 让生成方（模型 / 网关）能直接定位到出错的那一段 JSON 并重生成。
 */
export class GenUIError extends Error {
  constructor(message, options = {}) {
    const {
      cause = undefined,
      code = ERROR_CODES.protocol,
      componentId = '',
      detail = null,
      path = ''
    } = options;

    super(message, cause === undefined ? undefined : { cause });
    this.name = 'GenUIError';
    this.code = code;
    this.path = path;
    this.componentId = componentId;
    this.detail = detail;
  }

  toString() {
    const where = [this.path, this.componentId].filter(Boolean).join(' @ ');
    return `${this.name} [${this.code}]${where ? ` (${where})` : ''}: ${this.message}`;
  }
}

/** 把任意异常收敛成 GenUIError，保留原始 cause。 */
export function toGenUIError(error, options = {}) {
  if (error instanceof GenUIError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  return new GenUIError(message, { ...options, cause: error });
}
