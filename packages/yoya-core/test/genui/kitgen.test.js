import { join } from 'node:path';
import prettier from 'prettier';
import { describe, expect, it } from 'vitest';
import { GenUI } from '../../src/genui/index.js';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import {
  extractGenuiDoc,
  extractGenuiWiring,
  extractProps,
  generateKit,
  writeKit
} from '../../src/genui/kitgen/index.js';

const fixtureRoot = join(process.cwd(), 'packages', 'yoya-core', 'test', 'fixtures', 'kitgen-lib');

const config = {
  src: join(fixtureRoot, 'src'),
  out: join(fixtureRoot, 'genui-kit.json'),
  namespace: 'fixture/kitgen-lib',
  pkg: join(fixtureRoot, 'package.json'),
  categories: { basic: 'basic', skipme: null },
  elements: {
    html: {
      module: './elements.js',
      blocked: ['script', 'iframe', 'createHtmlFactories']
    },
    svg: false
  }
};

describe('kitgen 通用生成器', () => {
  it('从 JSDoc @genui 标签提取文档（列表按中文分号切）', () => {
    const source = `/**
 * @genui 问候卡片
 * @genui.contract greeting: 文本；name: 文本
 * @genui.use 早间问候；新人引导
 * @genui.notFor 深夜模式
 * @genui.pitfall 名字为空时只显示问候
 * @genui.example {"type":"vGreeter"}
 * @genui.scene 问候, 新人引导
 * @genui.layer l3
 * @genui.props {"greeting":"问候语","name":"名字"}
 * @genui.live name；score
 * @genui.pairs vBadge（角标）, vAvatar（头像）
 * @genui.state 名字由外部持有，问候语是组件内默认值
 */
export const vGreeter = createComponentShortcut(VGreeter);`;

    expect(extractGenuiDoc(source, source.indexOf('export const'))).toEqual({
      summary: '问候卡片',
      dataContract: 'greeting: 文本；name: 文本',
      whenToUse: ['早间问候', '新人引导'],
      notFor: ['深夜模式'],
      pitfalls: ['名字为空时只显示问候'],
      example: { type: 'vGreeter' },
      // 选型面：场景（检索权重最高）与层（genui_catalog 的硬过滤主键），L 小写也认、归一成大写
      scenes: ['问候', '新人引导'],
      layer: 'L3',
      // 契约面：签名叫不出名字的库靠它写说明；活绑定面：声明即"这几位是活绑定位"
      props: { greeting: '问候语', name: '名字' },
      liveProps: ['name', 'score'],
      // 逻辑/组合面：选完还要配谁、状态归谁
      pairs: ['vBadge（角标）', 'vAvatar（头像）'],
      state: '名字由外部持有，问候语是组件内默认值'
    });
  });

  it('选型面标签写错要当场报（层是硬过滤主键，静默写错 = 从切片里消失）', () => {
    const readDoc = (line) => {
      const source = `/**\n * @genui 组件\n * ${line}\n */\nexport const vX = VX;`;
      return () => extractGenuiDoc(source, source.indexOf('export const'));
    };

    expect(readDoc('@genui.layer L9')).toThrow(/L1–L7/);
    expect(readDoc('@genui.props not-json')).toThrow(/合法 JSON/);
    expect(readDoc('@genui.props ["a"]')).toThrow(/JSON 对象/);
  });

  it('体积预算：写成小作文就当场报（防"标签多 → 上下文爆"）', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kitgen-budget-'));
    const src = join(dir, 'src', 'basic');
    const long = '很'.repeat(120);

    await mkdir(src, { recursive: true });
    await writeFile(
      join(src, 'fat.js'),
      `/**
 * @genui ${long}
 * @genui.pitfall ${long}
 * @genui.props {"value":"${long}"}
 */
export function VFat() {}
export const vFat = createComponentShortcut(VFat);\n`
    );
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'fixture/fat', version: '1.0.0' }));

    const configFor = (budgets) => ({
      src: join(dir, 'src'),
      out: join(dir, 'genui-kit.json'),
      namespace: 'fixture/fat',
      pkg: join(dir, 'package.json'),
      categories: { basic: 'basic' },
      elements: { html: false, svg: false },
      ...(budgets ? { budgets } : {})
    });

    await expect(generateKit(configFor(), { resolveFrom: dir })).rejects.toThrow(/超预算[\s\S]*summary/);
    // 库可以按需放宽
    const relaxed = await generateKit(
      configFor({ summary: 200, pitfalls: { count: 6, item: 200 }, props: { count: 24, value: 200 } }),
      { resolveFrom: dir }
    );

    expect(relaxed.components.find((component) => component.name === 'vFat')).toBeTruthy();

    await rm(dir, { recursive: true, force: true });
  });

  it('从 PascalCase 工厂签名解构里抽 props（rest 与默认值剔除）', () => {
    const props = extractProps(
      "export function VGreeter({ greeting = '你好', name, ...rest }) {}",
      'VGreeter'
    );

    expect(props).toEqual({ greeting: '', name: '' });
  });

  it('按 config 扫描工厂：文档、props、needsDocs、目录过滤、测试文件排除', async () => {
    const manifest = await generateKit(config, { resolveFrom: fixtureRoot });
    const greeter = manifest.components.find((c) => c.name === 'vGreeter');
    const plain = manifest.components.find((c) => c.name === 'vPlain');

    expect(greeter).toMatchObject({
      category: 'basic',
      dataContract: 'greeting: 文本；name: 文本',
      layer: 'L3',
      liveProps: ['name', 'score'],
      needsDocs: false,
      pairs: ['vBadge（角标）', 'vAvatar（头像）'],
      state: '名字由外部持有（写回页面数据域），问候语是组件内默认值',
      // props 合并：签名给名字、JSDoc 给说明（同名时说明优先，空串不覆盖文案）
      props: {
        change: '',
        children: '',
        greeting: '问候语（缺省：你好）',
        name: '名字（必填）',
        score: ''
      },
      scenes: ['问候卡片', '新人引导'],
      summary: '问候卡片',
      whenToUse: ['早间问候', '新人引导']
    });
    expect(plain).toMatchObject({
      category: 'basic',
      needsDocs: true,
      props: { value: '', disabled: '' },
      summary: ''
    });
    // skipme 目录（分类 null）与 *.test.js 都不进清单
    expect(manifest.components.map((c) => c.name)).toEqual(['vGreeter', 'vPlain']);
  });

  it('manifest 元信息与元素面：版本钉、安全黑名单、可关闭 SVG', async () => {
    const manifest = await generateKit(config, { resolveFrom: fixtureRoot });

    expect(manifest.$schema).toBe('genui-kit/1');
    expect(manifest.namespace).toBe('fixture/kitgen-lib');
    expect(manifest.version).toBe('1.2.3');
    expect(manifest.runtime).toEqual({ genui: '>=0.2 <0.3' });
    // 切片纪律写进 manifest：thin = 每步都调的小片，full = 选定一个组件后按需取
    expect(manifest.tiers.thin).toContain('summary');
    expect(manifest.tiers.thin).not.toContain('example');
    expect(manifest.tiers.full).toContain('example');
    // script / iframe 被黑名单拦下，普通标签在
    expect(manifest.htmlElements).toContain('div');
    expect(manifest.htmlElements).not.toContain('script');
    expect(manifest.htmlElements).not.toContain('iframe');
    // elements.svg: false → 不派生
    expect(manifest.svgFactories).toEqual([]);
  });

  it('缺 namespace 直接报错（防呆）', () => {
    expect(() => generateKit({ src: 'src' })).rejects.toThrow('namespace');
  });
});

