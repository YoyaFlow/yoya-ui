#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const templateDir = resolve(fileURLToPath(new URL('../templates/basic', import.meta.url)));
const args = process.argv.slice(2);
const targetName = args[0] || 'yoya-ui-app';
const targetDir = resolve(process.cwd(), targetName);

if (existsSync(targetDir) && readdirSafe(targetDir).length > 0) {
  console.error(`目标目录已存在且非空：${targetDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
cpSync(templateDir, targetDir, { recursive: true });

// 把模板 package.json 的 name 改为目标目录名
const packagePath = join(targetDir, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
pkg.name = sanitizeName(targetName);
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`\n已创建 yoya-ui 项目：${targetName}\n`);
console.log(`  cd ${targetName}`);
console.log('  npm install');
console.log('  npm run dev');
console.log('\n更多：npm run build 构建，npm run preview 预览产物。\n');

function sanitizeName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_./@]/g, '-')
    .replace(/^[._]+/, '');
}

function readdirSafe(dir) {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}
