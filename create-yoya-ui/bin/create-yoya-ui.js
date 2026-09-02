#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const targetName = args[0] || 'yoya-ui-app';
const targetDir = resolve(process.cwd(), targetName);
const templateArgIndex = args.indexOf('--template');
const templateName =
  templateArgIndex !== -1 && args[templateArgIndex + 1] ? args[templateArgIndex + 1] : 'basic';
const templateRoot = resolve(fileURLToPath(new URL(`../templates/${templateName}`, import.meta.url)));

if (!existsSync(templateRoot)) {
  console.error(`未知模板：${templateName}（可用：basic、ssr、admin）`);
  process.exit(1);
}

if (existsSync(targetDir) && readdirSafe(targetDir).length > 0) {
  console.error(`目标目录已存在且非空：${targetDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
cpSync(templateRoot, targetDir, { recursive: true });

// 把模板 package.json 的 name 改为目标目录名
const packagePath = join(targetDir, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
pkg.name = sanitizeName(targetName);
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`\n已创建 yoya-ui 项目：${targetName}\n`);
console.log(`  cd ${targetName}`);
console.log('  npm install');
if (templateName === 'ssr') {
  console.log('  npm run build');
  console.log('  npm start');
  console.log('\nSSR 模板：renderPage 整页渲染 + hydrateOrMount 客户端接入。\n');
} else {
  console.log('  npm run dev');
  console.log(
    `\n${templateName === 'admin' ? '管理后台模板：顶部导航 + 左侧菜单 + RouterViews 内容区。' : ''}更多：npm run build 构建，npm run preview 预览产物。\n`
  );
}

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
