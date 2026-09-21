/**
 * 编译路径的运行期子入口：`@yoyaflow/yoya-ui/compiler-runtime`。
 *
 * 只给**构建期编译过**的代码用（编译器生成的模块 import 这里）。主入口不含这些钩子，
 * 不引子入口就等于没有编译路径、也没有额外体积。
 */
export {
  addClassText,
  adopt,
  appendNodeChild,
  applyDynamicArg,
  applyDynamicChild,
  bindChild,
  bindChildText,
  bindClass,
  bindText,
  bindComponent,
  bindNodeCleanup,
  cloneFragment,
  createElementList,
  instantiateComponent,
  instantiateComponentNode,
  keyedRows,
  mountableAt,
  mountNodeAt,
  mountRuntimeChildren,
  pushOff,
  setAttr,
  textAt
} from './compiler/runtime.js';
