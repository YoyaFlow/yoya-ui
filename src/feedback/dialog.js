import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { button, dialog as dialogTag, div } from '../html/index.js';
import { createComponentShortcut, setupContentSlot } from '../components/shared.js';

/**
 * 对话框（形态 B；2026-09-24 按 `VBadge` 的写法规格（R1–R12）重写）。
 *
 * 判据 ②（16 号第 96 条）：这个组件要的是**原生元素 API**（`<dialog>` 的 `showModal` / `close`，
 * 以及"不支持 showModal 时退化成 `open` 属性"的分支）——闭包 + 视图根句柄就够，**不需要类**：
 *
 * - 状态（`open` / `closable` / `onClose`）都在闭包里；根上的 `data-open` / `data-closable`
 *   与面板的 `aria-hidden` 都是读值绑定（R4 / R6），命令只写状态；
 * - **原生 API 的收口**：`open(true)` 走 `showModal()`（不支持 / 还没落地 / 还没连上 DOM 时排队重试一次），
 *   `close()` 走原生 `close()`；`open` 属性跟着原生调用写，退化环境下的显隐交给 CSS 的
 *   `[vn~='VDialog']:not([open])` 规则（原来是在 JS 里写行内 `display`，R5 搬进皮肤）；
 * - **内容位保留一个取用器**（`content(setup)` 收构建回调 / 节点 / 文本，且是运行期可替换的口径，
 *   见 16 号第 103 条）——与 `VAnchorItem` 的子列表同口径：要装多个子节点时才留取用器；
 * - props 进参数表、`...rest` 摊进根元素工厂；位置参数的字符串 / 数字 = 内容位
 *   （迁移前 `_setupDialog` 的兜底分支同口径）。
 */
export function VDialog({ children, closable, content, onClose, open, ...rest } = {}) {
  // 状态是句柄原样 / 普通值包 ref，归一放在读时的派生上（R9）
  const openState = ref(false);
  const closableState = asSignal(closable);
  const closeHandler = ref(typeof onClose === 'function' ? onClose : null);
  const closableValue = computed(() =>
    closableState.value === undefined ? true : Boolean(closableState.value)
  );

  let view = null; // 视图根（`<dialog>`）
  let pendingOpenSync = false;

  return vNode((api) => {
    /** 视图根的**真 DOM**：只读判定"建没建"，不提前 `renderDom()`（同上一条的口径）。 */
    const element = () => view?._el ?? null;

    const isModal = (el) => {
      if (!el || typeof el.matches !== 'function') {
        return false;
      }

      try {
        return el.matches(':modal');
      } catch {
        return false;
      }
    };

    /** 落地之后再开一次（迁移前节点类型用 `renderDom()` 钩子做这件事，同口径）。 */
    const scheduleOpenSync = () => {
      if (pendingOpenSync) {
        return;
      }

      pendingOpenSync = true;
      queueMicrotask(() => {
        pendingOpenSync = false;

        if (openState.value) {
          openElement({ defer: false });
        }
      });
    };

    /** 开：原生 `showModal` 优先；不支持时只写 `open` 属性（显隐归 CSS 规则）。 */
    const openElement = ({ defer = true } = {}) => {
      const el = element();

      if (!el) {
        // 还没落地：记下"要开"，渲染之后再补一次
        if (defer) {
          scheduleOpenSync();
        }
        return;
      }

      if (typeof el.showModal !== 'function') {
        view.attr('open', true);
        return;
      }

      if (!el.isConnected) {
        if (defer) {
          scheduleOpenSync();
        }
        return;
      }

      try {
        // 非模态的 `open`（例如 SSR 直出的那份）先摘掉，才能走 showModal
        if (el.open && !isModal(el)) {
          view.attr('open', null);
        }

        if (!el.open) {
          el.showModal();
        }

        view.attr('open', true);
      } catch {
        view.attr('open', true);
      }
    };

    /** 关：原生 `close` 优先；不支持时只摘 `open` 属性（CSS 规则负责隐藏）。 */
    const closeElement = () => {
      const el = element();

      if (el && typeof el.close === 'function') {
        try {
          if (el.open) {
            el.close();
          }
        } catch {
          // 忽略不支持的关闭行为
        }
      }

      view?.attr('open', null);
    };

    api.open = (value = true) => {
      const enabled = Boolean(value);
      const wasOpen = openState.value;

      openState.value = enabled;

      if (enabled) {
        openElement();
      } else {
        if (wasOpen && typeof closeHandler.value === 'function') {
          closeHandler.value();
        }
        closeElement();
      }

      return api;
    };

    api.close = () => api.open(false);

    // 读写分离：跨组件只读判断走这个入口（票 02 方案 c）
    api.isOpen = () => openState.value;

    api.onClose = (handler) => {
      if (handler === undefined) {
        return closeHandler.value;
      }

      closeHandler.value = typeof handler === 'function' ? handler : null;
      return api;
    };

    api.closable = (value) => {
      if (value === undefined) {
        return closableValue.value;
      }

      closableState.value = value;
      return api;
    };

    /** 位置参数：字符串 / 数字 = 内容位（迁移前 `_setupDialog` 的兜底分支同口径）。 */
    api.setupString = (value) => api.content(value);

    if (closable !== undefined) {
      api.closable(closable);
    }

    if (onClose !== undefined) {
      api.onClose(onClose);
    }

    const initialContent = content ?? children;

    // 结构（R2）：整棵树写在 return 里；状态类属性是读值绑定（R4 / R6）
    return dialogTag(
      {
        ...rest,
        'aria-modal': 'true',
        'data-closable': computed(() => (closableValue.value ? null : 'false')),
        'data-open': computed(() => (openState.value ? 'true' : null)),
        role: 'dialog',
        vn: 'VDialog'
      },
      (root) => {
        view = root;

        // 原生对话框自己的事件：Esc（cancel）与原生 close 都落到同一份状态上
        root.on('cancel', (event) => {
          event.preventDefault();
          api.close();
        });
        root.on('close', () => {
          openState.value = false;
          view.attr('open', null);
        });

        root.child(
          // 头部：`closable(false)` 时整行由 CSS 关掉（`data-closable='false'` 规则）
          div({ vn: 'VDialogHeader' }, (header) => {
            header.child(
              button(
                { attrs: { 'aria-label': '关闭', type: 'button' }, vn: 'VDialogClose' },
                (box) => {
                  box.child('×');
                  box.on('click', () => api.close());
                }
              )
            );
          }),

          // 内容位：`content(setup)` 是运行期可替换的取用器（无参 = 读当前内容）
          div({ vn: 'VDialogContent' }, (box) => {
            api.content = (value) => {
              if (value === undefined) {
                return box.children();
              }

              setupContentSlot(box, value);
              return api;
            };

            if (initialContent !== undefined) {
              api.content(initialContent);
            }
          })
        );

        if (open !== undefined) {
          api.open(open);
        }
      }
    );
  });
}

export const vDialog = createComponentShortcut(VDialog, { props: true });
