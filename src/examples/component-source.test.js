import { describe, expect, it, vi } from 'vitest';
import { componentSource } from './component-source.js';

describe('componentSource', () => {
  it('normalizes bundler tabs before dedenting source', () => {
    const original = Function.prototype.toString;
    const demo = function TabIndentedDemo() {};
    const bundleSource = 'function TabIndentedDemo() {\n\treturn div("ok");\n}';

    const spy = vi.spyOn(Function.prototype, 'toString').mockImplementation(function sourceText() {
      if (this === demo) {
        return bundleSource;
      }
      return original.call(this);
    });

    try {
      const source = componentSource(demo, ['div']);
      expect(source).not.toContain('\t');
      expect(source).toContain('return div("ok");');
    } finally {
      spy.mockRestore();
    }
  });
});
