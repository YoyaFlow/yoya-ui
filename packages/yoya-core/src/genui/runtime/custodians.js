/**
 * 保管者注册表：数据域里「除 data 外」的数据由谁保管（v0.2）。
 *
 * 保管者存储 = 普通嵌套 JSON 树 + readPath（默认实现零新代码）——配置类直取
 * （@actions / @i18n，不进数据树），业务数据物化走 schema 层 sources。
 * 权限跟着保管者走：这里全部只读；`data` 保管者不进本表（归一化后是普通 $bind）。
 */
import { GenUIError, ERROR_CODES } from '../protocol/errors.js';
import { readPath } from '../protocol/values.js';

export const DATA_CUSTODIAN = 'data';
export const NEAREST_COMPONENT = '#nearest';

export function createCustodianRegistry(custodians = {}) {
  const trees = new Map(Object.entries(custodians));

  return {
    has(name) {
      return trees.has(name);
    },

    names() {
      return [...trees.keys()];
    },

    /** 读保管者树上的路径（静态值；响应式保管者是后续升级，文法不变）。 */
    read(name, path) {
      if (!trees.has(name)) {
        throw new GenUIError(
          `未注册的数据保管者 "${name}"（已注册：${this.names().join(' / ') || '（无）'}）`,
          { code: ERROR_CODES.protocol, path }
        );
      }

      return readPath(trees.get(name), path);
    }
  };
}
