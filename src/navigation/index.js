import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VAnchor, VAnchorItem, vAnchor, vAnchorItem } from './anchor.js';
import { VBreadcrumb, VBreadcrumbItem, vBreadcrumb, vBreadcrumbItem } from './breadcrumb.js';
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
import { VTab, VTabs, vTab, vTabs } from './tabs.js';

const navigationFactories = {
  vAnchor,
  vAnchorItem,
  vBreadcrumb,
  vBreadcrumbItem,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vNavbar,
  vSidebar,
  vStep,
  vSteps,
  vSubMenu,
  vTabs
};

registerChildFactories(HtmlElementNode, navigationFactories);
registerChildFactories(VTabs, { vTab });

export {
  VAnchor,
  VAnchorItem,
  VBreadcrumb,
  VBreadcrumbItem,
  VMenu,
  VMenuDivider,
  VMenuGroup,
  VMenuItem,
  VNavbar,
  VStep,
  VSteps,
  VTab,
  VTabs,
  VSidebar,
  VSubMenu,
  vAnchor,
  vAnchorItem,
  vBreadcrumb,
  vBreadcrumbItem,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vNavbar,
  vSidebar,
  vStep,
  vSteps,
  vSubMenu,
  vTab,
  vTabs
};
