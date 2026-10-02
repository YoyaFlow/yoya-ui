/**
 * genui-project 模板的门禁：脚手架产出的工程**自洽**（页面声明的每条取数接线都有逻辑、逻辑指的源都在源清单里）、
 * 每个页面声明**过 yoya-core 的校验**、示例页在 jsdom 里**真能渲染**（没有未注册组件）。
 *
 * 这里**不需要宿主**（genui-mcp）：只用 yoya-core + yoya-ui 就能验「形状 + 声明 + 渲染」这三层；
 * 地址（hosts）与数据面是宿主的事，不进这个仓的断言。
 *
 * 模板自己的目录不参与仓库 vitest（`packages/create-yoya-ui/templates/**` 被排除），
 * 所以这几条必须在仓库侧再跑一遍；模板改动时这里会同步红。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createCustodianRegistry,
  createGenUI,
  normalizeSugarDeep,
  validateSchema
} from '@yoyaflow/yoya-core/genui';
import { plugin as yoyaUIPlugin } from '@yoyaflow/yoya-ui/genui-plugin';

const ROOT = resolve(import.meta.dirname, '../..');
const TEMPLATE = join(ROOT, 'create-yoya-ui/templates/genui-project');
const SCAFFOLDER = join(ROOT, 'create-yoya-ui/bin/create-yoya-ui.js');
const read = (relative) => readFileSync(join(TEMPLATE, relative), 'utf8');

/** UI 工程与页面都**扫出来**（新增 UI / 页面自动进断言，不手抄清单）。 */
const UIS = readdirSync(join(TEMPLATE, 'apps')).filter((name) =>
  existsSync(join(TEMPLATE, 'apps', name, 'package.json'))
);
const PAGES = UIS.flatMap((ui) =>
  readdirSync(join(TEMPLATE, 'apps', ui, 'src', 'pages'))
    .filter((name) => name.endsWith('.genui.json'))
    .map((name) => ({ ui, name, schema: JSON.parse(read(`apps/${ui}/src/pages/${name}`)) }))
);
const SOURCES = JSON.parse(read('resources/sources.json')).sources;
const QUERY_KEYS = readdirSync(join(TEMPLATE, 'resources/queries'))
  .filter((name) => name.endsWith('.sql'))
  .map((name) => name.slice(0, -'.sql'.length));
const queryMeta = (key) => JSON.parse(read(`resources/queries/${key}.json`));

/** UI 的取数转发表（`apps/<ui>/src/actions.js` 的 ROUTES）：页面里的 `@actions:/<key>` 必须都在这张表里。 */
const routesCache = new Map();
const routesOf = async (ui) => {
  if (!routesCache.has(ui)) {
    routesCache.set(
      ui,
      (await import(pathToFileURL(join(TEMPLATE, 'apps', ui, 'src', 'actions.js')).href)).ROUTES
    );
  }

  return routesCache.get(ui);
};

/**
 * 宿主侧的保管者表（**地址由环境给**）：这里用假地址，只为让页面能建起来 —— 断言的是
 * 「页面 → 接线表 → 源」这条链对不对，不是真的取数（真取数在宿主的门禁里）。
 */
const custodianStub = (routes) =>
  createCustodianRegistry({
    actions: Object.fromEntries(
      Object.entries(routes).map(([key, route]) => [
        key,
        { type: 'http', method: route.method, url: `http://127.0.0.1:0${route.path}`, key }
      ])
    )
  });

/** hermetic fetch：页面里的 sources 会真的发请求，这里给一个空信封（不断网、不超时）。 */
const fetchStub = async () => ({ ok: true, json: async () => ({ rows: [], columns: [] }) });

/** 一个页面用到的取数接线（`@actions:/<key>`）：`meta.queries` 与 `sources[].action` 两处都收。 */
const actionsOf = (schema) => {
  const keys = new Set(schema.meta?.queries ?? []);
  for (const entry of Object.values(schema.sources ?? {})) {
    const matched = /^@actions:\/(.+)$/.exec(String(entry?.action ?? ''));
    if (matched) keys.add(matched[1]);
  }
  return [...keys];
};

