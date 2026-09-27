import { createComponentShortcut } from '../shared.js';

import { div } from '@yoyaflow/yoya-core/html';

export function VPlain({ value, disabled } = {}) {
  return div({
    vn: 'VPlain',
    attrs: { 'data-value': value ?? null, 'data-disabled': String(Boolean(disabled)) }
  });
}

export const vPlain = createComponentShortcut(VPlain);
