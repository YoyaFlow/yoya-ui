import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VButton, vButton } from './button.js';
import { VContextMenu, vContextMenu } from './context-menu.js';
import { VDropdownMenu, vDropdownMenu } from './dropdown-menu.js';

const actionFactories = {
  vButton,
  vContextMenu,
  vDropdownMenu
};

registerChildFactories(HtmlElementNode, actionFactories);

export { VButton, VContextMenu, VDropdownMenu, vButton, vContextMenu, vDropdownMenu };
