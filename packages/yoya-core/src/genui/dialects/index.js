import { ERROR_CODES, GenUIError } from '../protocol/errors.js';
import { a2uiDialect } from './a2ui/index.js';

/**
 * 方言注册表：把别的 UI JSON 标准翻译成 yoya-genui schema。
 *
 * 一个方言只需要三件事：名字（含别名）、`convert(input, options) → schema`，
 * 以及可选的 `detect(input) → boolean`（`GenUI.fromJson(json)` 自动识别用）。
 */
export class DialectRegistry {
  constructor(definitions = []) {
    this._definitions = [];
    this._index = new Map();
    definitions.forEach((definition) => this.register(definition));
  }

  register(definition) {
    const normalized = normalizeDialectDefinition(definition);
    this._definitions.push(normalized);
    [normalized.name, ...normalized.aliases].forEach((key) => {
      this._index.set(key.toLowerCase(), normalized);
    });
    return this;
  }

  resolve(name) {
    return typeof name === 'string' ? (this._index.get(name.trim().toLowerCase()) ?? null) : null;
  }

  has(name) {
    return this.resolve(name) !== null;
  }

  /** 自动识别：第一个认领输入的方言（按注册顺序）。 */
  detect(input) {
    return (
      this._definitions.find((definition) => {
        if (typeof definition.detect !== 'function') {
          return false;
        }

        try {
          return definition.detect(input) === true;
        } catch {
          return false;
        }
      }) ?? null
    );
  }

  names() {
    return this._definitions.map((definition) => definition.name);
  }

  list() {
    return this._definitions.map((definition) => ({
      aliases: [...definition.aliases],
      label: definition.label,
      name: definition.name,
      version: definition.version
    }));
  }

  get size() {
    return this._definitions.length;
  }
}

export function createDialectRegistry(definitions = [a2uiDialect]) {
  return new DialectRegistry(definitions);
}

function normalizeDialectDefinition(definition) {
  if (!definition || typeof definition.name !== 'string' || definition.name.trim() === '') {
    throw new GenUIError('方言定义需要 name', { code: ERROR_CODES.dialect });
  }

  if (typeof definition.convert !== 'function') {
    throw new GenUIError(`方言 "${definition.name}" 需要 convert 函数`, {
      code: ERROR_CODES.dialect
    });
  }

  return {
    ...definition,
    aliases: Array.isArray(definition.aliases) ? definition.aliases.map(String) : [],
    convert: definition.convert,
    detect: definition.detect ?? null,
    label: definition.label ?? definition.name,
    name: definition.name.trim().toLowerCase(),
    version: definition.version ?? null
  };
}

export const dialects = createDialectRegistry([a2uiDialect]);

export { a2uiDialect };
export { a2uiTheme, toA2UIUserAction } from './a2ui/index.js';
