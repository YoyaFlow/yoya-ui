import { describe, expect, it } from 'vitest';

describe('component source demo component', () => {
  it('generates source and renders it through a reusable object component', async () => {
    const { ComponentSource, componentSource } = await import('./component-source.js');

    function SampleCard() {
      return {
        render() {
          return 'sample';
        }
      };
    }

    const expectedSource = `import { vCard } from 'yoya-ui';

export function SampleCard() {
  return {
    render() {
      return 'sample';
    }
  };
}`;
    const sourcePanel = ComponentSource({
      component: SampleCard,
      imports: ['vCard'],
      title: '示例源码'
    });
    const element = sourcePanel.render().renderDom();

    expect(componentSource(SampleCard, ['vCard'])).toBe(expectedSource);
    expect(sourcePanel).toEqual(expect.objectContaining({ render: expect.any(Function) }));
    expect(element.classList.contains('source-panel')).toBe(true);
    expect(element.querySelector('h2').textContent).toBe('示例源码');
    expect(element.querySelector('[data-source-example]').textContent).toBe(expectedSource);
  });
});
