/**
 * kit 的自检：清单同真 / 插件装得上 / 示例渲染得出来 / 活值真的活着。
 *
 * 这四条是 kit 的最小发布门槛 —— 换成你自己的组件后，这四条仍然要绿。
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createGenUI } from '@yoyaflow/yoya-core/genui';
import { KIT_NAMESPACE, kitComponents, kitPlugin } from '../src/index.js';

const root = resolve(import.meta.dirname, '..');
const kit = JSON.parse(readFileSync(join(root, 'kit.json'), 'utf8'));

/** 组件元数据真相源：`components/<族>/component.json` */
function declaredComponents() {
  const componentsDir = join(root, 'components');

  return readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) =>
      JSON.parse(readFileSync(join(componentsDir, entry.name, 'component.json'), 'utf8'))
    )
    .flatMap((declared) => (Array.isArray(declared.components) ? declared.components : [declared]));
}

/** 示例：`components/<族>/examples/*.json` */
function examples() {
  const componentsDir = join(root, 'components');

  return readdirSync(componentsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dir = join(componentsDir, entry.name, 'examples');

      return readdirSync(dir, { withFileTypes: true })
        .filter((file) => file.name.endsWith('.json'))
        .map((file) => ({
          name: `${entry.name}/${file.name}`,
          schema: JSON.parse(readFileSync(join(dir, file.name), 'utf8'))
        }));
    });
}

/** 渲染一份 schema，返回容器（渲染期警告按 console.warn 走，不拦）。 */
function mount(genui, schema) {
  const host = document.createElement('div');

  document.body.append(host);

  const surface = genui.fromJson(schema, { onWarn: () => {} });

  surface.bindTo(host);
  return { host, surface };
}

/**
 * 组件短名 → 渲染后能证明"它真的画出来了"的选择器。
 *
 * 默认按 `vn` 找（组件根自己写 `vn: 'XxxKit'`）；包 yoya-ui 组件的组件把这里改成**被包者**的
 * `vn`（如 `BadgeKit` → `[vn~='VBadge']`）——新组件没登记也能跑，登记了断言更贴实现。
 */
const ROOT_SELECTOR = {
  PanelKit: "[vn='PanelKit']",
  MetricKit: "[vn='MetricKit']",
  BadgeKit: "[vn~='VBadge']"
};

/** 一份 schema 里用到的本 kit 组件短名。 */
function usedComponents(node, found = new Set()) {
  if (!node || typeof node !== 'object') return found;

  for (const [key, value] of Object.entries(node)) {
    if (key === 'type' && typeof value === 'string' && value.startsWith(`${KIT_NAMESPACE}#`)) {
      found.add(value.split('#').pop());
    }

    usedComponents(value, found);
  }

  return found;
}

describe('kit.json 清单', () => {
  it('与 components/*/component.json 同真', () => {
    const declared = declaredComponents()
      .map((component) => `${kit.namespace}#${component.shortName}`)
      .sort();

    expect(kit.components.map((component) => component.name).sort()).toEqual(declared);
    expect(kit.version).toBe(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version);
  });

  it('每个组件都写全了给模型选型的字段', () => {
    for (const component of kit.components) {
      expect(component.summary, `${component.name} 缺 summary`).toBeTruthy();
      expect(component.dataContract, `${component.name} 缺 dataContract`).toBeTruthy();
      expect(
        Object.keys(component.props).length,
        `${component.name} 没写 props 契约`
      ).toBeGreaterThan(0);
      expect(component.entry, `${component.name} 缺 entry`).toBeTruthy();
      expect(component.category, `${component.name} 缺 category`).toBeTruthy();
    }
  });
});

describe('插件装载', () => {
  it('一个 use() 把整族组件装进能力面', () => {
    const genui = createGenUI();

    genui.use(kitPlugin);

    for (const name of Object.keys(kitComponents)) {
      // 名字要能按 `<namespace>#<短名>` 解析出来（宿主与 schema 用的就是这个写法）
      expect(
        genui.registry.resolve(`${KIT_NAMESPACE}#${name}`),
        `${name} 没装进能力面`
      ).not.toBeNull();
    }

    expect(genui.libraries().map((record) => record.namespace)).toContain(KIT_NAMESPACE);
  });
});

describe('示例渲染', () => {
  it('每份 examples/*.json 都能渲染出内容', () => {
    const all = examples();

    expect(all.length).toBeGreaterThan(0);

    for (const { name, schema } of all) {
      const genui = createGenUI();

      genui.use(kitPlugin);

      const { host } = mount(genui, schema);

      expect(host.textContent, `${name} 没渲染出内容`).not.toBe('');
      // 未注册的组件会渲染成 data-genui-unknown 占位块 —— 有它就说明 type 拼错了
      expect(host.querySelector('[data-genui-unknown]'), `${name} 里有未注册的组件`).toBeNull();

      for (const shortName of usedComponents(schema)) {
        const selector = ROOT_SELECTOR[shortName] ?? `[vn~='${shortName}']`;

        expect(
          host.querySelector(selector),
          `${name} 里的 ${shortName} 没渲染成节点`
        ).not.toBeNull();
      }

      host.remove();
    }
  });

  it('活值：写数据模型即更新视图，不重建节点', () => {
    const genui = createGenUI();

    genui.use(kitPlugin);

    const live = examples().find((entry) => entry.schema.data);

    expect(live, '示例里应该有一份带 data 的活值例子').toBeTruthy();

    const rendered = mount(genui, live.schema);
    const valueNode = rendered.host.querySelector("[vn='MetricKit'] strong");

    expect(valueNode.textContent).toBe('128');

    rendered.surface.data.write('/metrics/orders', 999);

    expect(valueNode.textContent).toBe('999');
    // 同一个节点：活值是原地更新，不是重新渲染一棵新树
    expect(rendered.host.querySelector("[vn='MetricKit'] strong")).toBe(valueNode);
    rendered.host.remove();
  });
});
