import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 本地仓库联调：模板直接使用 yoya-ui 的 src 源码（含最新权限能力）。
// 脚手架生成的项目（模板被复制出去）不存在该路径，自动回退到 npm 包解析。
const localUi = fileURLToPath(new URL('../../../src/index.js', import.meta.url));
const localCss = fileURLToPath(new URL('../../../src/yoya.ui.css', import.meta.url));
const useLocal = existsSync(localUi);

export default defineConfig({
  resolve: useLocal
    ? {
        alias: [
          { find: /^@yoyaflow\/yoya-ui\/ui\.css$/, replacement: localCss },
          { find: '@yoyaflow/yoya-ui', replacement: localUi }
        ]
      }
    : undefined,
  server: {
    port: 5173
  }
});
