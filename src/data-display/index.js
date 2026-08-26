import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VAvatar, vAvatar } from './avatar.js';
import { VBadge, vBadge } from './badge.js';
import { VCode, vCode } from './code.js';
import { VDetail, VDetailItem, vDetail, vDetailItem } from './detail.js';
import { VPagination, vPagination } from './pagination.js';
import { VProgress, vProgress } from './progress.js';
import {
  VCard,
  VCardBody,
  VCardFooter,
  VCardHeader,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader
} from './surface.js';
import { VTable, vTable } from './table.js';
import { VTree, VTreeNode, vTree, vTreeNode } from './tree.js';
import { VScroll, vScroll } from './vscroll.js';

const dataDisplayFactories = {
  vAvatar,
  vBadge,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vCode,
  vDetail,
  vDetailItem,
  vPagination,
  vProgress,
  vScroll,
  vTable,
  vTree
};

registerChildFactories(HtmlElementNode, dataDisplayFactories);

export {
  VAvatar,
  VBadge,
  VCard,
  VCardBody,
  VCardFooter,
  VCardHeader,
  VCode,
  VDetail,
  VDetailItem,
  VPagination,
  VProgress,
  VScroll,
  VTable,
  VTree,
  VTreeNode,
  vAvatar,
  vBadge,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vCode,
  vDetail,
  vDetailItem,
  vPagination,
  vProgress,
  vScroll,
  vTable,
  vTree,
  vTreeNode
};

export { CodeBlock, codeBlock } from './code-block.js';
export { VChart, vChart } from './chart.js';
