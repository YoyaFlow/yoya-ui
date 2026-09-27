import { describe, expect, it } from 'vitest';
import {
  isReferenceString,
  normalizeSugarDeep,
  parseReference,
  referenceToBindExpr
} from '../../src/genui/protocol/references.js';
import { createGenUI } from '../../src/genui/index.js';

describe('引用文法解析', () => {
  it('数据域：绝对 / 相对 / 翻层 / 具名 / 保管者', () => {
    expect(parseReference('@:/order/price')).toEqual({
      custodian: null,
      domain: 'data',
      path: '/order/price'
    });
    expect(parseReference('@:price')).toEqual({ custodian: null, domain: 'data', path: 'price' });
    expect(parseReference('@:^price')).toEqual({ custodian: null, domain: 'data', path: '^price' });
    expect(parseReference('@item:/name')).toEqual({
      custodian: 'item',
      domain: 'data',
      path: '/name'
    });
    expect(parseReference('@i18n:/buttons/ok')).toEqual({
      custodian: 'i18n',
      domain: 'data',
      path: '/buttons/ok'
    });
    expect(parseReference('@data:/x')).toEqual({ custodian: 'data', domain: 'data', path: '/x' });
    expect(parseReference('@:$index')).toEqual({
      custodian: null,
      domain: 'data',
      path: '$index'
    });
    expect(parseReference('@item:/name')).toEqual({
      custodian: 'item',
      domain: 'data',
      path: '/name'
    });
  });

  it('组件域：指定 id / 最近组件', () => {
    expect(parseReference('#gauge:/value')).toEqual({
      custodian: 'gauge',
      domain: 'component',
      path: '/value'
    });
    expect(parseReference('#:/value')).toEqual({
      custodian: null,
      domain: 'component',
      path: '/value'
    });
  });

  it('非引用与转义', () => {
    expect(parseReference('普通文本')).toBeNull();
    expect(parseReference('user@host')).toBeNull();
    expect(parseReference('note: something')).toBeNull();
    expect(parseReference('@小明: 你好')).toBeNull();
    expect(parseReference('#tag: desc')).toBeNull(); // 路径带空格
    expect(parseReference('@@:/literal')).toBeNull(); // 转义 = 字面量
    expect(parseReference('##:/literal')).toBeNull();
    expect(isReferenceString('@:/a')).toBe(true);
    expect(isReferenceString('@@:/a')).toBe(false);
  });
});

describe('糖 → 规范形', () => {
  it('data 默认 → 纯 $bind；其他保管者带 $from；#id 静态展开；#:/ 最近标记', () => {
    expect(referenceToBindExpr('@:/order/price')).toEqual({ $bind: '/order/price' });
    expect(referenceToBindExpr('@:price')).toEqual({ $bind: 'price' });
    expect(referenceToBindExpr('@i18n:/buttons/ok')).toEqual({
      $bind: '/buttons/ok',
      $from: 'i18n'
    });
    expect(referenceToBindExpr('#gauge:/value')).toEqual({ $bind: '/@gauge/value' });
    expect(referenceToBindExpr('#:/value')).toEqual({ $bind: 'value', $from: '#nearest' });
    expect(referenceToBindExpr('@:^price')).toEqual({
      $bind: 'price',
      $from: '#parent:1'
    });
    expect(referenceToBindExpr('@:$key')).toEqual({ $bind: '$key', $from: '#row' });
    expect(referenceToBindExpr('@item:/name')).toEqual({ $bind: '/name', $from: 'item' });
  });

  it('深归一：值位置转规范形，data 子树跳过，键不动，转义还原', () => {
    const input = {
      data: { note: '@:/不是引用' },
      root: {
        type: 'p',
        text: '@:/order/title',
        props: { label: '#gauge:/value', hint: '@@literal' }
      }
    };
    const out = normalizeSugarDeep(input);

    expect(out.data.note).toBe('@:/不是引用'); // data 不动
    expect(out.root.text).toEqual({ $bind: '/order/title' });
    expect(out.root.props.label).toEqual({ $bind: '/@gauge/value' });
    expect(out.root.props.hint).toBe('@literal');
    expect(Object.keys(out.root)).toContain('type'); // 键不转
  });
});

describe('保管者端到端（@i18n 渲染）', () => {
  it('宿主注册 i18n 树，文本引用渲染出来', () => {
    const genui = createGenUI({
      custodians: { i18n: { buttons: { ok: '确定' } } }
    });
    const surface = genui.fromJson({
      root: { type: 'p', text: '@i18n:/buttons/ok' }
    });
    const target = document.createElement('div');

    surface.bindTo(target);
    expect(target.querySelector('p').textContent).toBe('确定');
  });

  it('未注册保管者 → 渲染期明确报错', () => {
    const genui = createGenUI();
    const surface = genui.fromJson({ root: { type: 'p', text: '@nope:/x' } });
    const target = document.createElement('div');

    expect(() => surface.bindTo(target)).toThrow(/未注册的数据保管者 "nope"/);
  });
});
