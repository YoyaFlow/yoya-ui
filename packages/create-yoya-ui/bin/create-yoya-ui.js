#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** 模板在仓库内被构建过时不该跟着进新项目的产物目录。 */
const TEMPLATE_ARTIFACTS = new Set([
  'node_modules',
  'dist',
  'playground-dist',
  'coverage',
  '.vite'
]);

/** 每个模板的"装完先干什么"（新增模板时在这里补一条；`--list` 也读它）。 */
const TEMPLATE_HINTS = {
  admin: {
    about: '标准后台管理模板（顶部导航 + 左侧菜单 + RouterViews 内容区）',
    note: '管理后台模板：顶部导航 + 左侧菜单 + RouterViews 内容区。更多：npm run build 构建，npm run preview 预览产物。',
    run: ['npm run dev']
  },
  basic: {
    about: '最小 SPA 示例（页面壳 / 表单 / 主题切换）',
    note: '更多：npm run build 构建，npm run preview 预览产物。',
    run: ['npm run dev']
  },
  'genui-kits': {
    about: 'GenUI kit（组件以 JSON 被模型使用，可被 GenUI 宿主动态装载）',
    note: 'GenUI kit 模板：components/*/component.json 是组件元数据真相源，kit.json / indexes/ 由 npm run kit:generate 生成；npm run verify 是提交前的全套门禁。',
    run: ['npm run dev'],
    todo: '把 kit.json 的 namespace / repo（以及组件实现里的 KIT_NAMESPACE / repo / source 元数据）换成你自己的组织与仓库'
  },
  'genui-project': {
    about: 'GenUI 应用工程（项目即目录：resources/ + apps/<ui>/ + data|cache|versions·cwd 即项目）',
    note:
      'GenUI 应用工程：**这个目录就是 agent 的工作目录** —— resources/ 放「数据是什么 / 怎么取」、' +
      'apps/<ui>/ 是**一个 UI 一个可独立起的工程**（页面在 src/pages/*.genui.json）、data|cache|versions 是数据三件、' +
      '.genui/ 是宿主账本（可重建）。地址与凭据不进项目：本机配运行时目录，部署方提供 hosts。',
    // 根 package.json 只有 workspaces（没有脚本）：装完工作区之后要**进 UI 工程**起开发服务器
    run: ['cd apps/main && npm run dev'],
    todo: '把项目名写进根 package.json 的 genui.project（不写就按目录名推），再把示例资源 / 数据 / 页面换成你自己的口径'
  },
  ssr: {
    about: 'SSR 模板（renderPage 整页渲染 + hydrateOrMount 客户端接入）',
    note: 'SSR 模板：renderPage 整页渲染 + hydrateOrMount 客户端接入。',
    run: ['npm run build', 'npm start']
  }
};

const args = process.argv.slice(2);
const templatesRoot = fileURLToPath(new URL('../templates', import.meta.url));
const available = availableTemplates();

if (args.includes('--list') || args.includes('-l')) {
  console.log('可用模板：');
  console.log(
    available
      .map((name) => `  ${name}${TEMPLATE_HINTS[name] ? ` — ${TEMPLATE_HINTS[name].about}` : ''}`)
      .join('\n')
  );
  process.exit(0);
}

const targetName = args[0] || 'yoya-ui-app';
const targetDir = resolve(process.cwd(), targetName);
const templateArgIndex = args.indexOf('--template');
const templateName =
  templateArgIndex !== -1 && args[templateArgIndex + 1] ? args[templateArgIndex + 1] : 'basic';
const templateRoot = resolve(templatesRoot, templateName);

if (!available.includes(templateName)) {
  console.error(`未知模板：${templateName}（可用：${available.join('、')}）`);
  process.exit(1);
}

if (existsSync(targetDir) && readdirSafe(targetDir).length > 0) {
  console.error(`目标目录已存在且非空：${targetDir}`);
  process.exit(1);
}

mkdirSync(targetDir, { recursive: true });
cpSync(templateRoot, targetDir, { recursive: true, filter: keepTemplateFile });

// 把模板 package.json 的 name 改为目标目录名
const packagePath = join(targetDir, 'package.json');
const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
pkg.name = sanitizeName(targetName);
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

const hint = TEMPLATE_HINTS[templateName] ?? { run: ['npm run dev'] };

console.log(`\n已创建 yoya-ui 项目：${targetName}（模板 ${templateName}）\n`);
console.log(`  cd ${targetName}`);
console.log('  npm install');
for (const command of hint.run) {
  console.log(`  ${command}`);
}
if (hint.note) {
  console.log(`\n${hint.note}`);
}
if (hint.todo) {
  console.log(`\n下一步：${hint.todo}\n`);
}

/** 可用模板 = templates/ 下有 package.json 的目录（新增模板不用改这里）。 */
function availableTemplates() {
  return readdirSafe(templatesRoot)
    .filter(
      (name) => !name.startsWith('.') && existsSync(join(templatesRoot, name, 'package.json'))
    )
    .sort();
}

/**
 * 只搬模板的源码：模板在仓库内被构建过时，`dist/` / `node_modules/` 这些产物不该跟着进新项目
 * （发布出去时 `package.json` 的 `files` 也排除它们）。
 */
function keepTemplateFile(source) {
  return !TEMPLATE_ARTIFACTS.has(basename(source));
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
