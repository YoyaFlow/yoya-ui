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
  // 这里是**壳**：自己判断出「我是主模块」之后直接跑 CLI，别把判断交给 bin.js
  // （bin.js 拿的是它自己的 URL，和本文件路径不相等，转过去只会静默退出）。
  const [{ runCli }, core] = await Promise.all([
    import('@yoyaflow/yoya-compiler'),
    import('@yoyaflow/yoya-core')
  ]);
  process.exitCode = await runCli(process.argv.slice(2), { core });
}
