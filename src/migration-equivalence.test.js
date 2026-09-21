/**
 * 组件迁移等价性金标（波 0 的夹具升级版）。
 *
 * 每个用例把组件渲染到真实容器，冻结四段签名：**逐节点 DOM** / `toHTML()` / **命令探测** /
 * **销毁残留**。迁移（C/B → vNode）前后这几段必须逐字不变——不然这个测试就红。
 *
 * 工作流：
 * 1. 迁移某组件前，先在 `CASES` 里加一条（中性形状，只用公开 API）；
 * 2. `UPDATE_MIGRATION_GOLDEN=1 npx vitest run src/migration-equivalence.test.js` 生成金标，
 *    粘贴进 `GOLDEN`（输出同时落在 `.scratch/migration-snapshots/migration-golden.txt`）；
 * 3. 迁移；4. `npx vitest run src/migration-equivalence.test.js` 必须仍然全绿。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as core from './yoya.core.js';
import * as ui from './yoya.ui.js';

const api = { ...core, ...ui };

/** 与迁移前快照同一口径：属性按名排序、文本节点显式标出。 */
const signature = (node) => {
  if (node.nodeType === 3) {
    return `#text:${node.textContent}`;
  }
  const attrs = [...node.attributes]
    .map((item) => `${item.name}=${item.value}`)
    .sort()
    .join(' ');
  const children = [...node.childNodes].map(signature).join('');
  return `<${node.tagName.toLowerCase()} ${attrs}>${children}`;
};

/** 序列化差异归一（见 compiler-landing 票 08：style 文本 / 属性排序）。 */
const normalizeHtml = (html) =>
  html.replace(/\sstyle="([^"]*)"/g, (whole, value) => {
    const declarations = value
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(';');
    return ` style="${declarations}"`;
  });

const CASES = [
  {
    name: 'vTransition / 默认',
    build: () => api.vTransition((transition) => transition.span('内容')),
    probe: (node) => ({ shown: node.show(), motion: node.motion() })
  },
  {
    name: 'vTransition / leave + duration',
    build: () => api.vTransition({ duration: 120, shown: false }, (t) => t.span('内容')),
    probe: (node) => ({ shown: node.show(), duration: node.duration() })
  },
  {
    name: 'vButton / 文本 + variant',
    build: () =>
      api.vButton('保存', (button) => {
        button.variant('primary');
        button.attr('data-role', 'save');
      }),
    probe: (node) => ({ variant: node.variant() })
  },
  {
    name: 'vBadge / 文本 + 类型',
    build: () => api.vBadge('新', { type: 'primary' }),
    probe: () => null
  },
  {
    name: 'vCard / header + body + footer',
    build: () =>
      api.vCard((card) => {
        card.vCardHeader('标题');
        card.vCardBody((body) => body.p('正文'));
        card.vCardFooter('页脚');
      }),
    probe: () => null
  },
  {
    name: 'vProgress / 百分比',
    build: () => api.vProgress({ value: 40 }),
    probe: (node) => ({ value: node.value() })
  },
  {
    name: 'vTabs / 两个页签',
    build: () =>
      api.vTabs((tabs) => {
        tabs.vTab('概览', () => api.p('A'));
        tabs.vTab('详情', () => api.p('B'));
      }),
    probe: (node) => ({ active: node.active() })
  },
  {
    name: 'vSteps / 两步',
    build: () =>
      api.vSteps({ current: 1 }, (steps) => {
        steps.vStep({ title: '第一步' });
        steps.vStep({ title: '第二步' });
      }),
    probe: (node) => ({ current: node.current() })
  },
  {
    name: 'vForm / 采集链',
    build: () =>
      api.vForm((form) => {
        form.vFormItem((item) => {
          item.label('名称').name('title');
          item.control((editor) => editor.vInput({ name: 'title', value: '初始' }));
        });
      }),
    probe: (node) => ({ values: node.values(), valid: node.validate() })
  },
  {
    name: 'vPagination / 分页（形态 B）',
    build: () => api.vPagination({ page: 2, pageSize: 10, total: 95 }),
    probe: (node) => ({
      page: node.page(),
      pageSize: node.pageSize(),
      totalPages: node.totalPages()
    })
  },
  {
    name: 'vDialog / 标题 + 内容',
    build: () =>
      api.vDialog({ title: '提示' }, (dialog) => {
        dialog.child(api.p('内容'));
      }),
    probe: () => null
  },
  {
    name: 'vScroll / 空容器',
    build: () => api.vScroll((scroll) => scroll.style('height', '120px')),
    probe: (node) => ({
      threshold: node.threshold(),
      virtual: node.virtual(),
      itemHeight: node.itemHeight()
    })
  },
  {
    name: 'vMenu / 分组 + 分隔线 + 项目',
    build: () =>
      api.vMenu((menu) => {
        menu.vMenuGroup((group) => {
          group.label('文件操作');
          group.vMenuItem('新建');
          group.vMenuItem({ disabled: true, text: '删除' });
        });
        menu.vMenuDivider();
        menu.vMenuItem('退出');
      }),
    probe: (menu) => ({
      children: menu.children().length,
      orientation: menu.attr('data-orientation')
    })
  },
  {
    name: 'vSubMenu / 嵌套菜单',
    build: () =>
      api.vMenu((menu) => {
        menu.vSubMenu((submenu) => {
          submenu.label('更多操作');
          submenu.menuContent((nested) => nested.vMenuItem('导出'));
        });
      }),
    probe: (menu) => ({ children: menu.children().length })
  },
  {
    name: 'vSidebar / 标题 + 菜单',
    build: () =>
      api.vSidebar({
        ariaLabel: '后台主导航',
        title: '运维中心',
        menuContent(menu) {
          menu.vMenuItem({ active: true, text: '概览' });
        }
      }),
    probe: (sidebar) => ({ tag: sidebar.tagName() })
  }
];

