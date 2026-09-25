/**
 * 票 11：**随包发布的库内组件注册表**（`yoya-ui/compiled-registry`）。
 *
 * 验证四件事：产物口径（按形状扫 src、键按包名归口、只 import 包内入口）、包级键口径、
 * 插件默认加载（显式优先 / 找不到就照旧 / core 不同就不用）、端到端链接的 DOM 等价。
 */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import * as core from '@yoyaflow/yoya-core';
import * as svg from '@yoyaflow/yoya-core/svg';
import * as tools from '@yoyaflow/yoya-core/tools';

// 0.8 起的入口面：注册表/白名单需要 core + svg，静态助手在 tools
const coreNamespace = { ...core, ...svg, ...tools };
import { resolveComponentKey, packageNameOf } from './component-key.js';
import { componentUnits, loadPackagedRegistry, wireComponentModule } from './plugin.js';
import { buildPackagedRegistry } from '../../../scripts/compiler-registry.mjs';

const scratchRoot = join(process.cwd(), '.scratch');
mkdirSync(scratchRoot, { recursive: true });
const workDir = mkdtempSync(join(scratchRoot, 'tmp-packaged-registry-'));
afterAll(() => rmSync(workDir, { recursive: true, force: true }));

const runtimeUrl = pathToFileURL(
  join(process.cwd(), 'packages/yoya-core/src/core/compiler-runtime.js')
).href;
const distDir = join(workDir, 'dist');

// 与 `npm run build:registry` 同一份实现：先产出一次，后面几条用例共用
const built = await buildPackagedRegistry({ outDir: distDir, tmpDir: join(workDir, 'build') });

const LOCAL_ENTRIES = {
  '@yoyaflow/yoya-core': 'packages/yoya-core/src/index.js',
  '@yoyaflow/yoya-ui/ui': 'packages/yoya-ui/src/ui.js',
  '@yoyaflow/yoya-ui/data-display': 'packages/yoya-ui/src/data-display.js',
  '@yoyaflow/yoya-ui/compiler-runtime': 'packages/yoya-ui/src/compiler-runtime.js'
};

/**
 * 把注册表的**包内入口**换成本地源码入口：内容（键 / 片段 / 绑定 / 回落）一字不改，
 * 只换解析目标，让 node 也能 import 它（真打包器里由使用者的解析器负责这一步）。
 */
const localizeRegistry = () => {
  const source = readFileSync(built.files.module, 'utf8')
    // 只换 import 的 specifier（`coreSpecifier` 这类元数据保持原样：插件靠它判断口径）
    .replace(/(from\s+")(@yoyaflow\/yoya-ui\/[^"]+)(")/g, (whole, head, specifier, tail) => {
      const local = LOCAL_ENTRIES[specifier];
      return local ? `${head}${pathToFileURL(join(process.cwd(), local)).href}${tail}` : whole;
    });
  const path = join(workDir, 'localized-registry.js');
  writeFileSync(path, source, 'utf8');
  return path;
};

describe('随包注册表的产物口径（票 11）', () => {
  it('按形状扫出来的可编集合：键按包名归口、条目带 bind/render/hash/plan', async () => {
    const module = await import(pathToFileURL(localizeRegistry()).href);

    expect(built.candidates).toBeGreaterThan(built.compiled.length);
    expect(built.compiled.length).toBeGreaterThan(0);
    built.compiled.forEach((key) => {
      // 键按**拥有该组件的包**归口：图标集随 core 发布，其余组件随 yoya-ui
      const pkg = key.startsWith('@yoyaflow/yoya-core#')
        ? '@yoyaflow/yoya-core'
        : '@yoyaflow/yoya-ui';
      expect(key.startsWith(`${pkg}#`), key).toBe(true);
      expect(key.slice(`${pkg}#`.length).includes('/'), key).toBe(false);
    });
    expect(module.coreSpecifier).toBe('@yoyaflow/yoya-core');
    expect(module.runtimeSpecifier).toBe('@yoyaflow/yoya-ui/compiler-runtime');
    Object.values(module.components).forEach((entry) => {
      expect(typeof entry.bind).toBe('function');
      expect(typeof entry.render).toBe('function');
      expect(entry.hash).toMatch(/^[0-9a-f]{12}$/);
      expect(entry.plan.html.length).toBeGreaterThan(0);
    });
  });

  it('只 import 包内入口（不发 src 路径），纯数据里没有 ops', () => {
    const bundle = readFileSync(built.files.module, 'utf8');
    const imports = [...bundle.matchAll(/from\s+"([^"]+)"/g)].map((match) => match[1]);

    expect(imports.length).toBeGreaterThan(0);
    imports.forEach((specifier) => {
      expect(
        specifier.startsWith('@yoyaflow/yoya-ui/') || specifier.startsWith('@yoyaflow/yoya-core'),
        specifier
      ).toBe(true);
    });
    expect(bundle).not.toContain('packages/yoya-ui/src/compiler');

    const data = JSON.parse(readFileSync(built.files.data, 'utf8'));
    expect(data.coreSpecifier).toBe('@yoyaflow/yoya-core');
    const firstEntry = Object.values(data.components)[0];
    // 构建期数据：`ops` / `factory` 在这里（插件在 Node 里读），不进使用者的 bundle
    expect(Object.keys(firstEntry).sort()).toEqual([
      'export',
      'factory',
      'file',
      'hash',
      'ops',
      'plan'
    ]);
  });
});

