import { describe, expect, it } from 'vitest';
import * as apiEntry from '../yoya.api.js';
import * as core from './index.js';

describe('API entry boundary', () => {
  it('exports communication contracts from the dedicated entry', () => {
    expect(typeof apiEntry.configureRequest).toBe('function');
    expect(apiEntry.RequestBase).toBeTypeOf('function');
    expect(apiEntry.Result).toBeTypeOf('function');
  });

  it('keeps communication contracts out of the core entry', () => {
    expect(core.configureRequest).toBeUndefined();
    expect(core.RequestBase).toBeUndefined();
    expect(core.Result).toBeUndefined();
  });
});
