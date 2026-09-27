import { ERROR_CODES, GenUIError } from '../protocol/errors.js';

const LOCAL_LIBRARY = 'local';

/**
 * 函数注册表：`$call` 按名字取实现。
 *
 * 和组件一样按**库命名空间**登记（`yoyaflow/shop-kit#multiply`），短名在**没有重名**时也可用——
 * 这样"通用计算能力随仓库发布、页面 JSON 只写名字"就能成立，同时避免两个库的同名函数互相顶掉。
 *
 * 卸载插件时用 `snapshot()` / `restore()` 回到安装前的状态（和组件注册表同一口径）。
 */
export class FunctionTable {
  constructor(entries = null, meta = {}) {
    this._entries = new Map();

    if (entries) {
      this.registerAll(entries, meta);
    }
  }

  /**
   * 登记一组函数。
   *
   * `meta` 可以是库名（字符串），也可以是 `{ library, aliases }`——每个函数会同时登记成
   * `<库>#函数名`（含别名：短名 `owner/repo` 与带 host 的全名都认）与**唯一**的短名。
   */
  registerAll(entries, meta = {}) {
    const options = typeof meta === 'string' ? { library: meta } : meta;

    Object.entries(entries ?? {}).forEach(([name, impl]) => this.register(name, impl, options));
    return this;
  }

  register(name, impl, { aliases = [], library = LOCAL_LIBRARY, replace = false } = {}) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new GenUIError('函数名必须是非空字符串', { code: ERROR_CODES.component });
    }

    if (typeof impl !== 'function') {
      throw new GenUIError(`函数 "${name}" 的实现必须是函数`, { code: ERROR_CODES.component });
    }

    const existing = this._entries.get(name);

    if (existing && existing.library !== library && replace !== true) {
      throw new GenUIError(
        `函数名冲突：短名 "${name}" 已被 ${existing.library} 占用（$call 里请写全名，` +
          `如 "${existing.library}#${name}" 或 "${library}#${name}"）`,
        { code: ERROR_CODES.component }
      );
    }

    this._entries.set(name, { impl, library });

    // 短名之外再登记带库名的全名（含别名），重名时用全名仍然能调到
    if (library !== LOCAL_LIBRARY && !name.includes('#')) {
      [library, ...aliases].forEach((prefix) => {
        this._entries.set(`${prefix}#${name}`, { impl, library });
      });
    }

    return this;
  }

  /** 按名字取实现（先精确匹配，兼容全名与短名）。 */
  resolve(name) {
    return this._entries.get(String(name))?.impl ?? null;
  }

  /** 名字清单（含全名，方便 `describe()` 报能力）。 */
  names() {
    return [...this._entries.keys()].sort();
  }

  /** 某个库贡献了哪些函数（短名）。 */
  libraryFunctions(library) {
    return [...this._entries.entries()]
      .filter(([name, entry]) => entry.library === library && !name.includes('#'))
      .map(([name]) => name)
      .sort();
  }

  /** 装载插件前的快照 / 还原（插件卸载要把自己带的函数一起收走）。 */
  snapshot() {
    return new Map(this._entries);
  }

  restore(snapshot) {
    this._entries = new Map(snapshot);
  }
}

export function createFunctionTable(entries = null, meta = {}) {
  return new FunctionTable(entries, meta);
}
