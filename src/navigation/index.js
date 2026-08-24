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
import { VStep, VSteps, vStep, vSteps } from './steps.js';

const navigationFactories = {
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vNavbar,
  vSidebar,
  vStep,
  vSteps,
  vSubMenu
};

registerChildFactories(HtmlElementNode, navigationFactories);

export {
  VMenu,
  VMenuDivider,
  VMenuGroup,
  VMenuItem,
  VNavbar,
  VStep,
  VSteps,
  VSidebar,
  VSubMenu,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vNavbar,
  vSidebar,
  vStep,
  vSteps,
  vSubMenu
};
