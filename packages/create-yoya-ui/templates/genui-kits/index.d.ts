/**
 * kit 的类型面：给宿主与使用方看"这个 kit 提供哪些组件、props 长什么样"。
 *
 * 组件工厂统一是 GenUI 的 element 形态：`(props, place)` —— props 是 JSON（含活值句柄），
 * `place` 是内容落位回调（GenUI 把 `children` 渲染好后交给组件自己放）。
 */

/** 任意组件都收的透传通道（与 yoya 元素工厂同款）。 */
export interface KitElementPassthrough {
  id?: string;
  class?: string;
  attrs?: Record<string, string | number | boolean | null>;
  style?: Record<string, string | number | null>;
  /** 视图根结构里写 `vn: 'VXxx'` —— 身份既是对象事实，也落到真 DOM。 */
  vn?: string;
}

/** 面板：标题 / 说明 / 内容位。 */
export interface PanelKitProps extends KitElementPassthrough {
  title?: string;
  description?: string;
  /** 色调：neutral（默认）/ info / success / warning。 */
  tone?: string;
}

/** 指标卡：标签 + 数值（可活值）+ 单位 + 趋势。 */
export interface MetricKitProps extends KitElementPassthrough {
  label?: string;
  value?: string | number;
  unit?: string;
  /** up / down / flat。 */
  trend?: string;
  tone?: string;
}

/** 徽标：把 yoya-ui 的 `vBadge` 包成 JSON 面，计数 / 状态可绑活值。 */
export interface BadgeKitProps extends KitElementPassthrough {
  count?: string | number;
  dot?: boolean;
  overflowCount?: number;
  showZero?: boolean;
  status?: 'success' | 'processing' | 'error' | 'warning' | 'default';
  text?: string;
  /** `text` 的别名。 */
  label?: string;
}

export type KitComponentFactory<Props = Record<string, unknown>> = (
  props?: Props,
  place?: (view: unknown) => void
) => unknown;

export declare const KIT_NAMESPACE: string;
export declare const KIT_VERSION: string;
export declare const PanelKit: KitComponentFactory<PanelKitProps>;
export declare const MetricKit: KitComponentFactory<MetricKitProps>;
export declare const BadgeKit: KitComponentFactory<BadgeKitProps>;
export declare const demoKitComponents: Record<string, KitComponentFactory>;
export declare const demoKitPlugin: KitPlugin;
export declare const kitComponents: Record<string, KitComponentFactory>;
export declare const KIT_COMPONENT_NAMES: string[];
export declare const kitPlugin: KitPlugin;

/** GenUI 插件面（`GenUI.use(plugin)` 认 id + install）。 */
export interface KitPlugin {
  id: string;
  install(api: unknown): unknown;
}

declare const defaultComponents: Record<string, KitComponentFactory>;
export default defaultComponents;
