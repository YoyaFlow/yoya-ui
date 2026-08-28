import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MAX_LINE_LENGTH = 100;
const MAX_CHAIN_CALLS_PER_LINE = 3;

const demoDir = resolve(process.cwd(), 'src/examples/demos');

const demoFiles = readdirSync(demoDir)
  .filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'))
  .sort();

describe('demo readability', () => {
  it('keeps demo source lines short and chains readable', () => {
    const failures = [];

    demoFiles.forEach((fileName) => {
      const source = readFileSync(resolve(demoDir, fileName), 'utf8');

      source.split(/\r?\n/).forEach((line, index) => {
        const lineNumber = index + 1;
        const length = [...line].length;
        const chainCalls = (line.match(/\.\s*[A-Za-z_$][\w$]*\s*\(/g) || []).length;

        if (length > MAX_LINE_LENGTH) {
          failures.push(`${fileName}:${lineNumber}:${length} characters, max ${MAX_LINE_LENGTH}`);
        }

        if (chainCalls > MAX_CHAIN_CALLS_PER_LINE) {
          failures.push(
            `${fileName}:${lineNumber}:${chainCalls} chained calls, max ${MAX_CHAIN_CALLS_PER_LINE}`
          );
        }
      });
    });

    expect(failures.join('\n')).toBe('');
  });
});
