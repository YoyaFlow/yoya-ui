import type { ElementFactory, ElementOptions, SetupCallback, SetupInput } from './core.js';
import type { HtmlElementNode } from './html.js';

/** Minimal Three.js module shape accepted by threeLib(). */
export interface ThreeLib {
  PerspectiveCamera: new (...args: any[]) => any;
  Scene: new (...args: any[]) => any;
  WebGLRenderer: new (options?: Record<string, any>) => ThreeRenderer;
  [key: string]: any;
}

/** Renderer surface used by the component. */
export interface ThreeRenderer {
  domElement: HTMLCanvasElement;
  dispose(): void;
  render(scene: any, camera: any): void;
  setPixelRatio(value: number): void;
  setSize(width: number, height: number): void;
}

/** Handed to onReady / onFrame callbacks after the renderer mounts. */
export interface ThreeInstanceApi {
  camera: any;
  renderer: ThreeRenderer;
  scene: any;
  threeLib: ThreeLib;
}

/** Reported by onResize callbacks. */
export interface ThreeResizeSize {
  height: number;
  width: number;
}

/** Three.js scene host (the three library itself is not bundled). */
export class VThree extends HtmlElementNode {
  threeLib(lib: ThreeLib): VThree;
  getThreeLib(): ThreeLib | null;
  scene(): any;
  scene(value: any): VThree;
  getScene(): any;
  camera(): any;
  camera(value: any): VThree;
  getCamera(): any;
  rendererOptions(): Record<string, any>;
  rendererOptions(value: Record<string, any>): VThree;
  width(): number | string;
  width(value: number | string): VThree;
  height(): number | string;
  height(value: number | string): VThree;
  devicePixelRatio(): number | null;
  devicePixelRatio(value: number | null): VThree;
  autoResize(): boolean;
  autoResize(value: boolean): VThree;
  autoRender(): boolean;
  autoRender(value: boolean): VThree;
  onReady(callback: (api: ThreeInstanceApi) => void): VThree;
  onResize(callback: (size: ThreeResizeSize) => void): VThree;
  onFrame(callback: (api: ThreeInstanceApi) => void): VThree;
  getRenderer(): ThreeRenderer | null;
  start(): VThree;
  stop(): VThree;
  render(): VThree;
  resize(): VThree;
  dispose(): VThree;
}

export const vThree: ElementFactory<VThree> & {
  (first?: SetupInput<VThree> | null, callback?: SetupCallback<VThree>): VThree;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface ThreeParentShortcuts {
  vThree(first?: SetupInput<VThree> | null, callback?: SetupCallback<VThree>): VThree;
}

export type { ElementOptions };
