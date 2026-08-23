import { registerChildFactories } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import { VCode, vCode } from './code.js';
import { VDetail, VDetailItem, vDetail, vDetailItem } from './detail.js';
import { VPagination, vPagination } from './pagination.js';
import { VCard, VCardBody, VCardFooter, VCardHeader, vCard, vCardBody, vCardFooter, vCardHeader } from './surface.js';
import { VTable, vTable } from './table.js';

const dataDisplayFactories = {
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vCode,
  vDetail,
  vDetailItem,
  vPagination,
  vTable
};

registerChildFactories(HtmlElementNode, dataDisplayFactories);

export {
  VCard,
  VCardBody,
  VCardFooter,
  VCardHeader,
  VCode,
  VDetail,
  VDetailItem,
  VPagination,
  VTable,
  vCard,
  vCardBody,
  vCardFooter,
  vCardHeader,
  vCode,
  vDetail,
  vDetailItem,
  vPagination,
  vTable
};

export { CodeBlock, codeBlock } from './code-block.js';
export { VChart, vChart } from './chart.js';
