import type {
  ComponentNode,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput
} from './core.js';
import type { HtmlElementNode } from './html.js';

/** Minimal ECharts module shape accepted by echartsLib(). */
export interface EChartsLib {
  init(element: HTMLElement, theme?: unknown, opts?: unknown): unknown;
  [key: string]: any;
}

/** `vEchart({ … })` 的 props（句柄 props 是活值；`echartsLib` 注入模块命名空间）。 */
export interface EChartOptions {
  echartsLib?: EChartsLib;
  width?: PropValue<number | string>;
  height?: PropValue<number | string>;
  option?: Record<string, any>;
  theme?: PropValue<string>;
  renderer?: PropValue<'canvas' | 'svg' | string>;
  devicePixelRatio?: PropValue<number>;
  autoResize?: PropValue<boolean>;
  loading?: PropValue<boolean>;
  loadingText?: PropValue<string>;
  onChartReady?: (chart: unknown) => void;
  onChartResize?: (width: number, height: number) => void;
  [key: string]: unknown;
}

/** ECharts component (the echarts library itself is not bundled). */
export interface VEchart extends ComponentNode {
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

export const VEchart: { (props?: EChartOptions): VEchart };

export const vEchart: ElementFactory<VEchart> & {
  (first?: EChartOptions | SetupInput<VEchart> | null, callback?: SetupCallback<VEchart>): VEchart;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface ChartParentShortcuts {
  vEchart(
    first?: EChartOptions | SetupInput<VEchart> | null,
    callback?: SetupCallback<VEchart>
  ): VEchart;
}

export type { ElementOptions };
