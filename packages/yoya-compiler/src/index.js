/**
 * 构建期编译器的公共 API（`yoya-ui/compiler`）。
 *
 * 三个使用面：
 * - 程序化编译：`compileSource` / `compileFile`；
 * - 覆盖率体检：`reportCoverage`（见 `./report.js`）；
 * - 命令行：`runCli`（`node dist/yoya.compiler.js --file …`，见 `./cli.js`）。
 *
 * 编译器只在构建期运行：它 import `@babel/parser`，不进浏览器产物；客户端只加载
 * `yoya-ui/compiler-runtime` 的钩子。
 */
export {
  elementWhitelistOf,
  compileSource,
  compileFile,
  summarizeCompile,
  DEFAULT_RUNTIME
} from './compile.js';
export { analyzeSource, freeIdentifiers } from './analyze.js';
export { renderModule } from './emit.js';
export { reportCoverage, coverageBaselineOf, compareCoverageBaseline } from './report.js';
export { runCli, runCliIfMain } from './cli.js';
export {
  componentUnits,
  wireComponentModule,
  // 兼容别名（0.6.11 及更早）
  wireRowModule,
  viewFactoryUnits
} from './plugin-core.js';
// `yoyaCompile` / `yoyaCompilePlugin` 按需加载 unplugin（老 Node 上不 import 就不会碰它）；
// Rollup / Vite 项目建议直接用 `@yoyaflow/yoya-compiler/rollup`，无需 unplugin。
export { yoyaCompile, yoyaCompilePlugin } from './unplugin-bridge.js';
export {
  componentKeyOf,
  lookupComponent,
  normalizeModulePath,
  resolveComponentKey
} from './component-key.js';
export {
  buildComponentRegistry,
  compileComponent,
  findViewExpression,
  REGISTRY_VERSION
} from './registry.js';