describe('kitgen 插件生成', () => {
  const pluginConfig = {
    ...config,
    plugin: {
      out: join(fixtureRoot, 'genui-plugin.js'),
      runtimeImport: '@yoyaflow/yoya-core/genui',
      factoryImport: './ui.js'
    }
  };

  it('CRLF 源码里的运行时标签也能解析', () => {
    const source = [
      '/**',
      ' * @genui.expose value command=value',
      ' */',
      'export const vProbe = createComponentShortcut(VProbe);'
    ].join('\r\n');

    expect(extractGenuiWiring(source, source.indexOf('export const'))).toEqual({
      events: {},
      expose: { value: 'value' },
      props: {}
    });
  });

  it('运行时标签解析成接线表（content / text / prop / event）', () => {
    const source = `/**
 * @genui.content children
 * @genui.text greeting
 * @genui.prop name to=attr:data-name
 * @genui.prop score to=command:score read=command:getScore live=false
 * @genui.event click dom
 * @genui.event change callback payload=0
 */
export const vGreeter = createComponentShortcut(VGreeter);`;

    expect(extractGenuiWiring(source, source.indexOf('export const'))).toEqual({
      childrenProp: 'children',
      events: {
        change: { channel: 'callback', prop: 'change', payload: '0' },
        click: { channel: 'dom', event: 'click' }
      },
      props: {
        name: { to: 'attr:data-name' },
        score: { live: false, read: 'command:getScore', to: 'command:score' }
      },
      textProp: 'greeting'
    });
  });

  it('双产物分离：接线进插件、不进 manifest；字段序确定', async () => {
    const result = await writeKit(pluginConfig, { resolveFrom: fixtureRoot });
    const pluginSource = result.outputs.find((o) => o.out.endsWith('genui-plugin.js'));
    const text = await readFile(pluginSource.out, 'utf8');

    // manifest 只给模型，不掺接线细节
    expect(result.manifest.components[0]).not.toHaveProperty('childrenProp');
    expect(result.manifest.components[0]).not.toHaveProperty('events');
    // 插件：createPlugin + 工厂 import + 接线序列化
    expect(text).toContain("import { createPlugin } from '@yoyaflow/yoya-core/genui';");
    expect(text).toContain("} from './ui.js';");
    expect(text).toContain('factory: vGreeter,');
    expect(text).toContain("childrenProp: 'children',");
    expect(text).toContain("to: 'attr:data-name'");
    expect(text).toContain("channel: 'dom'");
    expect(text).toContain("channel: 'callback'");
    expect(text).toContain('createPlugin({');
    expect(text).toContain("id: 'fixture/kitgen-lib@1.2.3'");
  });

  it('生成物本身就是 Prettier 规范形（LF / 无二次格式化差异）', async () => {
    await writeKit(pluginConfig, { resolveFrom: fixtureRoot });
    const pluginSource = await readFile(join(fixtureRoot, 'genui-plugin.js'), 'utf8');
    const manifestSource = await readFile(join(fixtureRoot, 'genui-kit.json'), 'utf8');
    const options = {
      printWidth: 100,
      semi: true,
      singleQuote: true,
      trailingComma: 'none',
      endOfLine: 'lf'
    };

    expect(pluginSource).toBe(await prettier.format(pluginSource, { ...options, parser: 'babel' }));
    expect(manifestSource).toBe(
      await prettier.format(manifestSource, { ...options, parser: 'json' })
    );
    expect(pluginSource).not.toContain('\r');
    expect(manifestSource).not.toContain('\r');
  });

  it('确定性：连续两次生成逐字节一致（--check 门禁的前提）', async () => {
    await writeKit(pluginConfig, { resolveFrom: fixtureRoot });
    const first = await readFile(join(fixtureRoot, 'genui-plugin.js'), 'utf8');
    await writeKit(pluginConfig, { resolveFrom: fixtureRoot });
    const second = await readFile(join(fixtureRoot, 'genui-plugin.js'), 'utf8');

    expect(second).toBe(first);

    const checked = await writeKit(pluginConfig, { resolveFrom: fixtureRoot, check: true });

    expect(checked.changed).toBe(false);
    expect(checked.outputs.every((output) => output.changed === false)).toBe(true);
  });

  it('端到端：生成插件 → GenUI.use → 渲染到 DOM', async () => {
    await writeKit(pluginConfig, { resolveFrom: fixtureRoot });
    const pluginPath = '../fixtures/kitgen-lib/genui-plugin.js';
    const { plugin } = await import(/* @vite-ignore */ pluginPath);
    GenUI.use(plugin);

    const target = document.createElement('div');

    document.body.appendChild(target);
    GenUI.fromJson({
      root: {
        type: 'fixture/kitgen-lib#vGreeter',
        props: { greeting: '早上好', name: '小明' },
        children: [{ type: 'p', text: '子块' }]
      }
    }).bindTo(target);

    const host = target.querySelector('[vn="VGreeter"]');

    expect(host).not.toBeNull();
    expect(host.getAttribute('data-greeting')).toBe('早上好');
    expect(host.getAttribute('data-name')).toBe('小明');
    expect(host.querySelector('p').textContent).toBe('子块');
  });

  it('未配置 factoryImport 时不生成插件（只出 manifest）', async () => {
    const result = await writeKit(config, { resolveFrom: fixtureRoot });

    expect(result.outputs).toHaveLength(1);
    expect(result.summary.pluginGenerated).toBe(false);
  });

  it('长字符串字段保持字符串——不按列宽拆成字符对象（agent 读的是这份目录）', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'kitgen-long-'));
    const src = join(dir, 'src', 'basic');
    const contract =
      'props.value: 传句柄（$bind / @:/path）→ 输入即写回数据；传普通值 = 只读快照；这行足够长，超过单行宽度限制';

    await mkdir(src, { recursive: true });
    await writeFile(
      join(src, 'long.js'),
      `/**
 * @genui 长文案组件
 * @genui.contract ${contract}
 */
export function VLong() {}
export const vLong = createComponentShortcut(VLong);\n`
    );
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'fixture/long', version: '1.0.0' })
    );

    const out = join(dir, 'genui-kit.json');

    await writeKit(
      {
        src: join(dir, 'src'),
        out,
        namespace: 'fixture/long',
        pkg: join(dir, 'package.json'),
        categories: { basic: 'basic' },
        elements: { html: false, svg: false }
      },
      { resolveFrom: dir }
    );

    const text = await readFile(out, 'utf8');
    const manifest = JSON.parse(text);

    expect(manifest.components.find((component) => component.name === 'vLong').dataContract).toBe(
      contract
    );
    expect(text).not.toContain('"0": "');

    await rm(dir, { recursive: true, force: true });
  });
});
