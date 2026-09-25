/**
 * 产物 import 的钩子必须能从**公共子入口**拿到。
 *
 * 生成模块的 import 名单是"通道基线 + 产物用到的钩子"（`emit.js` 的 `hookImports`），
 * 而打包器语境下这个子入口是 `@yoyaflow/yoya-ui/compiler-runtime`（`plugin.js` 的
 * `PACKAGE_RUNTIME`）→ 任一钩子漏在公共入口之外，用户的构建就是一条 import 链接错误。
 * 这条测试把"发射器能写出的钩子名"与入口的导出逐一对齐（名单从源码里读，避免手抄两份）。
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as runtime from '@yoyaflow/yoya-core/compiler-runtime';
import * as publicRuntime from '@yoyaflow/yoya-ui/internal/compiler-runtime.js';

const emitSource = readFileSync(join(import.meta.dirname, 'emit.js'), 'utf8');
const emittedHooks = [
  ...new Set([...emitSource.matchAll(/hooks\.add\('([A-Za-z]+)'\)/g)].map((match) => match[1]))
].sort();

/** 通道基线：产物一定会 import 的那几个（`hookImports(['cloneFragment'])`）。 */
const baselineHooks = ['cloneFragment'];

describe('编译运行期子入口的导出面', () => {
  it('发射器写出的每个钩子在 runtime.js 与公共子入口上都有实现', () => {
    expect(emittedHooks.length).toBeGreaterThan(10);

    for (const name of [...baselineHooks, ...emittedHooks]) {
      expect(typeof runtime[name], `runtime.js 缺少 ${name}`).toBe('function');
      expect(typeof publicRuntime[name], `compiler-runtime 子入口缺少 ${name}`).toBe('function');
    }
  });

  it('公共子入口 = runtime.js 的导出面（没有第二个名单要维护）', () => {
    const exported = Object.keys(runtime).filter((name) => typeof runtime[name] === 'function');

    for (const name of exported) {
      expect(typeof publicRuntime[name], `compiler-runtime 子入口缺少 ${name}`).toBe('function');
    }
    // 反向：入口上多出来的东西只能是类型 / 常量（当前没有任何一个）
    const extra = Object.keys(publicRuntime).filter(
      (name) => !(name in runtime) && !name.startsWith('__')
    );
    expect(extra).toEqual([]);
  });
});
