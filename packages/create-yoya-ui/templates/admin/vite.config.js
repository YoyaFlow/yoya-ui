import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 本地仓库联调：模板直接使用 yoya-ui 的 src 源码（含最新能力）。
// 脚手架生成的项目（模板被复制出去）不存在该路径，自动回退到 npm 包解析（走 exports 映射）。
const localUi = fileURLToPath(new URL('../../../yoya-ui/src/index.js', import.meta.url));
const useLocal = existsSync(localUi);
// 子入口也要指到源码：`@yoyaflow/yoya-core/api` → `packages/yoya-core/src/api.js`（`ui.css` 单独一条，见下）
const localSource = (path) => fileURLToPath(new URL(`../../../src/${path}`, import.meta.url));

export default defineConfig({
  resolve: useLocal
    ? {
        alias: [
          { find: /^@yoyaflow\/yoya-ui\/ui\.css$/, replacement: localSource('yoya.ui.css') },
          { find: /^@yoyaflow\/yoya-ui\/([\w.-]+)$/, replacement: localSource('yoya.$1.js') },
          { find: '@yoyaflow/yoya-ui', replacement: localUi }
        ]
      }
    : undefined,
  server: {
    port: 5173
  }
});