describe('包级键口径', () => {
  it('包内任一入口 import 同一组件都命中同一条目', () => {
    const keyOf = (specifier) =>
      resolveComponentKey({ file: 'src/app/page.js', specifier, export: 'vCard' });

    expect([
      keyOf('@yoyaflow/yoya-ui'),
      keyOf('@yoyaflow/yoya-ui/ui'),
      keyOf('@yoyaflow/yoya-ui/data-display')
    ]).toEqual(['@yoyaflow/yoya-ui#vCard', '@yoyaflow/yoya-ui#vCard', '@yoyaflow/yoya-ui#vCard']);
    // 相对导入照旧按调用方目录解析（回归）
    // 相对导入照旧按**调用方目录**解析：`file` 是夹具路径（`src/app/card.js`），不是仓库布局
    expect(keyOf('./card.js')).toBe('src/app/card.js#vCard');
    expect(packageNameOf('@yoyaflow/yoya-ui/ui')).toBe('@yoyaflow/yoya-ui');
    expect(packageNameOf('./card.js')).toBeNull();
  });
});

describe('插件默认加载（票 11）', () => {
  const registryModule = {
    components: { '@yoyaflow/yoya-ui#vCard': { hash: 'x', plan: { html: '' } } },
    coreSpecifier: '@yoyaflow/yoya-core',
    runtimeSpecifier: '@yoyaflow/yoya-ui/compiler-runtime',
    registryVersion: 1
  };

  it('加载到就用它，并包成插件要的形状', async () => {
    const loaded = await loadPackagedRegistry({
      coreSpecifier: '@yoyaflow/yoya-core',
      importModule: async () => registryModule,
      readData: () => ({ components: { '@yoyaflow/yoya-ui#vCard': { ops: [], factory: 'div' } } })
    });

    expect(loaded.componentsSpecifier).toBe('@yoyaflow/yoya-ui/compiled-registry');
    expect(loaded.components.version).toBe(1);
    expect(loaded.components.runtime).toBe('@yoyaflow/yoya-ui/compiler-runtime');
    expect(Object.keys(loaded.components.components)).toEqual(['@yoyaflow/yoya-ui#vCard']);
    // 运行期的 bind/render 来自模块，构建期的 ops/factory 来自 JSON
    expect(loaded.components.components['@yoyaflow/yoya-ui#vCard'].factory).toBe('div');
  });

  it('缺构建期数据（JSON）就整体不用：半成品比回落更糟', async () => {
    const loaded = await loadPackagedRegistry({
      importModule: async () => registryModule,
      readData: () => null
    });

    expect(loaded).toBeNull();
  });

  it('找不到包内注册表就保持今天的行为（返回 null，不报错）', async () => {
    const loaded = await loadPackagedRegistry({
      importModule: async () => {
        throw new Error('ERR_MODULE_NOT_FOUND');
      }
    });

    expect(loaded).toBeNull();
  });

  it('调用方换了 core 入口就不用包内注册表（两份核心实例会错位）', async () => {
    const loaded = await loadPackagedRegistry({
      coreSpecifier: '/custom/yoya.core.js',
      importModule: async () => registryModule,
      readData: () => ({ components: { '@yoyaflow/yoya-ui#vCard': { ops: [], factory: 'div' } } })
    });

    expect(loaded).toBeNull();
  });
});

