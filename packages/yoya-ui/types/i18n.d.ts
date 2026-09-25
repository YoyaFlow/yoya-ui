import type {
  ComponentNode,
  ChildInput,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput
} from '@yoyaflow/yoya-core/internal/types/core.js';
import type { I18n } from '@yoyaflow/yoya-core/internal/types/tools.js';
import type { VDropdownMenu } from './actions.js';

export interface LanguageOption {
  label?: ChildInput;
  value: string;
  disabled?: boolean;
  [key: string]: unknown;
}

export type LanguageSwitchSize = 'small' | 'medium' | 'large';
export type LanguageSwitchVariant = 'primary' | 'secondary';

/** `vLanguageSwitch({ … })` 的 props（句柄 props 是活值）。 */
export interface LanguageSwitchOptions {
  /** 绑定的 I18n 实例（默认用全局 `i18n`）。 */
  locale?: I18n;
  languages?: PropValue<Array<string | [string, string] | LanguageOption>>;
  ariaLabel?: ChildInput;
  size?: PropValue<LanguageSwitchSize>;
  variant?: PropValue<LanguageSwitchVariant>;
  onChange?: (option: LanguageOption, locale: I18n) => void;
  [key: string]: unknown;
}

/** 语言切换句柄：自己的命令面 + 引擎委托的元素面 / 子工厂（见 `ComponentNode`）。 */
export interface VLanguageSwitch extends ComponentNode {
  activeLanguage(): string;
  ariaLabel(): string;
  ariaLabel(value: ChildInput): VLanguageSwitch;
  change(handler: (option: LanguageOption, locale: I18n) => void): VLanguageSwitch;
  onChange(handler: (option: LanguageOption, locale: I18n) => void): VLanguageSwitch;
  languages(): LanguageOption[];
  languages(value: Array<string | [string, string] | LanguageOption>): VLanguageSwitch;
  locale(): I18n;
  locale(value: I18n): VLanguageSwitch;
  size(): LanguageSwitchSize;
  size(value: LanguageSwitchSize): VLanguageSwitch;
  variant(): LanguageSwitchVariant;
  variant(value: LanguageSwitchVariant): VLanguageSwitch;
}

/** @deprecated 旧名（对象组件时代的叫法），等同 `VLanguageSwitch`。 */
export type LanguageSwitchComponent = VLanguageSwitch;

/** 语言切换组件定义函数：直接参数 = props。 */
export const VLanguageSwitch: { (props?: LanguageSwitchOptions): VLanguageSwitch };

/** Creates a language switch bound to an I18n instance. */
export function vLanguageSwitch(
  first?: LanguageSwitchOptions | SetupInput<VLanguageSwitch> | null,
  callback?: SetupCallback<VLanguageSwitch>
): VLanguageSwitch;

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface I18nParentShortcuts {
  vLanguageSwitch(
    first?: LanguageSwitchOptions | SetupInput<VLanguageSwitch> | null,
    callback?: SetupCallback<VLanguageSwitch>
  ): VLanguageSwitch;
}

export type { ElementFactory };

// 组件域把父快捷方法**并入** core 的节点接口（票 06 硬点 1）：core 的声明不再 import 组件，
// 增强在组件包自己的类型被引入时生效——与运行期"组件包被 import 时 registerChildFactories"同向。
declare module '@yoyaflow/yoya-core/html' {
  interface HtmlElementNode extends I18nParentShortcuts {}
}
