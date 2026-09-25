import type {
  ComponentNode,
  ChildInput,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput,
  YoyaMode
} from './core.js';
import type { HtmlElementNode } from './html.js';

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
