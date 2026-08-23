import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import {
  VMenu,
  VMenuDivider,
  VMenuGroup,
  VMenuItem,
  VSidebar,
  VSubMenu,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vSidebar,
  vSubMenu
} from './menu.js';
import { VNavbar, vNavbar } from './navbar.js';

const navigationFactories = {
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vNavbar,
  vSidebar,
  vSubMenu
};

registerChildFactories(HtmlElementNode, navigationFactories);

export {
  VMenu,
  VMenuDivider,
  VMenuGroup,
  VMenuItem,
  VNavbar,
  VSidebar,
  VSubMenu,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vNavbar,
  vSidebar,
  vSubMenu
};
