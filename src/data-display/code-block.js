import { VCode } from './code.js';
import { ElementNode, registerChildFactories } from '../core/index.js';
import { createComponentFactory } from '../components/shared.js';

export class CodeBlock extends VCode {
  constructor(setup = null) {
    super(setup);
    this.className('yoya-code-block');
  }
}

export function codeBlock(first = null, second = null, third = null) {
  return createComponentFactory(CodeBlock, first, second, third);
}

registerChildFactories(ElementNode, { codeBlock });
