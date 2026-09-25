import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 演示代码的导入必须落在**消费者可解析**的入口上：示例是给人抄的，写 `/ssr`、
 * `internal/yoya.ui.css` 这类只有仓库内（vite 工作区插件）能解析的路径，抄到项目里就是构建报错。
 *
 * 判定依据是各包 package.json 的 `exports`（含通配），不依赖构建产物。
 * `*.test.js` 不在此约束内：测试允许直接摸库内模块。
 */
// jsdom 环境下 `new URL(相对, import.meta.url)` 会跑到 dev-server，所以一律用 node:path 显式计算。
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = {
  '@yoyaflow/yoya-core': 'packages/yoya-core/package.json',
  '@yoyaflow/yoya-ui': 'packages/yoya-ui/package.json',
  '@yoyaflow/yoya-compiler': 'packages/yoya-compiler/package.json'
};

const allowed = new Set();
const allowedPatterns = [];
for (const [name, manifest] of Object.entries(PACKAGES)) {
  const { exports: map = {} } = JSON.parse(readFileSync(join(REPO, manifest), 'utf8'));
  for (const subpath of Object.keys(map)) {
    const key = subpath === '.' ? name : `${name}/${subpath.replace(/^\.\//, '')}`;
    if (key.includes('*')) {
      allowedPatterns.push(
        new RegExp(`^${key.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '.+')}$`)
      );
    } else {
      allowed.add(key);
    }
  }
}

const isAllowed = (specifier) =>
  allowed.has(specifier) || allowedPatterns.some((pattern) => pattern.test(specifier));

const files = [];
const walk = (relative) => {
  const stat = statSync(join(REPO, relative));
  if (stat.isDirectory()) {
    for (const name of readdirSync(join(REPO, relative))) walk(`${relative}/${name}`);
    return;
  }
  if (/\.(js|mjs)$/.test(relative) && !/\.test\.js$/.test(relative)) files.push(relative);
};
walk('examples');

const IMPORT =
  /import\s+(?:(?:type\s+)?(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"](@yoyaflow\/[^'"]+)['"]/g;

describe('演示代码的导入路径', () => {
  it('只使用各包 exports 里公开的入口（含白名单内的 /internal/*）', () => {
    const violations = [];
    for (const file of files) {
      const text = readFileSync(join(REPO, file), 'utf8');
      IMPORT.lastIndex = 0;
      let match;
      while ((match = IMPORT.exec(text))) {
        if (isAllowed(match[1])) continue;
        violations.push(`${file}:${text.slice(0, match.index).split('\n').length}  ← ${match[1]}`);
      }
    }
    expect(violations, `演示代码里有消费者解析不了的导入路径：\n${violations.join('\n')}`).toEqual(
      []
    );
  });
});
