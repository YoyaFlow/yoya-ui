import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BUNDLE_ENTRIES,
  README_ROW_NAMES,
  readReadmeSizes
} from '../../../scripts/bundle-metrics.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const metricsScript = read('../../../scripts/bundle-metrics.mjs');
const verifyScript = read('../../../scripts/verify-dist.mjs');
const pkg = JSON.parse(read('../../../package.json'));
const zhReadme = read('../../../README.zh-CN.md');
const enReadme = read('../../../README.md');

describe('bundle report wiring', () => {
  it('prints the size table as part of the regular build output', () => {
    expect(pkg.scripts.build).toContain('node scripts/bundle-report.mjs');
  });

  it('keeps every published entry in the report, one row per package entry', () => {
    const labels = BUNDLE_ENTRIES.map((entry) => entry.label);
    // 拆包口径：core 与 ui 各报自己的入口（不再有"单包 + .full"的旧清单）
    for (const label of [
      '@yoyaflow/yoya-core',
      '@yoyaflow/yoya-core/api',
      '@yoyaflow/yoya-ui',
      '@yoyaflow/yoya-ui/ui',
      '@yoyaflow/yoya-ui/router',
      '@yoyaflow/yoya-ui/compiler-runtime'
    ]) {
      expect(labels, label).toContain(label);
    }
    expect(BUNDLE_ENTRIES.every((entry) => entry.pkg === 'core' || entry.pkg === 'ui')).toBe(true);
    expect(metricsScript).toContain('packages/yoya-core/dist');
  });

  it('gates the README size tables against the built artifacts', () => {
    expect(pkg.scripts['verify:dist']).toContain('scripts/verify-dist.mjs');
    expect(verifyScript).toContain('compareReadmeSizes');
    expect(verifyScript).toContain('collectBundleReport');
  });

  it('checks both packages: entries, host singleton smoke, compiler bin, README table', () => {
    for (const artifact of [
      'dist/compiler.js',
      '@yoyaflow/yoya-core',
      '@yoyaflow/yoya-ui',
      'README.zh-CN.md'
    ]) {
      expect(verifyScript).toContain(`'${artifact}'`);
    }
  });
});

describe('README size tables', () => {
  it('documents every entry with entry-file and actual-download numbers', () => {
    for (const [name, text] of [
      ['README.md', enReadme],
      ['README.zh-CN.md', zhReadme]
    ]) {
      const sizes = readReadmeSizes(text);
      for (const row of README_ROW_NAMES) {
        expect(sizes.rows[row], `${name} 缺少体积行「${row}」`).not.toBeNull();
        // 新口径每行只有一个数：该入口的传递闭包 min+gzip
        expect(sizes.rows[row].length, `${name} 体积行「${row}」数字个数不对`).toBe(1);
      }
      expect(sizes.css, `${name} 缺少组件皮肤体积`).not.toBeNull();
    }
  });

  it('keeps the English and Chinese tables on the same numbers', () => {
    expect(readReadmeSizes(enReadme)).toEqual(readReadmeSizes(zhReadme));
  });
});
