import type { ElementFactory, ElementOptions, SetupCallback, SetupInput } from './core.js';
import type { HtmlElementNode } from './html.js';

/** Minimal ECharts module shape accepted by echartsLib(). */
export interface EChartsLib {
  init(element: HTMLElement, theme?: unknown, opts?: unknown): unknown;
  [key: string]: any;
}

/** ECharts component (the echarts library itself is not bundled). */
export class VEchart extends HtmlElementNode {
  echartsLib(lib: EChartsLib): VEchart;
  option(value: Record<string, any>): VEchart;
  width(): number | string;
  width(value: number | string): VEchart;
  height(): number | string;
  height(value: number | string): VEchart;
  theme(value: string): VEchart;
  renderer(value: 'canvas' | 'svg' | string): VEchart;
  devicePixelRatio(value: number): VEchart;
  autoResize(value: boolean): VEchart;
  loading(value: boolean, text?: string): VEchart;
  onChartReady(callback: (chart: unknown) => void): VEchart;
  onChartResize(callback: (width: number, height: number) => void): VEchart;
  getChartInstance(): unknown;
  resize(opts?: { width?: number | string; height?: number | string }): VEchart;
  clear(): VEchart;
  dispose(): VEchart;
}

export const vEchart: ElementFactory<VEchart> & {
  (first?: SetupInput<VEchart> | null, callback?: SetupCallback<VEchart>): VEchart;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface ChartParentShortcuts {
  vEchart(first?: SetupInput<VEchart> | null, callback?: SetupCallback<VEchart>): VEchart;
}

export type { ElementOptions };
