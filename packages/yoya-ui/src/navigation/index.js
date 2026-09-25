import { registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { HtmlElementNode } from '@yoyaflow/yoya-core/html';
import { VAnchor, VAnchorItem, vAnchor, vAnchorItem } from './anchor.js';
import { VBreadcrumb, VBreadcrumbItem, vBreadcrumb, vBreadcrumbItem } from './breadcrumb.js';
import {
  VMenu,
  VMenuDivider,
  VMenuGroup,
  VMenuItem,
  VMenuWrapper,
  VSidebar,
  VSubMenu,
  vMenu,
  vMenuDivider,
  vMenuGroup,
  vMenuItem,
  vSidebar,
  vSubMenu,
  vMenuWrapper
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
  vMenuWrapper,
  vNavbar,
  vSidebar,
  vStep,
  vSteps,
  vSubMenu,
  vTabs
};

registerChildFactories(HtmlElementNode, navigationFactories);

export {
  VAnchor,
  VAnchorItem,
  VBreadcrumb,
  VBreadcrumbItem,
  VMenu,
  VMenuDivider,
  VMenuGroup,
  VMenuItem,
  VMenuWrapper,
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
  vMenuWrapper,
  vNavbar,
  vSidebar,
  vStep,
  vSteps,
  vSubMenu,
  vTab,
  vTabs
};
