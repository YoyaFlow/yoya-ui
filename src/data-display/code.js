import { asSignal, computed } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { ViewNode, vText } from '../core/index.js';
import { button, code as codeBox, div, pre, span } from '../html/index.js';
import { createComponentShortcut, resolveTextValue } from '../components/shared.js';

const DEFAULT_COPY_LABEL = '复制';

/**
 * 代码块（形态 B，照 `AGENTS.md`「Component Writing Rules」R1–R12 写）。
 *
 * - 一个业务组件函数 = 一个边界（R1）；整棵树写在最后那个 `return` 里（R2）。
 * - props 在参数表里解构、`...rest` 摊进根元素工厂（R3）；`attrs` / `style` 是显式通道（R4）。
 * - **静态样式全在 `yoya.ui.css`**（R5）：外壳 / 工具条 / 语言徽标 / 代码区都不再写行内样式；
 *   显隐这类状态几何写 `[data-language]` / `[data-copyable]` 规则。
 * - **数据驱动**（R6 / R9）：`content` / `text` / `language` / `copyable` / `copyLabel` 给句柄就是活值；
 *   命令只写状态，视图走读值绑定。
 * - **节点内容只在构建期落位**：`content()` / `text()` 只收文本，节点内容走 props。
 */
export function VCode({
  children,
  content,
  copyLabel,
  copyable = true,
  language = null,
  text,
  ...rest
} = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;
  // `attrs` 里直写 `data-language` 也算设置语言：语言只有这一份真源（徽标显隐跟着它走）
  const languageState = asSignal(language ?? restAttrs?.['data-language'] ?? null);
  const copyableState = asSignal(copyable);
  const copyLabelState = asSignal(copyLabel ?? DEFAULT_COPY_LABEL);

  const languageValue = computed(() => languageState.value || null);
  const languageText = computed(() => languageValue.value ?? '');
  const copyableValue = computed(() => Boolean(copyableState.value));
  const copyLabelText = computed(() => copyLabelState.value ?? DEFAULT_COPY_LABEL);

  // 内容位只有一处：节点在构建期落位，文本 / 句柄是活值（`content` / `text` 写同一份数据）
  const initial = content ?? text ?? children ?? null;
  const contentNode = initial instanceof ViewNode ? initial : null;
  const contentValue = asSignal(contentNode === null ? initial : null);
  const contentText = computed(() =>
    contentNode === null ? resolveTextValue(contentValue.value) : resolveTextValue(contentNode)
  );

  return vNode((api) => {
    /** 内容命令：只写数据（`content` / `text` 迁移前同义）。 */
    const writeContent = (next) => {
      if (next instanceof ViewNode) {
        throw new TypeError(
          'vCode 的内容命令只收文本：节点内容请在构建期用 props（content / text / children）给。'
        );
      }

      contentValue.value = next ?? null;
      return api;
    };
    const contentCommand = (next) => (next === undefined ? contentValue.value : writeContent(next));

    api.content = contentCommand;
    api.text = contentCommand;

    api.language = (next) => {
      if (next === undefined) {
        return languageValue.value;
      }

      languageState.value = next === null ? '' : String(next);
      return api;
    };

    api.copyable = (next) => {
      if (next === undefined) {
        return copyableValue.value;
      }

      copyableState.value = Boolean(next);
      return api;
    };

    api.copyLabel = (next) => {
      if (next === undefined) {
        return copyLabelText.value;
      }

      copyLabelState.value = next ?? DEFAULT_COPY_LABEL;
      return api;
    };

    /** 复制内容：读的是**数据**（不回头读 DOM），与迁移前 `_codeBox.textContent()` 同结果。 */
    api.copy = async () => {
      const value = contentNode === null ? contentValue.value : contentNode;
      const text = resolveTextValue(value);

      try {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
      } catch {
        // Copy should fail softly in unsupported contexts.
      }

      return text;
    };

    /** 位置参数：字符串 / 数字 = 内容（迁移前 `_setupCode` 的兜底分支同口径）。 */
    api.setupString = (next) => writeContent(next);

    // 结构（R2）：一棵树写在 return 里；属性 / 样式在工厂参数里（R4），子节点在回调里往下嵌
    return div(
      {
        ...elementConfig,
        attrs: restAttrs ?? {},
        'data-copyable': computed(() => (copyableValue.value ? 'true' : null)),
        'data-language': languageValue,
        style: restStyle ?? {},
        vn: 'VCode'
      },
      (root) => {
        root.child(
          div({ vn: 'VCodeToolbar' }, (bar) => {
            bar.child(
              // 语言徽标：显隐走 `[data-language]` 规则（CSS），文本是活值
              span({ vn: 'VCodeLanguage' }, (badge) =>
                badge.child(
                  vText(languageText).mountable(computed(() => languageText.value !== ''))
                )
              ),

              // 复制按钮：显隐走 `[data-copyable]` 规则（CSS）
              button(
                {
                  attrs: { 'aria-label': '复制代码', type: 'button' },
                  onClick: () => void api.copy(),
                  vn: 'VCodeCopy'
                },
                (copyButton) => copyButton.child(vText(copyLabelText))
              )
            );
          }),

          // 代码区：pre > code，内容与文本都是数据
          pre({ vn: 'VCodePre' }, (box) =>
            box.child(
              codeBox({ vn: 'VCodeContent' }, (textBox) => {
                if (contentNode !== null) {
                  textBox.child(contentNode);
                }
                textBox.child(
                  vText(contentText).mountable(computed(() => contentText.value !== ''))
                );
              })
            )
          )
        );
      }
    );
  });
}

export const vCode = createComponentShortcut(VCode, { props: true });
