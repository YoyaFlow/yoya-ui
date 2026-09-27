import { execFile } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { convertA2UI, toA2UIUserAction } from '../../src/genui/dialects/a2ui/index.js';

const run = promisify(execFile);

const BASIC_MESSAGES = [
  { beginRendering: { root: 'root', surfaceId: 'main' } },
  {
    surfaceUpdate: {
      components: [
        { id: 'root', component: { Column: { children: { explicitList: ['title', 'go'] } } } },
        {
          id: 'title',
          component: { Text: { text: { literalString: '订单确认' }, usageHint: 'h2' } }
        },
        {
          id: 'go',
          component: {
            Button: {
              action: {
                context: [{ key: 'orderNo', value: { path: '/order/no' } }],
                name: 'confirm'
              },
              child: 'go-label',
              primary: true
            }
          }
        },
        { id: 'go-label', component: { Text: { text: { literalString: '确认' } } } }
      ],
      surfaceId: 'main'
    }
  }
];

describe('A2UI 适配器（A2UI JSON → yoya-genui schema）', () => {
  it('convertA2UI：消息数组 → 扁平 schema（结构槽位 + 内容表 + 按钮标签吸收）', () => {
    const schema = convertA2UI(BASIC_MESSAGES, { surfaceId: 'main' });

    expect(schema.protocol).toBe('yoya-genui');
    expect(schema.surfaceId).toBe('main');
    expect(schema.root.type).toBe('vstack');
    expect(schema.root.children.map((node) => node.vn_slot)).toEqual(['title', 'go']);
    expect(schema.components.map((block) => block.id)).toEqual(['title', 'go']);
    // Button 的 child（Text）被吸收成 label
    expect(schema.components[1].props.label).toBe('确认');
    expect(schema.components[1].on.click['$action']).toBe('confirm');
  });

  it('convertA2UI：JSONL 文本也认（CLI 的输入形态）', () => {
    const jsonl = BASIC_MESSAGES.map((message) => JSON.stringify(message)).join('\n');
    const schema = convertA2UI(jsonl);

    expect(schema.components).toHaveLength(2);
  });

  it('toA2UIUserAction：动作事件回传 A2UI 报文（适配器是双向的）', () => {
    const message = toA2UIUserAction({
      name: 'confirm',
      params: { orderNo: 'A-1' },
      source: { componentId: 'go', surfaceId: 'main' }
    });

    expect(message.userAction).toMatchObject({
      context: { orderNo: 'A-1' },
      name: 'confirm',
      sourceComponentId: 'go',
      surfaceId: 'main'
    });
  });

  it('CLI：文件进 → schema 出（stdout），坏输入退出码 1', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'yoya-a2ui-'));
    const input = join(dir, 'messages.jsonl');
    const output = join(dir, 'schema.json');

    await writeFile(
      input,
      BASIC_MESSAGES.map((message) => JSON.stringify(message)).join('\n'),
      'utf8'
    );

    const cli = join(process.cwd(), 'packages/yoya-core/dist/genui/dialects/a2ui/cli.js');
    const { stdout } = await run(process.execPath, [cli, input, '--surface-id', 'main']);
    const schema = JSON.parse(stdout);

    expect(schema.protocol).toBe('yoya-genui');
    expect(schema.surfaceId).toBe('main');
    expect(schema.components).toHaveLength(2);

    // -o 写文件
    await run(process.execPath, [cli, input, '-o', output]);
    expect(JSON.parse(await readFile(output, 'utf8')).components).toHaveLength(2);

    // 坏输入：非 A2UI 内容的文件
    const badFile = join(dir, 'bad.json');

    await writeFile(badFile, '{"not":"a2ui"}', 'utf8');
    const bad = await run(process.execPath, [cli, badFile]).catch((error) => error);

    expect(bad.code).toBe(1);
    expect(bad.stderr).toContain('A2UI 转换失败');
  });
});
