#!/usr/bin/env node
/**
 * yoya-a2ui —— A2UI JSON → yoya-genui schema 的命令行适配器。
 *
 * 用法：
 *   yoya-a2ui input.json            # 读文件，schema 写到 stdout
 *   yoya-a2ui input.jsonl -o out.json
 *   cat messages.jsonl | yoya-a2ui - # stdin → stdout
 *
 * 输入认 A2UI v0.8 的消息数组 / JSONL / 单条；输出是 yoya-genui schema（可直接
 * GenUI.fromJson 渲染）。给 MCP 渲染管线 / 批量转换 / 离线校验用——不碰 DOM。
 */
import { readFile, writeFile } from 'node:fs/promises';
import { convertA2UI } from './index.js';

const args = process.argv.slice(2);

const readFlag = (name) => {
  const index = args.indexOf(name);

  return index >= 0 ? args.splice(index, 2)[1] : undefined;
};

const surfaceId = readFlag('--surface-id');
const outFile = readFlag('-o') ?? readFlag('--out');
const compact = args.includes('--compact');
const inputArg = args.find((arg) => !arg.startsWith('-'));

async function readInput() {
  if (inputArg === undefined || inputArg === '-') {
    const chunks = [];

    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks).toString('utf8');
  }

  return readFile(inputArg, 'utf8');
}

let schema;

try {
  schema = convertA2UI(await readInput(), surfaceId !== undefined ? { surfaceId } : {});
} catch (error) {
  console.error(`A2UI 转换失败：${error.message}`);
  process.exit(1);
}

const text = JSON.stringify(schema, null, compact ? 0 : 2) + '\n';

if (outFile === undefined) {
  process.stdout.write(text);
} else {
  await writeFile(outFile, text, 'utf8');
  process.stderr.write(`✓ ${outFile}（${schema.components.length} 块内容）\n`);
}
