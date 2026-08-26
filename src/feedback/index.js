import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VMessage, VMessageContainer, toast, vMessage, vMessageContainer } from './message.js';
import { vDialog } from './dialog.js';
import { VTooltip, vTooltip } from './tooltip.js';

const feedbackFactories = {
  vDialog,
  vMessage,
  vMessageContainer,
  vTooltip
};

registerChildFactories(HtmlElementNode, feedbackFactories);

export { VMessageManager, vMessageManager } from './message-manager.js';
export { VDialog, vDialog } from './dialog.js';
export { VMessage, VMessageContainer, toast, vMessage, vMessageContainer };
export { VTooltip, vTooltip };
