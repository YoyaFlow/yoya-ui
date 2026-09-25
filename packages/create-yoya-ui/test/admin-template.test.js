import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import * as yoyaRouter from '@yoyaflow/yoya-ui/router';
import * as yoyaApi from '@yoyaflow/yoya-core/api';
import * as yoyaCore from '@yoyaflow/yoya-core';
import * as yoyaUi from '@yoyaflow/yoya-ui';
import '../templates/admin/src/api/domain.api.js';
import '../templates/admin/src/features/system/members/api/member.mock.js';
import '../templates/admin/src/features/system/dicts/api/dict.mock.js';
import '../templates/admin/src/features/system/permissions/api/permission.mock.js';
import '../templates/admin/src/features/system/roles/api/role.mock.js';
import '../templates/admin/src/shell/api/auth.mock.js';
import '../templates/admin/src/shell/api/shell.mock.js';
import { DashboardOverviewPage } from '../templates/admin/src/features/dashboard/overview/pages/dashboard-overview-page.js';
import { TodoApprovalPage } from '../templates/admin/src/features/dashboard/todos/pages/todo-approval-page.js';
import { DictEditorDialog } from '../templates/admin/src/features/system/dicts/components/dict-editor-dialog.js';
import { DictItemFormDialog } from '../templates/admin/src/features/system/dicts/components/dict-item-form-dialog.js';
import DictsPageState from '../templates/admin/src/features/system/dicts/api/dict.state.js';
import { DictListPage } from '../templates/admin/src/features/system/dicts/pages/dict-list-page.js';
import { MemberFormDialog } from '../templates/admin/src/features/system/members/components/member-form-dialog.js';
import MembersPageState from '../templates/admin/src/features/system/members/api/member.state.js';
import { MemberTable } from '../templates/admin/src/features/system/members/components/member-table.js';
import { MemberListPage } from '../templates/admin/src/features/system/members/pages/member-list-page.js';
import { PermissionFormDialog } from '../templates/admin/src/features/system/permissions/components/permission-form-dialog.js';
import PermissionsPageState from '../templates/admin/src/features/system/permissions/api/permission.state.js';
import { PermissionListPage } from '../templates/admin/src/features/system/permissions/pages/permission-list-page.js';
import { RoleFormDialog } from '../templates/admin/src/features/system/roles/components/role-form-dialog.js';
import RolesPageState from '../templates/admin/src/features/system/roles/api/role.state.js';
import { RoleListPage } from '../templates/admin/src/features/system/roles/pages/role-list-page.js';
import { DeployListPage } from '../templates/admin/src/features/ops/deploys/pages/deploy-list-page.js';
import { ServiceListPage } from '../templates/admin/src/features/ops/services/pages/service-list-page.js';
import ShellState from '../templates/admin/src/shell/api/shell.state.js';
import { AdminShell } from '../templates/admin/src/shell/components/admin-shell.js';

// 脚手架模板的「ref 口径」校验：生成物把视图字段放 ref、列表按 key 合并行模型，
// 页面不再用 subscribe + refresh() 手动驱动视图。
const ROOT = resolve(import.meta.dirname, '../..');
const TEMPLATES = join(ROOT, 'create-yoya-ui/templates');
const TEMPLATE = join(ROOT, 'create-yoya-ui/templates/admin');
const SCAFFOLDER = join(ROOT, 'create-yoya-ui/bin/create-yoya-ui.js');
const read = (relative) => readFileSync(join(TEMPLATE, relative), 'utf8');

const FEATURES = [
  { key: 'members', name: 'member' },
  { key: 'roles', name: 'role' },
  { key: 'permissions', name: 'permission' },
  { key: 'dicts', name: 'dict' }
];
// 按 key 对账的列表：表格组件与内联表格（字典列表 / 字典值）
const KEYED_TABLES = [
  'src/features/system/members/components/member-table.js',
  'src/features/system/roles/components/role-table.js',
  'src/features/system/dicts/pages/dict-list-page.js',
  'src/features/system/dicts/components/dict-editor-dialog.js'
];
// 模板内部路径（相对**模板根**），与本仓库的 packages/ 布局无关
const featureFile = (module, file) => `src/features/system/${module}/${file}`;
const stateFile = (feature) => featureFile(feature.key, `api/${feature.name}.state.js`);
const pageFile = (feature) => featureFile(feature.key, `pages/${feature.name}-list-page.js`);

function collectJsFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules') {
      return [];
    }

    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectJsFiles(full);
    }

    return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [full] : [];
  });
}

/** 子入口 → 本仓库入口模块（`@yoyaflow/yoya-core` → `packages/yoya-core/src/index.js`）。 */
const ENTRY_MODULES = new Map([
  ['@yoyaflow/yoya-ui', yoyaUi],
  ['@yoyaflow/yoya-core', yoyaCore],
  ['@yoyaflow/yoya-core/api', yoyaApi],
  ['@yoyaflow/yoya-ui/router', yoyaRouter]
]);

describe('create-yoya-ui admin template', () => {
  it('maps yoya-ui sub-entries to local sources so templates run inside the repo', () => {
    const failures = [];

    collectJsFiles(TEMPLATES).forEach((file) => {
      const relative = file.slice(TEMPLATES.length + 1).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8');
      const used = new Set(
        [...source.matchAll(/from\s*'(@yoyaflow\/yoya-ui\/[^']+)'/g)]
          .map((match) => match[1])
          .filter((specifier) => !specifier.endsWith('.css'))
      );

      if (used.size === 0) {
        return;
      }

      // 模板的 vite 配置：仓库内跑时把子入口指到 `packages/yoya-ui/src/yoya.<子入口>.js`
      // （少了别名就是 `Failed to resolve import "@yoyaflow/yoya-core/api"`，模板直接白屏）
      const templateDir = file.slice(0, file.indexOf('\\src\\'));
      const config = readFileSync(join(templateDir, 'vite.config.js'), 'utf8');

      if (!/find:\s*\/\^@yoyaflow\\\/yoya-ui\\\/\(\[\\w\.-\]\+\)\$\//.test(config)) {
        failures.push(
          `${relative}: 模板用了子入口 ${[...used].join(' / ')}，但 ${templateDir.replace(`${TEMPLATES}\\`, '')}/vite.config.js 没有子入口本地别名`
        );
      }
    });

    expect(failures.join('\n')).toBe('');
  });

  it('keeps every template import backed by a real export', () => {
    const failures = [];

    collectJsFiles(TEMPLATES).forEach((file) => {
      const relative = file.slice(TEMPLATES.length + 1).replace(/\\/g, '/');
      const source = readFileSync(file, 'utf8');
      const pattern = /import\s*\{([^}]*)\}\s*from\s*'(@yoyaflow\/yoya-ui[^']*)'/g;

      for (const match of source.matchAll(pattern)) {
        const specifier = match[2];
        const entry = ENTRY_MODULES.get(specifier);

        if (!entry) {
          failures.push(
            `${relative}: 子入口 ${specifier} 未纳入自检映射（模板导入必须指向真实导出）`
          );
          continue;
        }

        match[1]
          .split(',')
          .map((name) =>
            name
              .trim()
              .split(/\s+as\s+/)[0]
              .trim()
          )
          .filter(Boolean)
          .forEach((name) => {
            if (!(name in entry)) {
              failures.push(`${relative}: 导入了 ${specifier} 里不存在的 ${name}`);
            }
          });
      }
    });

    expect(failures.join('\n')).toBe('');
  });

  const workdir = mkdtempSync(join(tmpdir(), 'yoya-scaffold-'));
  const generated = join(workdir, 'admin-app');

  beforeAll(() => {
    execFileSync(process.execPath, [SCAFFOLDER, 'admin-app', '--template', 'admin'], {
      cwd: workdir,
      stdio: 'pipe'
    });
  });

  afterAll(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('generates an admin project from the template', () => {
    const pkg = JSON.parse(readFileSync(join(generated, 'package.json'), 'utf8'));
    expect(pkg.name).toBe('admin-app');
    expect(existsSync(join(generated, 'src/shell/components/admin-shell.js'))).toBe(true);

    // 生成物是模板的副本：下面校验的就是新项目里那份代码
    for (const feature of FEATURES) {
      const state = stateFile(feature);
      expect(readFileSync(join(generated, state), 'utf8')).toBe(read(state));
    }
  });

  it('keeps view-driving page state in refs and out of subscribe plumbing', () => {
    for (const feature of FEATURES) {
      const source = read(stateFile(feature));
      expect(source, `${feature.name}.state.js 应使用 ref 持有视图字段`).toMatch(/\bref\(/);
      expect(source, `${feature.name}.state.js 不应再有订阅者管道`).not.toMatch(
        /_listeners|_emit\(|subscribe\(listener/
      );
    }

    // 直接绑定句柄后，页面不再需要「数据变化 → 手动 refresh」的接线
    for (const feature of FEATURES) {
      expect(read(pageFile(feature))).not.toMatch(/state\.subscribe\(/);
    }
  });

  it('organises row models as hot-field handles plus cold plain values', () => {
    const members = read(featureFile('members', 'api/member.views.js'));
    const roles = read(featureFile('roles', 'api/role.views.js'));

    expect(members).toMatch(/this\.name = ref\(/);
    expect(members).toMatch(/this\.email = ref\(/);
    expect(members).toMatch(/this\.id = row\.id;/);
    expect(members).toMatch(/apply\(row\)/);
    // 冷字段保持普通值：角色排序不参与行内原地刷新
    expect(roles).toMatch(/this\.sort = fieldValue\(row\.sort\)/);
  });

  it('reconciles table rows by key instead of rebuilding them', () => {
    for (const file of KEYED_TABLES) {
      const table = read(file);
      expect(table, `${file} 应按 key 对账`).toMatch(/\.keyed\(/);
      expect(table, `${file} 不应再手工销毁重建行`).not.toMatch(
        /children\(\)\.forEach\(\(child\) => child\.destroy\(\)\)/
      );
    }
  });

  it('keeps every template component in shape A or B instead of object components', () => {
    const failures = [];

    collectJsFiles(join(TEMPLATE, 'src')).forEach((file) => {
      const source = readFileSync(file, 'utf8');

      // 对象组件（`return { render(), … }`）已退场：模板里出现就是教错写法
      if (/return \{\s*\n\s*render\(\) \{/.test(source)) {
        failures.push(
          `${file.slice(TEMPLATE.length + 1)}: 不要再写对象组件——没有命令方法就返回 ViewNode（形态 A），` +
            '有命令方法就写 vNode((api) => 视图)（形态 B）'
        );
      }
    });

    expect(failures.join('\n')).toBe('');
  });
});

describe('generated admin page state', () => {
  it('loads list data into signals and keeps row identity across refreshes', async () => {
    const state = new MembersPageState();
    await state.load();

    expect(state.total.value).toBe(13);
    expect(state.items.value).toHaveLength(5);

    const firstRow = state.items.value[0];
    expect(firstRow.name.value).toBe('张伟');

    await state.load();

    // 同 key 的行复用实例：keyed 据此跳过重建
    expect(state.items.value[0]).toBe(firstRow);
    expect(state.items.value[0].name.peek()).toBe('张伟');
  });

  it('refreshes a table cell in place instead of rebuilding the row', async () => {
    const state = new MembersPageState();
    await state.load();
    const table = MemberTable({ rows: state.items, onEdit: () => {}, onRemove: () => {} });
    const element = table.renderDom();
    const row = element.querySelectorAll('tbody tr')[0];
    const nameCell = row.children[0];

    expect(nameCell.textContent).toBe('张伟');

    await state.edit(1, { name: '张伟（已改名）' });

    expect(element.querySelectorAll('tbody tr')[0]).toBe(row);
    expect(nameCell.textContent).toBe('张伟（已改名）');
  });

  it('serves every feature page state from the same signal contract', async () => {
    const roles = new RolesPageState();
    await roles.load();
    expect(roles.items.value.length).toBeGreaterThan(0);

    const permissions = new PermissionsPageState();
    await permissions.load();
    expect(permissions.tree.value.length).toBeGreaterThan(0);

    const dicts = new DictsPageState();
    await dicts.loadTypes();
    expect(dicts.types.value.length).toBeGreaterThan(0);
    expect(dicts.items.value.length).toBeGreaterThan(0);
  });

  it('drives shell navigation from signals', async () => {
    const state = new ShellState();
    await state.load();
    const element = AdminShell({ state }).renderDom();

    expect(state.menus.value.length).toBeGreaterThan(0);
    expect(element.textContent).toContain('工作台');

    state.syncFromPath('/system/members');

    expect(state.activeModuleKey.value).toBe('system');
    expect(state.activePath.value).toBe('/system/members');
    // 侧栏是读信号的区域：当前模块 / 路径变化后自行重建
    expect(element.textContent).toContain('成员管理');
    expect(element.textContent).toContain('角色管理');
  });

  it('draws the dashboard charts through the adapter into the view tree', () => {
    const holder = document.createElement('div');
    document.body.appendChild(holder);

    // 适配器在 whenMount 里初始化：先落地再断言节点真的画出内容（不是只多了个空宿主）
    DashboardOverviewPage().bindTo(holder);

    const charts = holder.querySelectorAll("[vn~='VChart']");
    expect(charts.length).toBe(2);
    charts.forEach((chart) => {
      expect(chart.querySelector('svg')).not.toBeNull();
      expect(chart.querySelectorAll('rect, polyline').length).toBeGreaterThan(0);
    });
    expect(holder.textContent).toContain('请求量');

    holder.remove();
  });

  it('renders every generated page', async () => {
    const pages = [
      DashboardOverviewPage,
      TodoApprovalPage,
      ServiceListPage,
      DeployListPage,
      MemberListPage,
      RoleListPage,
      PermissionListPage,
      DictListPage
    ];

    for (const Page of pages) {
      // 页面也是组件：形态 A 直接返回 ViewNode（没有页面壳层）
      const element = Page().renderDom();
      expect(element.textContent.length, `${Page.name} 未渲染出内容`).toBeGreaterThan(0);
      element.remove?.();
    }

    // 页面在构造时就发起请求，等 mock 回来后再收尾，避免留下未处理的拒绝
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 300));
  });

  it('opens edit dialogs for row models and plain rows', async () => {
    const members = new MembersPageState();
    await members.load();

    const memberDialog = MemberFormDialog({ onSubmit: () => {} });
    // 行模型：热字段是句柄，弹窗回填要读字段值
    const firstMember = members.items.value[0];
    memberDialog.open(firstMember);
    const memberForm = memberDialog.renderDom();
    expect(memberForm.querySelector('input[name="name"]').value).toBe(firstMember.name.value);
    // 邮箱这类热字段同样要回填（组件口径：写进去；浏览器清"身份字段"是另一回事）
    expect(memberForm.querySelector('input[name="email"]').value).toBe(firstMember.email.peek());

    const roleState = new RolesPageState();
    await roleState.load();
    const roleDialog = RoleFormDialog({ onSubmit: () => {} });
    roleDialog.open(roleState.items.value[0]);
    const roleForm = roleDialog.renderDom();
    expect(roleForm.querySelector('input[name="name"]').value.length).toBeGreaterThan(0);

    const permissionDialog = PermissionFormDialog({ onSubmit: () => {} });
    permissionDialog.open({
      node: { id: 7, name: '成员管理', code: 'system:member', type: 'menu' }
    });
    const permissionForm = permissionDialog.renderDom();
    expect(permissionForm.querySelector('input[name="code"]').value).toBe('system:member');

    const dictState = new DictsPageState();
    await dictState.loadTypes();
    const dictDialog = DictEditorDialog({ state: dictState, onSubmit: () => {} });
    dictDialog.open(dictState.types.value[0]);
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 250));
    const dictElement = dictDialog.renderDom();
    expect(dictElement.querySelector('input[name="code"]').value.length).toBeGreaterThan(0);
    expect(dictElement.textContent).toContain('共');

    const itemDialog = DictItemFormDialog({ onSubmit: () => {} });
    itemDialog.open({ id: 9, label: '启用', value: '1', sort: 1, status: 'active' });
    const itemForm = itemDialog.renderDom();
    expect(itemForm.querySelector('input[name="label"]').value).toBe('启用');
  });
});
