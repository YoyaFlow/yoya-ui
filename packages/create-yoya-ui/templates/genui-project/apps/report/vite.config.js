import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * 第二个 UI 的构建配置（与 `apps/main` 同一个口径）：一个 UI 一个工程，互不牵连。
 *
 * 仓库内联调：模板在仓库里跑时，子入口直接指到 `packages/yoya-ui/src/*`（最新能力）；
 * 脚手架生成出去的项目没有那个路径，自动回退到 npm 包解析（走 exports 映射）。
 * 两处例外：`ui.css` 是样式文件，`genui-plugin` 是**包根**的生成物（不在 src/ 下）。
 */
const localUi = fileURLToPath(new URL('../../../../../yoya-ui/src/index.js', import.meta.url));
const useLocal = existsSync(localUi);
const localSource = (path) =>
  fileURLToPath(new URL(`../../../../../yoya-ui/src/${path}`, import.meta.url));
const localRoot = (path) =>
  fileURLToPath(new URL(`../../../../../yoya-ui/${path}`, import.meta.url));

export default defineConfig({
  base: './',
  resolve: useLocal
    ? {
        alias: [
          { find: /^@yoyaflow\/yoya-ui\/ui\.css$/, replacement: localSource('yoya.ui.css') },
          {
            find: /^@yoyaflow\/yoya-ui\/genui-plugin$/,
            replacement: localRoot('genui-plugin.js')
          },
          { find: /^@yoyaflow\/yoya-ui\/([\w.-]+)$/, replacement: localSource('$1.js') },
          { find: '@yoyaflow/yoya-ui', replacement: localUi }
        ]
      }
    : undefined,
  build: { outDir: 'dist', emptyOutDir: true }
});
