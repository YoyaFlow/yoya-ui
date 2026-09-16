import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  BUNDLE_ENTRIES,
  README_ROW_NAMES,
  readReadmeSizes
} from '../../scripts/bundle-metrics.mjs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const metricsScript = read('../../scripts/bundle-metrics.mjs');
const verifyScript = read('../../scripts/verify-dist.mjs');
const pkg = JSON.parse(read('../../package.json'));
const zhReadme = read('../../README.zh-CN.md');
const enReadme = read('../../README.md');

describe('bundle report wiring', () => {
  it('prints the size table as part of the regular build output', () => {
    expect(pkg.scripts.build).toContain('node scripts/bundle-report.mjs');
  });

  it('keeps every published entry in the report, including the API entry', () => {
    expect(BUNDLE_ENTRIES).toContain('yoya.api.js');
    expect(BUNDLE_ENTRIES).toContain('yoya.core.js');
    expect(metricsScript).toContain("'yoya.api.js'");
  });

  it('gates the README size tables against the built artifacts', () => {
    expect(pkg.scripts['verify:dist']).toContain('scripts/verify-dist.mjs');
    expect(verifyScript).toContain('compareReadmeSizes');
    expect(verifyScript).toContain('collectBundleReport');
  });

  it('budgets core entry, self-contained bundles and the component skin', () => {
    for (const artifact of [
      'yoya.core.min.js',
      'yoya.api.min.js',
      'yoya.ui.full.min.js',
      'yoya.ui-router.full.min.js',
      'yoya.ui.css'
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
        expect(sizes.rows[row].length, `${name} 体积行「${row}」数字个数不对`).toBe(
          row.includes('raw / min / min+gzip') ? 3 : row.includes('echart') ? 4 : 2
        );
      }
      expect(sizes.css, `${name} 缺少组件皮肤体积`).not.toBeNull();
    }
  });

  it('keeps the English and Chinese tables on the same numbers', () => {
    expect(readReadmeSizes(enReadme)).toEqual(readReadmeSizes(zhReadme));
  });
});