describe('create-yoya-ui genui-project template', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'yoya-genui-project-'));
  const generated = join(workdir, 'my-app');

  beforeAll(() => {
    execFileSync(process.execPath, [SCAFFOLDER, 'my-app', '--template', 'genui-project'], {
      cwd: workdir,
      stdio: 'pipe'
    });
  });

  afterAll(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('generates a project-shaped app（项目即目录：资产层 + N 个 UI 工程）', () => {
    const pkg = JSON.parse(readFileSync(join(generated, 'package.json'), 'utf8'));

    expect(pkg.name).toBe('my-app');
    expect(pkg.genui?.shape).toBe('v0');
    expect(pkg.workspaces).toEqual(expect.arrayContaining(['kits/*/*', 'apps/*']));
    expect(pkg.private).toBe(true);

    for (const relative of [
      '.gitignore',
      'README.md',
      '.genui/README.md',
      'resources/sources.json',
      'resources/orders.json',
      'resources/queries/orders_page.sql',
      'resources/queries/orders_page.json',
      'data/orders.csv',
      'kits/README.md'
    ]) {
      expect(existsSync(join(generated, relative)), `${relative} 缺失`).toBe(true);
    }

    // 每个 UI 都有自己的四件套（能在项目里单独起）
    expect(UIS.length).toBeGreaterThanOrEqual(2);
    for (const ui of UIS) {
      for (const relative of [
        'package.json',
        'vite.config.js',
        'index.html',
        'src/main.js',
        'src/actions.js',
        'genui.export.json'
      ]) {
        expect(existsSync(join(generated, 'apps', ui, relative)), `${ui}/${relative} 缺失`).toBe(
          true
        );
      }
    }

    // 基础库走 dependencies —— **不是 kit**（判据：基础库不进 kits/）
    const appPkg = JSON.parse(readFileSync(join(generated, 'apps/main/package.json'), 'utf8'));
    expect(Object.keys(appPkg.dependencies)).toEqual(
      expect.arrayContaining(['@yoyaflow/yoya-ui', '@yoyaflow/yoya-core'])
    );
    expect(Object.values(appPkg.dependencies).some((spec) => String(spec).includes('kits/'))).toBe(
      false
    );
  });

  it('keeps the example self-consistent（页面接线 → 逻辑 → 源，三层都对得上）', () => {
    expect(PAGES.length).toBeGreaterThan(0);
    expect(QUERY_KEYS.length).toBeGreaterThan(0);

    for (const { ui, name, schema } of PAGES) {
      for (const key of actionsOf(schema)) {
        expect(
          QUERY_KEYS,
          `${ui}/${name} 用了 ${key} 但没有 resources/queries/${key}.sql`
        ).toContain(key);
      }
    }

    for (const key of QUERY_KEYS) {
      const meta = queryMeta(key);

      expect(
        SOURCES[meta.source],
        `queries/${key}.json 指向的源 "${meta.source}" 不在 sources.json 里`
      ).toBeTruthy();
      expect(
        Object.keys(meta.params ?? {}).length,
        `queries/${key}.json 没写参数契约`
      ).toBeGreaterThan(0);
    }

    // 多 UI 不许互相引用（要共享走项目级 resources/ · templates/ · components/）
    for (const ui of UIS) {
      for (const other of UIS) {
        if (other === ui) continue;
        const text = read(`apps/${ui}/src/main.js`) + read(`apps/${ui}/src/actions.js`);

        expect(text.includes(`/apps/${other}/`), `${ui} 引用了别的 UI（${other}）`).toBe(false);
      }
    }
  });

  it('passes yoya-genui validation for every page', async () => {
    for (const { ui, name, schema } of PAGES) {
      const routes = await routesOf(ui);
      // 顺序与宿主一致：先糖归一（`@:/x` → `$bind`）再校验 —— 直接拿原文校验会把糖当成非法接线
      const verdict = validateSchema(normalizeSugarDeep(schema), {
        custodians: custodianStub(routes)
      });

      expect(
        verdict.errors ?? [],
        `${ui}/${name} 校验报错：${JSON.stringify(verdict.errors)}`
      ).toEqual([]);
    }
  });

  it('renders every example page without unknown components', async () => {
    const genui = createGenUI();

    genui.use(yoyaUIPlugin);

    for (const { ui, name, schema } of PAGES) {
      const host = document.createElement('div');

      document.body.append(host);
      genui
        .fromJson(schema, {
          custodians: custodianStub(await routesOf(ui)),
          fetch: fetchStub,
          onWarn: () => {}
        })
        .bindTo(host);

      expect(host.textContent, `${ui}/${name} 没渲染出内容`).not.toBe('');
      // 未注册的组件会渲染成占位块：有它就说明声明的组件名不在能力面里
      expect(
        host.querySelector('[data-genui-unknown]'),
        `${ui}/${name} 里有未注册的组件`
      ).toBeNull();
      host.remove();
    }
  });

  it('keeps every page action inside the UI own route table（页面 ↔ 取数转发对得上）', async () => {
    for (const ui of UIS) {
      const routes = await routesOf(ui);
      const keys = new Set(Object.keys(routes));

      for (const page of PAGES.filter((item) => item.ui === ui)) {
        for (const action of actionsOf(page.schema)) {
          expect(
            keys,
            `${ui}/${page.name} 用了 ${action}，但 src/actions.js 的 ROUTES 里没有`
          ).toContain(action);
        }
      }
    }
  });
});
