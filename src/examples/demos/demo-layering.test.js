import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * 页面壳分层规则：演示源码只放"核心内容 + 行为"，
 * Card / vCardHeader / vCardBody / vCardFooter 属于文档页壳。
 * 迁移完成前，存量文件按基线放行；基线之上的新增会被拦截，
 * 清理干净后必须删除对应白名单条目。
 */
const SHELL_TOKENS = ['vCard(', 'vCardHeader(', 'vCardBody(', 'vCardFooter('];

// 迁移基线：值为当前 shell token 数；文件清零后删除条目。
const ALLOWLIST = {
  'i18n.js': 16,
  'navigation.js': 15,
  'router-async.js': 3,
  'router-params.js': 3,
  'router.js': 15,
  'ssr-demo.js': 3
};

const demoDir = resolve(process.cwd(), 'src/examples/demos');
const examplesDir = resolve(process.cwd(), 'src/examples');

function collectExampleFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      return collectExampleFiles(full);
    }
    return entry.name.endsWith('.js') && !entry.name.endsWith('.test.js') ? [full] : [];
  });
}

function shellTokenCount(source) {
  return SHELL_TOKENS.reduce((total, token) => total + source.split(token).length - 1, 0);
}

describe('demo layering', () => {
  it('keeps page shell out of demo source', () => {
    const failures = [];
    const staleEntries = [];

    readdirSync(demoDir)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .sort()
      .forEach((fileName) => {
        const source = readFileSync(resolve(demoDir, fileName), 'utf8');
        const count = shellTokenCount(source);
        const baseline = ALLOWLIST[fileName] ?? 0;

        if (baseline > 0 && count === 0) {
          staleEntries.push(
            `${fileName}: allowlist entry is stale (no shell tokens remain), remove it`
          );
        } else if (count > baseline) {
          failures.push(
            `${fileName}: ${count} shell tokens exceed allowlisted baseline ${baseline}`
          );
        }
      });

    expect(staleEntries.join('\n')).toBe('');
    expect(failures.join('\n')).toBe('');
  });

  it('keeps demo buttons label-first', () => {
    const failures = [];

    readdirSync(demoDir)
      .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
      .sort()
      .forEach((fileName) => {
        const source = readFileSync(resolve(demoDir, fileName), 'utf8');
        if (/vButton\(\s*\(/.test(source)) {
          failures.push(
            `${fileName}: button is created without a label, use vButton('label', setup)`
          );
        }
      });

    expect(failures.join('\n')).toBe('');
  });

  it('keeps every example button label-first', () => {
    const failures = [];

    collectExampleFiles(examplesDir).forEach((file) => {
      const source = readFileSync(file, 'utf8');
      if (/vButton\(\s*\(/.test(source)) {
        failures.push(`${file.replace(examplesDir + '\\', '')}: label-first vButton required`);
      }
    });

    expect(failures.join('\n')).toBe('');
  });
});
