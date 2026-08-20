import { VCode } from './components/index.js';
import { ElementNode, registerChildFactories } from './core/index.js';

export class CodeBlock extends VCode {
  constructor(setup = null) {
    super(setup);
    this.className('yoya-code-block');
  }
}

export function codeBlock(setup = null) {
  return setup instanceof CodeBlock ? setup : new CodeBlock(setup);
}

registerChildFactories(ElementNode, { codeBlock });
