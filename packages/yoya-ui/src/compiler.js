#!/usr/bin/env node
/**
 * 老路径的**转发壳**：`@yoyaflow/yoya-ui/compiler`。
 *
 * 编译器引擎已经独立成 `@yoyaflow/yoya-compiler`（构建期工具，不属于运行期包）。
 * 这个文件只为"发布路径与原来一致"存在：老用户 `import … from "@yoyaflow/yoya-ui/compiler"`
 * 仍然可用，但需要装 `@yoyaflow/yoya-compiler`（ui 把它声明成**可选 peer**）。
 *
 * 直接当 CLI 跑（`node dist/yoya.compiler.js --file … --out …`）会转发到新包的 bin。
 */
import { pathToFileURL } from 'node:url';

export * from '@yoyaflow/yoya-compiler';

// 直接执行本文件时（npm 的 bin shim 就是这么干的）转发到真正的 CLI 入口
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await import('@yoyaflow/yoya-compiler/bin');
}
