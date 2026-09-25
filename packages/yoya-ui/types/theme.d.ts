import type {
  ComponentNode,
  ChildInput,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput,
  YoyaMode
} from '@yoyaflow/yoya-core/internal/types/core.js';
import type { HtmlElementNode } from '@yoyaflow/yoya-core/internal/types/html.js';

export interface ThemeModeEntry {
  mode: YoyaMode;
  label?: ChildInput;
  icon?: unknown;
  [key: string]: unknown;
}

/** `vThemeModeSwitch({ … })` 的 props。 */
export interface ThemeModeSwitchOptions {
  /** 模式子集（字符串 = 内置 light / dark / system）。 */
  modes?: PropValue<Array<YoyaMode | ThemeModeEntry>>;
  /** 是否持久化到 localStorage（默认 true）。 */
  persist?: PropValue<boolean>;
  [key: string]: unknown;
}

/** Theme light/dark/system mode switcher. */
export interface VThemeModeSwitch extends ComponentNode {
  modes(): YoyaMode[];
  modes(value: Array<YoyaMode | ThemeModeEntry>): VThemeModeSwitch;
  persist(): boolean;
  persist(value: boolean): VThemeModeSwitch;
  sync(): VThemeModeSwitch;
}

export const VThemeModeSwitch: { (props?: ThemeModeSwitchOptions): VThemeModeSwitch };

export const vThemeModeSwitch: ElementFactory<VThemeModeSwitch> & {
  (
    first?: ThemeModeSwitchOptions | SetupInput<VThemeModeSwitch> | null,
    callback?: SetupCallback<VThemeModeSwitch>
  ): VThemeModeSwitch;
};

/**
 * Parent-shortcut surface merged onto HtmlElementNode. vThemeModeSwitch is
 * registered on ElementNode and inherited, so it is declared there.
 */
export interface ThemeParentShortcuts {}

export type { ElementOptions, YoyaMode };

// 组件域把父快捷方法**并入** core 的节点接口（票 06 硬点 1）：core 的声明不再 import 组件，
// 增强在组件包自己的类型被引入时生效——与运行期"组件包被 import 时 registerChildFactories"同向。
declare module '@yoyaflow/yoya-core/html' {
  interface HtmlElementNode extends ThemeParentShortcuts {}
}

// 这几个快捷方法的返回类型属于本域（core 的声明里没有它们的位置）：
declare module '@yoyaflow/yoya-core' {
  interface ElementNode {
    /** vThemeModeSwitch shortcut: theme light/dark/system switcher. */
    vThemeModeSwitch(
      first?: import('@yoyaflow/yoya-core').SetupInput<VThemeModeSwitch> | null,
      options?: import('@yoyaflow/yoya-core').ElementOptions,
      callback?: import('@yoyaflow/yoya-core').SetupCallback<VThemeModeSwitch>
    ): VThemeModeSwitch;
  }
}
