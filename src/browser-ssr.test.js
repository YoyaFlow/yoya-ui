// @vitest-environment node

import { describe, expect, it } from 'vitest';
import {
  vAnchor,
  vAvatarUpload,
  vCarousel,
  vDialog,
  vMenu,
  vMessageManager,
  vNavbar,
  vScroll,
  vTable,
  vTooltip,
  vUpload
} from './index.js';
import { vEchart } from './yoya.echart.js';
import { renderToString } from './yoya.ssr.js';

describe('browser-only components server render', () => {
  it('serializes browser-only components as static structures', () => {
    const cases = [
      ['vEchart', vEchart({ option: { xAxis: {}, yAxis: {}, series: [] } })],
      ['vCarousel', vCarousel({ slides: ['A', 'B'] })],
      ['vTooltip', vTooltip({ content: '提示' })],
      ['vDialog', vDialog({ title: '对话框' })],
      ['vMessageManager', vMessageManager()],
      ['vUpload', vUpload({ label: '上传' })],
      ['vAvatarUpload', vAvatarUpload()],
      ['vAnchor', vAnchor((anchor) => anchor.vAnchorItem('锚点', '#section'))],
      ['vMenu', vMenu((menu) => menu.vMenuItem('菜单项'))],
      ['vNavbar', vNavbar({ title: '导航' })]
    ];

    for (const [name, node] of cases) {
      expect(node.toHTML().length, name).toBeGreaterThan(0);
    }
  });

  it('serializes a virtual scroll as a deterministic initial window', () => {
    const scroll = vScroll({
      itemHeight: 40,
      items: Array.from({ length: 1000 }, (_, index) => `项目 ${index}`),
      virtual: true
    });

    const html = scroll.toHTML();
    const items = html.match(/yoya-vscroll-virtual-item/g) || [];

    expect(items).toHaveLength(5);
    expect(html).toContain('data-index="0"');
    expect(html).not.toContain('项目 999');
  });

  it('flags oversized tables for client fallback', () => {
    const rows = Array.from({ length: 1000 }, (_, index) => ({
      id: String(index),
      label: `行 ${index}`
    }));
    const page = () =>
      vTable({
        columns: [
          { key: 'id', title: 'ID' },
          { key: 'label', title: '标签' }
        ],
        rows
      });

    const { exceeded } = renderToString(page, { maxNodes: 500 });

    expect(exceeded).toBe(true);
  });
});
