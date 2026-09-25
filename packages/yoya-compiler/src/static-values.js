/**
 * 构建期可折叠的库内静态值（编译覆盖度：库内组件也要能编）。
 *
 * 只覆盖「构建期能算出与运行期**同一个值**」的三类形状，而且值都由库自己的实现给出：
 * - `themeValue` / `themeBorder`：纯字符串构造的主题助手（`var(--yoya-<token>, <fallback>)`）。
 *
 * 为什么按**导入来源**认：同名函数在业务代码里可能是别的东西，折错就是"把不知道的值编成
 * 静态片段"——正是编译路径最危险的失败模式。所以只有从**契约助手模块**导入的这些
 * 名字参与折叠，其它标识符 / 调用一律不折（照旧 bail）。
 */
// 契约级助手住在慢线包（票 06 §一）：编译器只依赖 core；0.8 起主题助手在 `/tools`
import { themeBorder, themeValue } from '@yoyaflow/yoya-core/tools';

/** 导出名 → 折叠方式：`value` 直接取值；`call` 拿折叠后的字面量参数调用（同一份实现）。 */
export const STATIC_LIBRARY_EXPORTS = new Map([
  ['themeValue', { kind: 'call', fn: themeValue }],
  ['themeBorder', { kind: 'call', fn: themeBorder }]
]);

/**
 * 这条导入路径才算库内静态助手：Windows 分隔符、相对路径、包路径都认。
 *
 * 三种写法都合法：库内组件的历史写法 `…/components/shared.js`（ui 里仍有一层再导出）、
 * 契约助手自己的模块 `…/core/component-authoring.js`、以及公开入口
 * `@yoyaflow/yoya-core`（0.8 起这些助手在 `@yoyaflow/yoya-core/tools`，两个都认）。
 */
const STATIC_MODULE_PATTERN =
  /((^|\/)components\/shared(\.js)?$)|((^|\/)core\/component-authoring(\.js)?$)|(^@yoyaflow\/yoya-core$)|(^@yoyaflow\/yoya-core\/tools$)/;

export function isStaticLibraryModule(specifier) {
  if (typeof specifier !== 'string') {
    return false;
  }
  return STATIC_MODULE_PATTERN.test(specifier.replaceAll('\\', '/'));
}
