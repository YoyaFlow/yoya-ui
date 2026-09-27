import { describe, expect, it } from 'vitest';
import { createGenUI } from '../../src/genui/index.js';

describe('数据引用作用域链', () => {
  it('repeat 支持 @:/ 绝对引用、$as 具名作用域、$index/$key 与 ^ 翻层', () => {
    const genui = createGenUI();
    const surface = genui.fromJson({
      data: {
        rootTitle: '根标题',
        groups: [
          {
            title: '外层',
            items: [
              { name: '内层', sku: 'a' },
              { name: '第二层', sku: 'b' }
            ]
          }
        ]
      },
      root: {
        type: 'div',
        repeat: { $each: '@:/groups', $key: 'title', $as: 'group' },
        template: {
          type: 'div',
          children: [
            { type: 'p', text: '@:rootTitle' },
            { type: 'p', text: '@:title' },
            { type: 'p', text: '@group:/title' },
            {
              type: 'div',
              repeat: { $each: '@:items', $as: 'item' },
              template: {
                type: 'div',
                children: [
                  { type: 'p', text: '@item:/name' },
                  { type: 'p', text: '@:$index' },
                  { type: 'p', text: '@:sku' },
                  { type: 'p', text: '@:^title' }
                ]
              }
            }
          ]
        }
      }
    });
    const target = document.createElement('div');

    surface.bindTo(target);

    const text = [...target.querySelectorAll('p')].map((node) => node.textContent);

    expect(text).toEqual([
      '根标题',
      '外层',
      '外层',
      '内层',
      '0',
      'a',
      '外层',
      '第二层',
      '1',
      'b',
      '外层'
    ]);
  });
});
