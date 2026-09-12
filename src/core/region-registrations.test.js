import { describe, expect, it } from 'vitest';
import { div, ref } from '../index.js';
import { bindDocumentEvent } from './document-events.js';
import { setupContentSlot } from '../components/shared.js';

describe('rebuildable region registration reset', () => {
  it('replaces previous registrations on every rebuild', () => {
    let builds = 0;
    const box = div((ele) => {
      ele.rebuildable();
      builds += 1;
      ele.text(`x${builds}`);
    });
    box.renderDom();

    box.rebuild();
    box.rebuild();

    expect(box.children()).toHaveLength(1);
    expect(box.renderDom().textContent).toBe('x3');
  });

  it('removes document listeners registered by previous runs', () => {
    const originalAdd = document.addEventListener.bind(document);
    const originalRemove = document.removeEventListener.bind(document);
    let adds = 0;
    let removes = 0;

    document.addEventListener = (type, handler, options) => {
      if (type === 'pointerdown') {
        adds += 1;
      }
      return originalAdd(type, handler, options);
    };
    document.removeEventListener = (type, handler, options) => {
      if (type === 'pointerdown') {
        removes += 1;
      }
      return originalRemove(type, handler, options);
    };

    try {
      const box = div((ele) => {
        ele.rebuildable();
        bindDocumentEvent('pointerdown', () => {});
        ele.text('x');
      });
      box.renderDom();

      box.rebuild();
      box.rebuild();

      expect(adds).toBe(3);
      expect(removes).toBe(2);
    } finally {
      document.addEventListener = originalAdd;
      document.removeEventListener = originalRemove;
    }
  });

  it('lets a nested region rebuild while its parent only flushes values', () => {
    let childBuilds = 0;
    const n = ref(0);
    const parent = div((host) => {
      host.rebuildable(() => false);
      host.div((child) => {
        child.rebuildable(() => true);
        childBuilds += 1;
        child.text(`n=${n.value}`);
      });
    });
    const element = parent.renderDom();
    const childElement = element.firstElementChild;
    const textNode = childElement.firstChild;

    expect(childElement.textContent).toBe('n=0');

    n.value = 1;

    expect(childBuilds).toBe(2);
    expect(textNode.parentNode).toBeNull();
    expect(element.textContent).toBe('n=1');
  });

  it('records builders coming from content slots', () => {
    const node = div();

    setupContentSlot(node, (slot) => {
      slot.rebuildable();
      slot.text('slot');
    });

    expect(() => node.rebuild()).not.toThrow();
    expect(node.renderDom().textContent).toBe('slot');
  });
});
