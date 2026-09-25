import { defineConfig } from 'vite';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 本地仓库联调：仓库内跑模板时直接用 yoya-ui 的 src 源码；
// 脚手架生成出去的项目没有这个路径，自动回退到 npm 包解析（走 exports 映射）。
const localUi = fileURLToPath(new URL('../../../src/index.js', import.meta.url));
const useLocal = existsSync(localUi);
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
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      input: 'src/client.js',
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css') ? 'assets/yoya.ui.css' : 'assets/[name][extname]',
        entryFileNames: 'client.js'
      }
    }
  }
});
