import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// 仓库内联调：模板直接吃 yoya-ui / yoya-core 的 src 源码（含最新能力）。
// 脚手架生成出去的项目没有这些路径，自动回退到 npm 包解析（走 exports 映射）。
const uiRoot = new URL('../../../yoya-ui/', import.meta.url);
const coreRoot = new URL('../../../yoya-core/', import.meta.url);
const localUi = fileURLToPath(new URL('src/index.js', uiRoot));
const localCore = fileURLToPath(new URL('src/index.js', coreRoot));
const useLocal = existsSync(localUi) && existsSync(localCore);
const uiSource = (path) => fileURLToPath(new URL(`src/${path}`, uiRoot));
const coreSource = (path) => fileURLToPath(new URL(`src/${path}`, coreRoot));

// 别名与 `scripts/vite-workspace-plugin.mjs` 同源：公开子入口在 `src/<子入口>.js`，
// 少数不按这个名字落位（core 的 ssr / devtools / compiler-runtime 住在 `src/core/` 下），
// `genui-plugin` 是包根的生成物。顺序有意义：越具体的放前面。
const aliases = [
  { find: /^@yoyaflow\/yoya-ui$/, replacement: localUi },
  { find: /^@yoyaflow\/yoya-ui\/ui\.css$/, replacement: uiSource('yoya.ui.css') },
  {
    find: /^@yoyaflow\/yoya-ui\/genui-plugin$/,
    replacement: fileURLToPath(new URL('genui-plugin.js', uiRoot))
  },
  { find: /^@yoyaflow\/yoya-ui\/internal\/(.+)$/, replacement: uiSource('$1') },
  { find: /^@yoyaflow\/yoya-ui\/([\w.-]+)$/, replacement: uiSource('$1.js') },
  { find: /^@yoyaflow\/yoya-core$/, replacement: localCore },
  { find: /^@yoyaflow\/yoya-core\/ssr$/, replacement: coreSource('core/ssr.js') },
  { find: /^@yoyaflow\/yoya-core\/devtools$/, replacement: coreSource('core/devtools.js') },
  {
    find: /^@yoyaflow\/yoya-core\/compiler-runtime$/,
    replacement: coreSource('core/compiler-runtime.js')
  },
  { find: /^@yoyaflow\/yoya-core\/html$/, replacement: coreSource('html/index.js') },
  { find: /^@yoyaflow\/yoya-core\/svg$/, replacement: coreSource('svg/index.js') },
  { find: /^@yoyaflow\/yoya-core\/genui$/, replacement: coreSource('genui/index.js') },
  { find: /^@yoyaflow\/yoya-core\/internal\/(.+)$/, replacement: coreSource('$1') },
  { find: /^@yoyaflow\/yoya-core\/([\w.-]+)$/, replacement: coreSource('$1.js') }
];

export default defineConfig({
  resolve: useLocal ? { alias: aliases } : undefined,
  server: {
    port: 5180
  },
  build: {
    outDir: 'playground-dist'
  }
});
