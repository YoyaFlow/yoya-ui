import type {
  ChildInput,
  ElementFactory,
  ElementOptions,
  SetupCallback,
  SetupInput,
  YoyaMode
} from './core.js';
import type { HtmlElementNode } from './html.js';

export interface ThemeModeEntry {
  mode: YoyaMode;
  label?: ChildInput;
  icon?: unknown;
  [key: string]: any;
}

/** Theme light/dark/system mode switcher. */
export class VThemeModeSwitch extends HtmlElementNode {
  modes(): ThemeModeEntry[];
  modes(value: Array<YoyaMode | ThemeModeEntry>): VThemeModeSwitch;
  persist(): boolean;
  persist(value: boolean): VThemeModeSwitch;
  sync(): VThemeModeSwitch;
}

export const vThemeModeSwitch: ElementFactory<VThemeModeSwitch> & {
  (
    first?: SetupInput<VThemeModeSwitch> | null,
    callback?: SetupCallback<VThemeModeSwitch>
  ): VThemeModeSwitch;
};

/**
 * Parent-shortcut surface merged onto HtmlElementNode. vThemeModeSwitch is
 * registered on ElementNode and inherited, so it is declared there.
 */
export interface ThemeParentShortcuts {}

export type { ElementOptions, YoyaMode };
