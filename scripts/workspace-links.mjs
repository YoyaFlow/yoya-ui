// 建 workspace 链接：`node_modules/@yoyaflow/*` → `packages/*`。
//
// 正常流程由 `npm install` 建（npm workspaces）。但**构建与产物门禁不该依赖一次 install**：
// 拆包后 `scripts/*` 与宿主冒烟都要按**包名**import 库源码 / 产物，所以这里给一个幂等的兜底
// （Windows 用 junction，不需要管理员权限）。
import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';

export function ensureWorkspaceLinks(root = process.cwd()) {
  const packagesDir = join(root, 'packages');
  if (!existsSync(packagesDir)) return [];
  const scopeDir = join(root, 'node_modules/@yoyaflow');
  mkdirSync(scopeDir, { recursive: true });
  const linked = [];
  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifest = join(packagesDir, entry.name, 'package.json');
    if (!existsSync(manifest)) continue;
    const name = JSON.parse(readFileSync(manifest, 'utf8')).name;
    if (!name?.startsWith('@yoyaflow/')) continue;
    const link = join(root, 'node_modules', ...name.split('/'));
    if (existsSync(link)) continue;
    mkdirSync(join(link, '..'), { recursive: true });
    symlinkSync(join(packagesDir, entry.name), link, 'junction');
    linked.push(name);
  }
  return linked;
}
