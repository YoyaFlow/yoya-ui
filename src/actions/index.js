import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VButton, vButton } from './button.js';
import { VButtons, vButtons } from './buttons.js';
import { VContextMenu, vContextMenu } from './context-menu.js';
import { VDropdownMenu, vDropdownMenu } from './dropdown-menu.js';
import { VFloatButton, vFloatButton } from './float-button.js';

const actionFactories = {
  vButton,
  vButtons,
  vContextMenu,
  vDropdownMenu,
  vFloatButton
};

registerChildFactories(HtmlElementNode, actionFactories);

export {
  VButton,
  VButtons,
  VContextMenu,
  VDropdownMenu,
  VFloatButton,
  vButton,
  vButtons,
  vContextMenu,
  vDropdownMenu,
  vFloatButton
};
