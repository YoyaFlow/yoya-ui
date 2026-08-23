import { HtmlElementNode } from '../html/index.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory
} from '../components/shared.js';

export class VCard extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className(componentClass, 'yoya-vcard');
    this.styles({
      background: '#ffffff',
      border: '1px solid #d8dee8',
      borderRadius: '8px',
      boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
      color: '#111827',
      overflow: 'hidden'
    });
    applyComponentSetup(this, setup);
  }
}

export class VCardHeader extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-vcard-header');
    this.styles({
      borderBottom: '1px solid #e5e7eb',
      fontWeight: '700',
      padding: '12px 16px'
    });
    applyComponentSetup(this, setup);
  }
}

export class VCardBody extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-vcard-body');
    this.styles({
      padding: '16px'
    });
    applyComponentSetup(this, setup);
  }
}

export class VCardFooter extends HtmlElementNode {
  constructor(setup = null) {
    super('div', null);
    this.className('yoya-vcard-footer');
    this.styles({
      alignItems: 'center',
      background: '#f8fafc',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end',
      padding: '12px 16px'
    });
    applyComponentSetup(this, setup);
  }
}

export function vCard(first = null, second = null, third = null) {
  return createComponentFactory(VCard, first, second, third);
}

export function vCardHeader(first = null, second = null, third = null) {
  return createComponentFactory(VCardHeader, first, second, third);
}

export function vCardBody(first = null, second = null, third = null) {
  return createComponentFactory(VCardBody, first, second, third);
}

export function vCardFooter(first = null, second = null, third = null) {
  return createComponentFactory(VCardFooter, first, second, third);
}
