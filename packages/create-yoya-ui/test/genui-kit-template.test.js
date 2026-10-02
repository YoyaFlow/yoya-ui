/**
 * genui-kits 模板的门禁：脚手架真的产出 kit 项目、清单生成器真的能当 CI 用、
 * 模板里的示例真的能装进 GenUI 并渲染（含活值原地更新）。
 *
 * 模板自己的 `test/kit.test.js` 不参与仓库的 vitest（`templates/**` 被排除），
 * 所以这两块断言必须在仓库侧再跑一遍；模板改动时这里会同步红。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { KIT_NAMESPACE, kitComponents, kitPlugin } from '../templates/genui-kits/src/index.js';

const ROOT = resolve(import.meta.dirname, '../..');
const TEMPLATE = join(ROOT, 'create-yoya-ui/templates/genui-kits');
const SCAFFOLDER = join(ROOT, 'create-yoya-ui/bin/create-yoya-ui.js');
const read = (relative) => readFileSync(join(TEMPLATE, relative), 'utf8');

const kit = JSON.parse(read('kit.json'));
const EXAMPLES = readdirSync(join(TEMPLATE, 'components/demo-kit/examples'))
  .filter((name) => name.endsWith('.json'))
  .map((name) => ({
    name,
    schema: JSON.parse(read(`components/demo-kit/examples/${name}`))
  }));

function mount(schema) {
  const genui = createGenUI();

  genui.use(kitPlugin);

  const host = document.createElement('div');

  document.body.append(host);

  const surface = genui.fromJson(schema, { onWarn: () => {} });

  surface.bindTo(host);
  return { genui, host, surface };
}

describe('create-yoya-ui genui-kits template', () => {
  const workdir = mkdtempSync(join(tmpdir(), 'yoya-kit-scaffold-'));
  const generated = join(workdir, 'my-kit');

  beforeAll(() => {
    execFileSync(process.execPath, [SCAFFOLDER, 'my-kit', '--template', 'genui-kits'], {
      cwd: workdir,
      stdio: 'pipe'
    });
  });

  afterAll(() => {
    rmSync(workdir, { recursive: true, force: true });
  });

  it('generates a kit project from the template', () => {
    const pkg = JSON.parse(readFileSync(join(generated, 'package.json'), 'utf8'));

    expect(pkg.name).toBe('my-kit');
    expect(pkg.scripts.verify).toContain('kit:check');
    expect(existsSync(join(generated, 'kit.json'))).toBe(true);
    expect(existsSync(join(generated, 'components/demo-kit/impl.js'))).toBe(true);
    expect(existsSync(join(generated, 'playground/main.js'))).toBe(true);

    // 生成物是模板的副本：下面校验的就是新项目里那份代码
    expect(readFileSync(join(generated, 'kit.json'), 'utf8')).toBe(read('kit.json'));
    expect(readFileSync(join(generated, 'components/demo-kit/impl.js'), 'utf8')).toBe(
      read('components/demo-kit/impl.js')
    );
  });

  it('passes the kit:check gate without installing dependencies', () => {
    // 生成器是纯 Node：不需要 npm install 就能当 CI 门禁用
    execFileSync(process.execPath, ['scripts/generate-kit.mjs', '--check'], {
      cwd: generated,
      stdio: 'pipe'
    });
  });
});

describe('genui-kits template manifest', () => {
  it('expands every component into namespace#shortName', () => {
    const declared = JSON.parse(read('components/demo-kit/component.json')).components.map(
      (component) => `${kit.namespace}#${component.shortName}`
    );

    expect(kit.components.map((component) => component.name)).toEqual(declared);
    expect(kit.namespace).toBe(KIT_NAMESPACE);
    expect(kit.runtime).toEqual({ entry: './dist/yoya.kit.js', export: 'kitPlugin' });
    expect(kit.version).toBe(JSON.parse(read('package.json')).version);
  });

  it('keeps one component.json entry per plugin component', () => {
    expect(Object.keys(kitComponents).sort()).toEqual(
      kit.components.map((component) => component.name.split('#').pop()).sort()
    );
  });
});

describe('genui-kits template runtime', () => {
  it('registers the whole family through one plugin', () => {
    const genui = createGenUI();

    genui.use(kitPlugin);

    for (const name of Object.keys(kitComponents)) {
      // 宿主的写法就是 `<namespace>#<短名>`：这样断言才真的覆盖 schema 里的 type
      expect(
        genui.registry.resolve(`${KIT_NAMESPACE}#${name}`),
        `${name} 没装进能力面`
      ).not.toBeNull();
    }

    expect(genui.libraries().map((record) => record.namespace)).toContain(KIT_NAMESPACE);
  });

  it('renders every shipped example', () => {
    expect(EXAMPLES.length).toBeGreaterThan(0);

    for (const { name, schema } of EXAMPLES) {
      const { host } = mount(schema);

      expect(host.textContent, `${name} 没渲染出内容`).not.toBe('');
      expect(host.querySelector("[vn='PanelKit']"), `${name} 没渲染出 PanelKit`).not.toBeNull();
      // 未注册的组件会渲染成 data-genui-unknown 占位块：有它就说明清单与实现漂移了
      expect(host.querySelector('[data-genui-unknown]'), `${name} 里有未注册的组件`).toBeNull();
      expect(host.querySelector("[vn~='VBadge']"), `${name} 没渲染出 BadgeKit`).not.toBeNull();
      host.remove();
    }
  });

  it('keeps live props live: writing the data model updates the node in place', () => {
    const live = EXAMPLES.find((example) => example.schema.data);

    expect(live, '示例里应该有一份带 data 的活值例子').toBeTruthy();

    const { host, surface } = mount(live.schema);
    const valueNode = host.querySelector("[vn='MetricKit'] strong");

    expect(valueNode.textContent).toBe('128');

    surface.data.write('/metrics/orders', 999);

    expect(valueNode.textContent).toBe('999');
    expect(host.querySelector("[vn='MetricKit'] strong")).toBe(valueNode);
    host.remove();
  });
});
