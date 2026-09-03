import { vDialog } from './dialog.js';
import { vButton } from '../actions/button.js';
import { vstack } from '../layout/index.js';
import { HtmlElementNode } from '../html/index.js';
import { createFocusTrap } from '../core/a11y.js';

/**
 * 命令式确认弹窗：vConfirm(options) -> Promise<boolean>。
 * SSR 下安全返回 resolved false，不渲染任何 DOM。
 */
export function vConfirm(options = {}) {
  const {
    title,
    content = '',
    confirmText = '确定',
    cancelText = '取消',
    danger = false,
    onConfirm = null,
    onCancel = null
  } = options || {};

  if (typeof document === 'undefined') {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let settled = false;
    let confirming = false;

    const finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      trap.destroy();
      dialog.close();
      dialog.destroy();
      if (result && typeof onConfirm === 'function') {
        onConfirm();
      }
      if (!result && typeof onCancel === 'function') {
        onCancel();
      }
      resolve(result);
    };

    const confirmButton = vButton(confirmText, (button) => {
      button.variant(danger ? 'danger' : 'primary');
      button.on('click', () => {
        if (confirming || settled) {
          return;
        }
        const decided = onConfirm ? onConfirm() : true;
        if (decided && typeof decided.then === 'function') {
          confirming = true;
          button.loading(true);
          Promise.resolve(decided).then((ok) => {
            confirming = false;
            button.loading(false);
            if (ok === false) {
              return;
            }
            finish(true);
          });
        } else if (decided === false) {
          return;
        } else {
          finish(true);
        }
      });
    });

    const cancelButton = vButton(cancelText, (button) => {
      button.variant('secondary');
      button.on('click', () => finish(false));
    });

    const message = new HtmlElementNode('div')
      .className('yoya-vconfirm-content')
      .child(title ? new HtmlElementNode('div').className('yoya-vconfirm-title').text(title) : null)
      .child(new HtmlElementNode('div').className('yoya-vconfirm-message').text(content));

    const actions = vstack({ direction: 'row', gap: '8px', justify: 'flex-end' }, (row) => {
      row.child(confirmButton, cancelButton);
    });

    const dialog = vDialog((d) => {
      d.content(vstack({ gap: '14px' }).child(message, actions));
      d.onClose(() => finish(false));
    });

    dialog.bindTo(document.body);
    dialog.open(true);
    const trap = createFocusTrap(dialog.renderDom(), { onEscape: () => finish(false) });
    trap.activate();
  });
}
