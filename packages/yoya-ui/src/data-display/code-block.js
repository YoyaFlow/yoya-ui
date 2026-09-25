import { ElementNode, registerChildFactories } from '@yoyaflow/yoya-core/internal/core/index.js';
import { createComponentShortcut } from '../components/shared.js';
import { VCode } from './code.js';

/**
 * `CodeBlock` = 代码块的别名形态（历史 API）：同一棵树 + **多值身份** `CodeBlock VCode`
 * （与 `VSvgIconPickerDialog VDialog` / `VTimer VInput` 同一口径），样式与命令全部沿用 `VCode`。
 */
export function CodeBlock(props = {}) {
  return VCode(props).setup({ vn: 'CodeBlock VCode' });
}

export const codeBlock = createComponentShortcut(CodeBlock, { props: true });

registerChildFactories(ElementNode, { codeBlock });
