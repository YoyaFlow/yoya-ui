import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VGlowButton, vGlowButton } from './glow-button.js';
import { VTransition, vTransition } from './transition.js';

const effectsFactories = {
  vGlowButton,
  vTransition
};

registerChildFactories(HtmlElementNode, effectsFactories);

export { VGlowButton, vGlowButton, VTransition, vTransition };
