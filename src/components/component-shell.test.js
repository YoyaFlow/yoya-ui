/**
 * 组件外壳（`createComponentShell`）的契约测试。
 *
 * 外壳把"不导出的节点类型"包成 vNode 组件，最容易踩的坑是**命令面漏项**：
 * 节点类型上的公开方法（尤其是构造函数里用 `booleanMethod` 挂的 `disabled()` / `error()`）
 * 没接出来时，`vTimer().disabled()` 会静默不存在——运行期不报错，行为直接少一块。
 * 这里按"节点类型上的公开方法"逐条探测，迁移后自动纳入覆盖（还没迁的类组件会被跳过）。
 */
import { describe, expect, it } from 'vitest';
import { ComponentNode, HtmlElementNode, vRadios, viewRootOf } from '../index.js';
import * as core from '../yoya.core.js';
import * as ui from '../yoya.ui.js';

const api = { ...core, ...ui };

/** 与外壳同一口径：节点类型上有、组件节点上没有的公开方法名。 */
function publicMethodNames(element) {
  const names = new Set();
  const collect = (source) => {
    if (!source) {
      return;
    }

    Object.getOwnPropertyNames(source).forEach((name) => {
      if (name === 'constructor' || name.startsWith('_')) {
        return;
      }
      if (name in ComponentNode.prototype || typeof element[name] !== 'function') {
        return;
      }
      names.add(name);
    });
  };

  collect(element);
  let prototype = Object.getPrototypeOf(element);
  while (prototype && prototype !== Object.prototype) {
    collect(prototype);
    prototype = Object.getPrototypeOf(prototype);
  }

  return [...names].sort();
}

const SHELL_FACTORIES = {
  vCheckbox: (value) => value.vCheckbox(),
  vCheckboxes: (value) => value.vCheckboxes(),
  vDialog: (value) => value.vDialog(),
  vField: (value) => value.vField(),
  vForm: (value) => value.vForm(),
  vFormItem: (value) => value.vFormItem(),
  vInput: (value) => value.vInput(),
  vMenu: (value) => value.vMenu(),
  vRadios: (value) => value.vRadios(),
  vRadio: (value) => value.vRadio(),
  vScroll: (value) => value.vScroll(),
  vSelect: (value) => value.vSelect(),
  vSwitch: (value) => value.vSwitch(),
  vTable: (value) => value.vTable(),
  vTabs: (value) => value.vTabs(),
  vTextarea: (value) => value.vTextarea(),
  vTimer: (value) => value.vTimer(),
  vTimerRange: (value) => value.vTimerRange(),
  vTooltip: (value) => value.vTooltip()
};

describe('component shell', () => {
  it('exposes every public method of the node type on the component handle', () => {
    const missing = {};

    Object.entries(SHELL_FACTORIES).forEach(([name, create]) => {
      const component = create(api);
      if (!(component instanceof ComponentNode)) {
        return; // 还没迁到外壳的类组件：跳过
      }

      const root = viewRootOf(component);
      expect(root, `${name} 的视图根应存在`).toBeInstanceOf(HtmlElementNode);

      const absent = publicMethodNames(root).filter(
        (method) => typeof component[method] !== 'function'
      );
      if (absent.length > 0) {
        missing[name] = absent;
      }
    });

    expect(missing, '外壳漏接了节点类型上的公开方法').toEqual({});
  });

  it('hands the component handle (not the internal node type) to callbacks', () => {
    let captured = null;
    const radios = vRadios({
      change: (next, handle) => {
        captured = handle;
        expect(next).toBe('prod');
      },
      name: 'env',
      options: [
        { label: '开发', value: 'dev' },
        { label: '生产', value: 'prod' }
      ],
      value: 'dev'
    });
    const element = radios.renderDom();
    const input = element.querySelectorAll('.yoya-vradio input')[1];

    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(captured).toBe(radios);
  });
});
