#!/usr/bin/env node
/**
 * 构建期编译器子入口（Node）：`@yoyaflow/yoya-ui/compiler`。
 *
 * 导出编译 API，并支持直接当 CLI 运行：
 *   node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --file src/row.js --out src/row.generated.js
 *
 * 只在构建期运行（依赖 `@babel/parser`）；浏览器产物不含这个入口。
 */
import * as core from '@yoyaflow/yoya-core';
import { runCliIfMain } from './cli.js';

export * from './index.js';

/** 默认核心入口：库自身的 core（消费者可用 `--core` / `options.core` 换成自己的副本）。 */
export { core as defaultCore };

// 主模块判断要拿**本文件**的 URL：`runCliIfMain` 在 cli.js 里，默认参数是 cli.js 自己的 URL。
await runCliIfMain(core, process.argv.slice(2), import.meta.url);
