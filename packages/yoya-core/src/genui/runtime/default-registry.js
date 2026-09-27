/**
 * 默认注册表：**组件无关**——只登记 core 命名空间（HTML / SVG），不装任何组件库。
 * 组件由宿主显式 `GenUI.use(库的插件)` 提供（生成方 JSON 只能引用已装的名字）。
 */
import { createComponentRegistry } from './registry.js';
import { coreComponents } from './core-components.js';

export function createDefaultRegistry() {
  const registry = createComponentRegistry();
  registry.registerCore(coreComponents);
  return registry;
}
