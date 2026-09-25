import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// 工作区内把两个包名解析到**源码**：示例、模板、契约测试与脚本都按使用者的写法
// import 包名，仓库内不需要先构建。发布形态由各包 package.json 的 exports 兜底。
// 库内深引用统一走 `/internal/*`（与包的 exports 同构）。
const PACKAGES = {
  '@yoyaflow/yoya-core': 'packages/yoya-core/src',
  '@yoyaflow/yoya-ui': 'packages/yoya-ui/src',
  '@yoyaflow/yoya-compiler': 'packages/yoya-compiler/src'
};

// 公开子入口里有两处不按"<name>.js"落位（core 的 SSR 原语与 devtools 住在 core/ 下）
const SUBPATH_OVERRIDES = {
  '@yoyaflow/yoya-core/ssr': 'packages/yoya-core/src/core/ssr.js',
  '@yoyaflow/yoya-core/devtools': 'packages/yoya-core/src/core/devtools.js',
  // 编译产物的运行期钩子（只有编译过的项目才会加载它）
  '@yoyaflow/yoya-core/compiler-runtime': 'packages/yoya-core/src/core/compiler-runtime.js'
};

export function workspaceSourcePlugin() {
  let root = process.cwd();
  return {
    name: 'yoya-workspace-source',
    enforce: 'pre',
    configResolved(config) {
      // config.root 可能是 `examples/`（示例站自己的 root）或 URL 形态；只有当它确实装着
      // `packages/` 时才是仓库根。否则用 cwd（所有脚本都从仓库根跑）。
      if (
        config.root &&
        /^[A-Za-z]:[\\/]/.test(config.root) &&
        existsSync(resolve(config.root, 'packages'))
      ) {
        root = config.root;
      }
      if (process.env.YOYA_WS_DEBUG) console.error('[yoya-workspace-source] root =', root);
    },
    resolveId(source) {
      if (SUBPATH_OVERRIDES[source]) return resolve(root, SUBPATH_OVERRIDES[source]);
      for (const [pkg, dir] of Object.entries(PACKAGES)) {
        if (source === pkg) return resolve(root, dir, 'index.js');
        if (!source.startsWith(`${pkg}/`)) continue;
        const rest = source.slice(pkg.length + 1);
        if (rest === 'ui.css') return resolve(root, dir, 'yoya.ui.css');
        const inner = rest.startsWith('internal/') ? rest.slice('internal/'.length) : rest;
        // `core/node.js`（带扩展）/ `html`（目录入口）/ `html/index.js` 三种写法都要认
        const candidates = [
          resolve(root, dir, inner),
          resolve(root, dir, `${inner}.js`),
          resolve(root, dir, inner, 'index.js')
        ];
        for (const candidate of candidates) {
          // 只认**文件**：`src/html` 是目录，必须落到 `src/html/index.js`
          const isFile = (() => {
            try {
              return statSync(candidate).isFile();
            } catch {
              return false;
            }
          })();
          if (process.env.YOYA_WS_DEBUG)
            console.error('[yoya-workspace-source]', source, '→', candidate, isFile);
          if (isFile) return candidate;
        }
        return candidates[1];
      }
      return null;
    }
  };
}
