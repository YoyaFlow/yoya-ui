/**
 * 波 0 拆分后的**导出面与工厂配对**守卫。
 *
 * `packages/yoya-ui/src/form/controls.js` 从单文件拆成 `controls/*.js` + barrel 之后，最大的风险是
 * "某个工厂指到了别的类"或"barrel 少导出一个名字"——这种错误在只用到少数控件的用例里是静默的。
 * 这里逐个走一遍：工厂产出配对的类实例、barrel 的导出面与拆分前一致。
 */
import { describe, expect, it } from 'vitest';
import { hasComponentIdentity } from '@yoyaflow/yoya-core/internal/core/node.js';
import * as barrel from '../controls.js';
import { ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { radioGroups } from './radio.js';

const PAIRS = [
  ['VInput', 'vInput'],
  ['VTextarea', 'vTextarea'],
  ['VTimer', 'vTimer'],
  ['VTimerRange', 'vTimerRange'],
  ['VSelect', 'vSelect'],
  ['VCheckbox', 'vCheckbox'],
  ['VSwitch', 'vSwitch'],
  ['VCheckboxes', 'vCheckboxes'],
  ['VRadio', 'vRadio'],
  ['VRadios', 'vRadios'],
  ['VField', 'vField'],
  ['VFormItem', 'vFormItem'],
  ['VForm', 'vForm']
];

describe('form controls 拆分后的导出面（波 0）', () => {
  it('13 个类 + 13 个工厂 + radioGroups 一个不少', () => {
    const expected = [...PAIRS.flat(), 'radioGroups'].sort();
    expect(Object.keys(barrel).sort()).toEqual(expected);
  });

  it('每个工厂产出的节点带对应组件身份（内部符号不会指错文件）', () => {
    PAIRS.forEach(([className, factoryName]) => {
      const factory = barrel[factoryName];
      expect(typeof factory, factoryName).toBe('function');
      // 身份 = 对象事实（vn）：组件不再依赖 defineComponentIdentity / Symbol.hasInstance
      // 多值身份（'VTimer VInput'）也命中：按空格拆名判定
      expect(hasComponentIdentity(factory(), className), factoryName).toBe(true);
    });
  });

  it('radioGroups 仍是电台注册表的同一份实例（vRadios 用完会清干净）', () => {
    expect(radioGroups).toBeInstanceOf(Map);
    const target = document.createElement('div');
    document.body.appendChild(target);

    const radios = barrel.vRadios({ name: 'surface-check', options: ['a', 'b'], value: 'a' });
    radios.bindTo(target);
    expect(radioGroups.has('surface-check')).toBe(true);

    radios.destroy();
    expect(radioGroups.has('surface-check')).toBe(false);
    target.remove();
  });

  it('表单采集链跨文件仍然接通（vForm + vFormItem + vInput）', () => {
    const value = ref('初始');
    const editor = barrel.vInput({ name: 'title', value });
    const form = barrel.vForm((formNode) => {
      formNode.vFormItem((item) => {
        item.label('名称').name('title');
        item.control(editor);
      });
    });

    const element = form.renderDom();
    expect(element.querySelector('input')).toBeTruthy();
    expect(form.values()).toEqual({ title: '初始' });

    editor.value('改过');
    expect(form.values()).toEqual({ title: '改过' });
    expect(form.validate()).toBe(true);
  });
});
