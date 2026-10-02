/**
 * 包出口 = 本仓全部组件族 + 装载面。
 *
 * - 宿主（GenUI / genui-mcp）读 `kit.json` 的 `runtime.entry`（构建产物 `dist/yoya.kit.js`）
 *   与 `runtime.export`（下面的 `kitPlugin`），一次 `GenUI.use(kitPlugin)` 装全部组件；
 * - 只要其中一族时可分别用各族的插件（如 `demoKitPlugin`），
 *   或者按名字取单个工厂自己组插件收窄能力面。
 */
import {
  KIT_NAMESPACE,
  KIT_VERSION,
  demoKitComponents,
  demoKitPlugin
} from '../components/demo-kit/impl.js';

export * from '../components/demo-kit/impl.js';

/** 全部组件表（catalog / 测试用）。 */
export const kitComponents = { ...demoKitComponents };

export const KIT_COMPONENT_NAMES = Object.keys(kitComponents);

/** kit.json 的 runtime.export：一个入口注册全部组件族。 */
export const kitPlugin = {
  id: `${KIT_NAMESPACE}@${KIT_VERSION}`,
  install(api) {
    demoKitPlugin.install(api);
  }
};

export default kitComponents;
