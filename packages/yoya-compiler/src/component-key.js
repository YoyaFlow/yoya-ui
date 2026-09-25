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
  // 包（裸 specifier）：按**包名**归键，不再拼调用方目录。
  // 理由：随包发布的注册表不可能知道使用者从哪个子入口 import（`@yoyaflow/yoya-ui` /
  // `/ui` / `/data-display` 都导出同一批组件），而键必须与调用点算出来的完全一致；
  // 用包名归键 ⇒ 同包任一入口命中同一条目，且不会与第三方包的同名导出撞车。
  const bare = packageNameOf(specifier);
  if (bare) {
    return `${bare}#${exportName}`;
  }
  const base = posix.dirname(normalizeModulePath(file));
  const target = posix.normalize(posix.join(base, normalizeModulePath(specifier)));
  return `${target}#${exportName}`;
}

/** 裸 specifier 的包名：`@scope/name/sub` → `@scope/name`；`name/sub` → `name`；相对路径 → null。 */
export function packageNameOf(specifier) {
  // 先按**原样**判断相对 / 绝对 / URL：`normalizeModulePath` 会把 `./x` 折成 `x`，
  // 折完再判断就会把相对导入误当成裸包名。
  const raw = String(specifier ?? '').replace(/\\/g, '/');
  if (!raw || raw.startsWith('.') || raw.startsWith('/') || raw.includes(':')) {
    return null;
  }
  const value = normalizeModulePath(raw);
  const parts = value.split('/');
  if (value.startsWith('@')) {
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  return parts[0] || null;
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

/**
 * 同模块查找：`child(<本地组件>(…))`——调用点与被调用组件在同一个文件里，没有 import 记录。
 *
 * 键是「本模块标签#导出名」，与注册表构建时用同一条 `componentKeyOf` 口径；`file` 用
 * **源码标签**（相对 cwd 的形式，见 `sourceLabelOf`），所以同一份源码在哪儿编都得到同一个键，
 * 产物里也不会嵌机器绝对路径。
 */
export function lookupLocalComponent(registry, { file, export: exportName }) {
  if (!registry || !exportName) {
    return null;
  }
  const key = componentKeyOf(file, exportName);
  const entry = registry.components?.[key];
  return entry ? { key, ...entry } : null;
}
