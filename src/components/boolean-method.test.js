import { describe, expect, it, vi } from 'vitest';
import { booleanMethod } from './shared.js';

describe('booleanMethod', () => {
  it('reads and writes through the returned accessor', () => {
    const target = {};
    const apply = vi.fn();
    target.disabled = booleanMethod(target, 'disabled', false, apply);

    expect(target.disabled()).toBe(false);

    target.disabled(true);

    expect(target.disabled()).toBe(true);
    expect(apply).toHaveBeenCalledWith(true);
  });

  it('keeps the signal private and applies only on writes', () => {
    const target = {};
    const apply = vi.fn();
    target.open = booleanMethod(target, 'open', false, apply);

    target.open();
    target.open();

    expect(apply).not.toHaveBeenCalled();
    expect(target._open.value).toBe(false);
  });

  it('coerces truthy values and returns the target for chaining', () => {
    const target = {};
    const apply = vi.fn();
    target.active = booleanMethod(target, 'active', false, apply);

    expect(target.active('yes')).toBe(target);
    expect(target._active.value).toBe(true);
  });
});
