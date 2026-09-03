import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VAvatar, vAvatar } from './avatar.js';
import { VDigitalBoard, VDigitalBoardItem, vDigitalBoard, vDigitalBoardItem } from './board.js';
import { VBadge, vBadge } from './badge.js';
import { VCarousel, vCarousel } from './carousel.js';
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
import {
  VTable,
  VTbody,
  VTd,
  VTfoot,
  VTh,
  VThead,
  VTr,
  vTable,
  vTbody,
  vTd,
  vTfoot,
  vTh,
  vThead,
  vTr
} from './table.js';
import { VTree, VTreeNode, vTree, vTreeNode } from './tree.js';
import { VTreeTable, vTreeTable } from './tree-table.js';
import { VGauge, vGauge } from './gauge.js';
import { VRingStat, vRingStat } from './ring-stat.js';
import { VSparkline, vSparkline } from './sparkline.js';
import { VTimeline, VTimelineItem, vTimeline, vTimelineItem } from './timeline.js';
import { VTrendCard, vTrendCard } from './trend-card.js';
import { VScroll, vScroll } from './vscroll.js';
import { VSuperTable, vSuperTable } from './super-table.js';
import { vTreeRanger, treeRanger, vTreeRangerColumn } from './tree-ranger.js';
import { VImagePreview, vImagePreview } from './image-preview.js';

const dataDisplayFactories = {
  vAvatar,
  vDigitalBoard,
  vDigitalBoardItem,
  vGauge,
  vRingStat,
  vSparkline,
  vTimeline,
  vTimelineItem,
  vTrendCard,
  vBadge,
  vCarousel,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vCode,
  vDetail,
  vDetailItem,
  vImagePreview,
  vPagination,
  vProgress,
  vScroll,
  vSuperTable,
  vTable,
  vTree,
  vTreeRanger
};

registerChildFactories(HtmlElementNode, dataDisplayFactories);

export {
  VAvatar,
  VBadge,
  VDigitalBoard,
  VDigitalBoardItem,
  VGauge,
  VImagePreview,
  VRingStat,
  VSparkline,
  VTimeline,
  VTimelineItem,
  VTrendCard,
  VCarousel,
  VCard,
  VCardBody,
  VCardFooter,
  VCardHeader,
  VCode,
  VDetail,
  VDetailItem,
  vImagePreview,
  VPagination,
  VProgress,
  VScroll,
  VSuperTable,
  VTable,
  VTbody,
  VTd,
  VTfoot,
  VTh,
  VThead,
  VTr,
  VTree,
  VTreeTable,
  VTreeNode,
  treeRanger,
  vAvatar,
  vBadge,
  vDigitalBoard,
  vDigitalBoardItem,
  vGauge,
  vRingStat,
  vSparkline,
  vTimeline,
  vTimelineItem,
  vTrendCard,
  vCarousel,
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
  vSuperTable,
  vTable,
  vTbody,
  vTd,
  vTfoot,
  vTh,
  vThead,
  vTr,
  vTree,
  vTreeTable,
  vTreeNode,
  vTreeRanger,
  vTreeRangerColumn
};

export { CodeBlock, codeBlock } from './code-block.js';
export { VChart, vChart } from './chart.js';