describe('端到端：业务源码链接库内组件', () => {
  // 叶子组件（图标，形态 A）：完整链接——片段嵌进调用方片段，调用点按包级键引用注册表条目。
  // （带内容的容器组件见下一条用例：内容内联不了就整体回落，不产半成品。）
  const source = [
    "import { div, vText } from '@yoyaflow/yoya-core';",
    "import { ArrowDownOutlined } from '@yoyaflow/yoya-core';",
    '',
    'export function Panel(props) {',
    '  return div((root) => {',
    "    root.className('panel');",
    '    root.child(ArrowDownOutlined());',
    '    root.child(vText(props.text));',
    '  });',
    '}',
    ''
  ].join('\n');

  it('经注册表链接后 DOM 与通用路径一致', async () => {
    const registryPath = localizeRegistry();
    const file = join(workDir, 'panel.js');
    writeFileSync(file, source, 'utf8');

    // 走**真实的加载路径**：模块（运行期 bind/render）+ 同目录 JSON（构建期 ops/factory）
    const loaded = await loadPackagedRegistry({
      specifier: pathToFileURL(registryPath).href,
      readData: () => JSON.parse(readFileSync(built.files.data, 'utf8'))
    });
    expect(loaded, '注册表没有加载到').not.toBeNull();

    const wired = wireComponentModule({
      source,
      targets: componentUnits(source, { core: coreNamespace, file }),
      core: coreNamespace,
      runtime: runtimeUrl,
      components: loaded.components,
      componentsSpecifier: loaded.componentsSpecifier
    });
    expect(wired, '没有编出产物').not.toBeNull();
    // 真的链接了库内组件：图标的片段嵌进了调用方片段，调用点按**包级键**引用注册表条目
    expect(wired.units[0].module).toContain('yoya-icon');
    // 图标随 core 发布，调用点也按 core 包名归口
    expect(wired.units[0].module).toContain('@yoyaflow/yoya-core#ArrowDownOutlined');
    expect(wired.units[0].module).toContain('bindComponent(');

    // 产物落盘（虚拟模块换成真路径）→ 真实 import
    const replacements = new Map();
    wired.units.forEach((unit, index) => {
      const path = join(workDir, `panel.unit${index}.js`);
      replacements.set(JSON.stringify(unit.virtual), JSON.stringify(pathToFileURL(path).href));
    });
    const rewrite = (text) => {
      let out = text;
      replacements.forEach((to, from) => {
        out = out.replaceAll(from, to);
      });
      return out;
    };
    wired.units.forEach((unit, index) => {
      writeFileSync(join(workDir, `panel.unit${index}.js`), rewrite(unit.module), 'utf8');
    });
    const wiredPath = join(workDir, 'panel.wired.js');
    writeFileSync(wiredPath, rewrite(wired.code), 'utf8');

    const generic = await import(pathToFileURL(file).href);
    const compiled = await import(pathToFileURL(wiredPath).href);
    const asElement = (product) =>
      typeof product.renderDom === 'function' ? product.renderDom() : product.render().renderDom();

    const genericEl = asElement(generic.Panel({ text: core.ref('正文') }));
    const compiledEl = asElement(compiled.Panel({ text: core.ref('正文') }));
    // 片段走框架的规范序列化（属性顺序 / 紧凑 style），通用路径按调用顺序 + CSSOM：
    // 语义必须一致，字节差异是已知同族（票 08），这里按属性排序后比对。
    const normalized = (element) =>
      element.outerHTML
        .replace(
          /style="([^"]*)"/g,
          (whole, value) => `style="${value.replace(/\s+/g, '').replace(/;$/, '')}"`
        )
        .replace(/(<[a-z0-9-]+)([^>]*)>/g, (whole, tag, attrs) => {
          const sorted = attrs
            .trim()
            .match(/(?:[^\s=]+="[^"]*")/g)
            ?.sort()
            .join(' ');
          return sorted ? `${tag} ${sorted}>` : `${tag}>`;
        });
    expect(normalized(compiledEl)).toBe(normalized(genericEl));
    expect(compiledEl.textContent).toContain('正文');
  });
});
