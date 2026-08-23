import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren
} from '../components/shared.js';

export class VCode extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this._languageBadge = new HtmlElementNode('span')
      .className('yoya-vcode-language')
      .style('display', 'none');
    this._copyButton = new HtmlElementNode('button')
      .className('yoya-vcode-copy')
      .attr({ 'aria-label': '复制代码', type: 'button' })
      .on('click', () => {
        void this.copy();
      });
    this._toolbar = new HtmlElementNode('div').className('yoya-vcode-toolbar');
    this._codeBox = new HtmlElementNode('code').className('yoya-vcode-content');
    this._preBox = new HtmlElementNode('pre').className('yoya-vcode-pre').child(this._codeBox);

    this.className(componentClass, 'yoya-vcode');
    this.styles({
      background: '#ffffff',
      border: '1px solid #d8dee8',
      borderRadius: '8px',
      color: '#172033',
      overflow: 'hidden'
    });
    this._toolbar.styles({
      alignItems: 'center',
      background: '#f8fafc',
      display: 'flex',
      gap: '8px',
      justifyContent: 'space-between',
      padding: '10px 12px'
    });
    this._languageBadge.styles({
      background: '#e2e8f0',
      borderRadius: '999px',
      color: '#334155',
      fontSize: '12px',
      fontWeight: '700',
      lineHeight: '1',
      padding: '4px 8px'
    });
    this._preBox.styles({
      background: '#fbfcfe',
      margin: '0',
      overflow: 'auto',
      padding: '14px 16px'
    });
    this._codeBox.styles({
      display: 'block',
      fontFamily: '"Cascadia Code", "Fira Code", ui-monospace, SFMono-Regular, Consolas, monospace',
      fontSize: '13px',
      lineHeight: '1.55',
      minWidth: 'max-content',
      whiteSpace: 'pre'
    });
    this.copyLabel('复制');
    this.copyable(true);
    this._toolbar.child(this._languageBadge, this._copyButton);
    this.child(this._toolbar, this._preBox);
    this._setupCode(setup);
  }

  content(content) {
    replaceChildren(this._codeBox, normalizeChildren(content));
    return this;
  }

  text(content) {
    return this.content(content);
  }

  language(value) {
    if (value === undefined) {
      return this.attr('data-language');
    }

    const language = value === null || value === undefined ? '' : String(value);
    this.attr('data-language', language || null);
    this._languageBadge.style('display', language ? null : 'none');
    replaceChildren(this._languageBadge, language ? normalizeChildren(language) : []);
    return this;
  }

  copyable(value = undefined) {
    if (value === undefined) {
      return this.getBooleanState('copyable');
    }

    const enabled = Boolean(value);
    this.setState('copyable', enabled);
    this.attr('data-copyable', enabled ? 'true' : null);
    this._copyButton.style('display', enabled ? null : 'none');
    return this;
  }

  copyLabel(value) {
    if (value === undefined) {
      return this._copyButton.textContent();
    }

    replaceChildren(this._copyButton, normalizeChildren(value ?? '复制'));
    return this;
  }

  async copy() {
    const text = this._codeBox.textContent();

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
    } catch {
      // Copy should fail softly in unsupported contexts.
    }

    return text;
  }

  _setupCode(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const { children, content, copyLabel, copyable, language, text, ...elementConfig } = setup;

      if (Object.keys(elementConfig).length > 0) {
        this.setup(elementConfig);
      }

      if (language !== undefined) {
        this.language(language);
      }

      if (copyLabel !== undefined) {
        this.copyLabel(copyLabel);
      }

      if (copyable !== undefined) {
        this.copyable(copyable);
      }

      if (content !== undefined) {
        this.content(content);
      } else if (text !== undefined) {
        this.content(text);
      } else if (children !== undefined) {
        this.content(children);
      }

      return;
    }

    this.content(setup);
  }
}

export function vCode(first = null, second = null, third = null) {
  return createComponentFactory(VCode, first, second, third);
}
