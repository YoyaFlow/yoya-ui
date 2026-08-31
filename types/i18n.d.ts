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

/** Object component returned by vLanguageSwitch(). */
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
  render(): VDropdownMenu;
  size(): LanguageSwitchSize;
  size(value: LanguageSwitchSize): LanguageSwitchComponent;
  variant(): LanguageSwitchVariant;
  variant(value: LanguageSwitchVariant): LanguageSwitchComponent;
  [key: string]: any;
}

/** Creates a language switch bound to an I18n instance. */
export function vLanguageSwitch(
  first?: SetupInput<LanguageSwitchComponent> | null,
  options?: ElementOptions,
  callback?: SetupCallback<LanguageSwitchComponent>
): LanguageSwitchComponent;

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface I18nParentShortcuts {
  vLanguageSwitch(
    first?: SetupInput<LanguageSwitchComponent> | null,
    callback?: SetupCallback<LanguageSwitchComponent>
  ): LanguageSwitchComponent;
}

export type { ElementFactory };
