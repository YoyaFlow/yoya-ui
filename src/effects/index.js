import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VGlowButton, vGlowButton } from './glow-button.js';

const effectsFactories = {
  vGlowButton
};

registerChildFactories(HtmlElementNode, effectsFactories);

export { VGlowButton, vGlowButton };