const runCase = (item) => {
  const host = document.createElement('div');
  document.body.appendChild(host);

  // 形态 B / 返回组件对象的工厂不是 ViewNode：统一用 `child()` 包一层，四种形态都跑得通
  const built = item.build();
  const node = typeof built?.bindTo === 'function' ? built : api.div((root) => root.child(built));
  node.bindTo(host);

  const lines = [`### ${item.name}`];
  lines.push(`dom:      ${signature(host.firstElementChild ?? host)}`);
  lines.push(`toHTML:   ${normalizeHtml(node.toHTML())}`);
  // 命令探测针对**工厂返回的那个把手**（形态 B 返回对象、其余返回节点）——与使用端一致
  lines.push(`probe:    ${JSON.stringify(item.probe ? item.probe(built, host) : null)}`);

  node.destroy();
  lines.push(`residue:  ${host.innerHTML === '' ? '(空)' : host.innerHTML}`);
  lines.push('');
  host.remove();

  return lines.join('\n');
};

/** 金标文件与测试同目录；迁移前后必须逐字一致。 */
const GOLDEN_FILE = join(dirname(fileURLToPath(import.meta.url)), 'migration-golden.txt');

/** 换行与末尾空白不参与比较（不同编辑器 / 平台的差异不该算行为变化）。 */
const normalizeGolden = (text) => text.replace(/\r\n/g, '\n').trimEnd();

describe('组件迁移等价性金标（票 10 夹具升级）', () => {
  it('每个用例的 DOM / toHTML / 命令 / 销毁残留都与金标一致', () => {
    const actual = `${CASES.map(runCase).join('\n')}`.trimEnd();

    if (process.env.UPDATE_MIGRATION_GOLDEN === '1') {
      writeFileSync(GOLDEN_FILE, `${normalizeGolden(actual)}\n`, 'utf8');
      console.log(`金标已写入 ${GOLDEN_FILE}`);
      return;
    }

    expect(
      actual,
      '迁移改变了可观察行为——要么修回等价，要么确认这是有意变更后用 UPDATE_MIGRATION_GOLDEN=1 更新金标'
    ).toBe(normalizeGolden(readFileSync(GOLDEN_FILE, 'utf8')));
  });
});
