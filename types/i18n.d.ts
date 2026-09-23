import type {
  ChildInput,
  ElementFactory,
  ElementOptions,
  I18n,
  SetupCallback,
  SetupInput
} from './core.js';
import type { VDropdownMenu } from './actions.js';

export interface LanguageOption {
  label?: ChildInput;
  value: string;
  disabled?: boolean;
  [key: string]: any;
}

export type LanguageSwitchSize = 'small' | 'medium' | 'large';
export type LanguageSwitchVariant = 'primary' | 'secondary';

/** `vLanguageSwitch({ … })` 的 props（句柄 props 是活值）。 */
export interface LanguageSwitchOptions {
  /** 绑定的 I18n 实例（默认用全局 `i18n`）。 */
  locale?: I18n;
  languages?: Array<string | [string, string] | LanguageOption>;
  ariaLabel?: ChildInput;
  size?: LanguageSwitchSize;
  variant?: LanguageSwitchVariant;
  onChange?: (option: LanguageOption, locale: I18n) => void;
  [key: string]: unknown;
}

/** Component handle returned by vLanguageSwitch(). */
export interface LanguageSwitchComponent {
  activeLanguage(): string;
  ariaLabel(): string;
  ariaLabel(value: ChildInput): LanguageSwitchComponent;
  change(handler: (option: LanguageOption, locale: I18n) => void): LanguageSwitchComponent;
  onChange(handler: (option: LanguageOption, locale: I18n) => void): LanguageSwitchComponent;
  destroy(): LanguageSwitchComponent;
  languages(): LanguageOption[];
  languages(value: Array<string | [string, string] | LanguageOption>): LanguageSwitchComponent;
  locale(): I18n;
  locale(value: I18n): LanguageSwitchComponent;
  size(): LanguageSwitchSize;
  size(value: LanguageSwitchSize): LanguageSwitchComponent;
  variant(): LanguageSwitchVariant;
  variant(value: LanguageSwitchVariant): LanguageSwitchComponent;
  [key: string]: any;
}

/** Creates a language switch bound to an I18n instance. */
export function vLanguageSwitch(
  first?: LanguageSwitchOptions | SetupInput<LanguageSwitchComponent> | null,
  callback?: SetupCallback<LanguageSwitchComponent>
): LanguageSwitchComponent;

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface I18nParentShortcuts {
  vLanguageSwitch(
    first?: LanguageSwitchOptions | SetupInput<LanguageSwitchComponent> | null,
    callback?: SetupCallback<LanguageSwitchComponent>
  ): LanguageSwitchComponent;
}

export type { ElementFactory };
