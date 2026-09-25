import { registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { HtmlElementNode } from '@yoyaflow/yoya-core/html';
import { VGlowButton, vGlowButton } from './glow-button.js';
import { VTransition, vTransition } from './transition.js';

const effectsFactories = {
  vGlowButton,
  vTransition
};

registerChildFactories(HtmlElementNode, effectsFactories);

export { VGlowButton, vGlowButton, VTransition, vTransition };
