import { describe, expect, it } from 'vitest';
import { HtmlNativeDocumentationPage } from './html-native-docs.js';

describe('html native documentation page', () => {
  it('lists the node API and spells out the text / textContent difference', () => {
    const view = HtmlNativeDocumentationPage().render();
    const element = view.renderDom();
    const api = element.querySelector('[data-html-native-api]');

    expect(api).toBeTruthy();

    const rows = [...api.querySelectorAll('tbody tr')].map((row) => row.textContent);
    const findRow = (name) => rows.find((text) => text.startsWith(name));

    expect(findRow('node.text(content)')).toContain('反复调用会越堆越多');
    expect(findRow('node.textContent()')).toContain('只读');
    expect(findRow('textNode.textContent(value)')).toContain('原地替换');
    expect(findRow('node.attr(name) / attr(name, value)')).toContain('移除');
    expect(findRow('node.setState(name, value)')).toContain('同义');
    expect(findRow('node.state(initial)')).toContain('幂等种子');
    expect(findRow('node.flushAll()')).toContain('只刷绑定');
    expect(findRow('node.getState(name)')).toContain('类型转换');
    expect(findRow('node.rebuildable(predicate?)')).toBeTruthy();
    expect(findRow('node.bindTo(target) / destroy()')).toBeTruthy();

    const samples = [...api.querySelectorAll('pre')].map((pre) => pre.textContent);
    expect(samples[0]).toContain("p.text('状态：已同步')");
    expect(samples[1]).toContain('ele.state({ count: 0, open: false })');
    expect(samples[1]).toContain("ele.setState('open', true)");
    expect(samples[1]).toContain('ele.setState({ count: 2 })');
    expect(samples[1]).toContain("ele.registerStateHandler('open'");
    expect(samples[1]).toContain('保留状态值');
    expect(samples[1]).not.toContain('vStateNode');

    view.destroy();
  });

  it('keeps the live demo source free of direct document access', () => {
    const view = HtmlNativeDocumentationPage().render();
    const element = view.renderDom();
    const sources = [...element.querySelectorAll('[data-source-example]')].map(
      (node) => node.textContent
    );

    expect(sources.length).toBeGreaterThan(0);
    expect(sources.join('\n')).not.toContain('document.');
    expect(sources.join('\n')).toContain('event.target.value');

    view.destroy();
  });
});
