/**
 * 组件注册表的键：**相对项目根的模块路径#导出名**（`src/components/status-dot.js#StatusDot`）。
 *
 * 两边同口径：注册表构建时用组件自己的文件路径，调用点用它 import 的 specifier 相对调用方
 * 文件解析。路径统一成 posix 形式并折叠 `..`，因此 Windows / Linux 与不同的 import 写法
 * 只要指向同一个文件就得到同一个键；解析不出（动态 import、跨包、未登记）就返回 null，
 * 调用点回落通用路径——不给「猜」留口子。
 */
import { posix } from 'node:path';

/** 统一分隔符并折叠 `..` / `.`。 */
export function normalizeModulePath(path) {
  const value = String(path ?? '').replace(/\\/g, '/');
  return posix.normalize(value).replace(/^\.\//, '');
}

/** `file#export` 形式的注册表键（`file` 原样给出，按项目根相对路径书写）。 */
export function componentKeyOf(file, exportName) {
  return `${normalizeModulePath(file)}#${exportName}`;
}

/** 调用点的键：把 import 的 specifier 相对调用方文件解析后规范化。 */
export function resolveComponentKey({ file, specifier, export: exportName }) {
  const base = posix.dirname(normalizeModulePath(file));
  const target = posix.normalize(posix.join(base, normalizeModulePath(specifier)));
  return `${target}#${exportName}`;
}

/** 注册表查找：命中返回纯数据条目，未命中返回 null。 */
export function lookupComponent(registry, { file, specifier, imported }) {
  if (!registry || !imported || imported === '*') {
    return null;
  }
  const key = resolveComponentKey({ file, specifier, export: imported });
  const entry = registry.components?.[key];
  // 把键一起交回去：调用点生成的是 `components[<键>]`，键必须是条目的一部分
  return entry ? { key, ...entry } : null;
}
