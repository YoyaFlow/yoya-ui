import { describe, expect, it } from 'vitest';
import { ViewNode } from '../core/node.js';
import { PaginationExample1 } from './detail-sources.js';

describe('PaginationExample1', () => {
  it('render() returns a ViewNode so the demo shell can resolve it', () => {
    const example = PaginationExample1();

    expect(example.render()).toBeInstanceOf(ViewNode);
  });
});
