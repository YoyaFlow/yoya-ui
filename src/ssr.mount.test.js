import { describe, expect, it } from 'vitest';
import { computed, createI18n, div, ref, vText } from './index.js';
import { mount, parseState, renderToString } from './yoya.ssr.js';

function createCounterPage(initialState = { count: 0 }) {
  const count = ref(initialState.count ?? 0);

  return div((page) => {
    page.span((line) => line.child(vText(computed(() => `计数：${count.value}`))));
    page.button((button) => {
      button.child(vText(computed(() => `+${count.value}`)));
      button.on('click', () => {
        count.value += 1;
      });
    });
  });
}

describe('mount after server render', () => {
  it('rebuilds the page from serialized state and binds events', () => {
    const { html, state } = renderToString(createCounterPage, { state: { count: 3 } });
    document.body.innerHTML = `<div id="app">${html}</div>`;

    mount(createCounterPage, '#app', parseState(state));

    const app = document.querySelector('#app');
    expect(app.textContent).toContain('计数：3');

    app.querySelector('button').click();

    expect(app.textContent).toContain('计数：4');
    expect(app.querySelector('button').textContent).toBe('+4');
  });
});

describe('mount i18n option', () => {
  it('scopes the string shortcut to the page locale', () => {
    const messages = {
      'zh-CN': { welcome: '欢迎' },
      'en-US': { welcome: 'Welcome' }
    };
    const createLocale = (state) => createI18n({ language: state?.locale || 'zh-CN', messages });
    const page = () => div((root) => root.span('welcome'.s('welcome')));

    document.body.innerHTML = '<div id="app"></div>';

    const node = mount(page, '#app', { locale: 'en-US' }, { i18n: createLocale });

    expect(document.querySelector('#app').textContent).toBe('Welcome');
    node.destroy();
  });
});
