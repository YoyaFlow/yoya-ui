import { join } from 'node:path';
import prettier from 'prettier';
import { describe, expect, it } from 'vitest';
import { GenUI } from '../../src/genui/index.js';
import { readFile } from 'node:fs/promises';
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
 */
export const vGreeter = createComponentShortcut(VGreeter);`;

    expect(extractGenuiDoc(source, source.indexOf('export const'))).toEqual({
      summary: '问候卡片',
      dataContract: 'greeting: 文本；name: 文本',
      whenToUse: ['早间问候', '新人引导'],
      notFor: ['深夜模式'],
      pitfalls: ['名字为空时只显示问候'],
      example: { type: 'vGreeter' }
    });
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
      needsDocs: false,
      props: { change: '', children: '', greeting: '', name: '', score: '' },
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
});
