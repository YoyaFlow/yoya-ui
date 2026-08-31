import type {
  AttrValue,
  ChildInput,
  ElementFactory,
  ElementOptions,
  SetupCallback,
  SetupInput
} from './core.js';
import type { HtmlElementNode } from './html.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonFormType = 'button' | 'submit' | 'reset';
export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Compound button component. */
export class VButton extends HtmlElementNode {
  label(content: ChildInput): VButton;
  content(content: ChildInput): VButton;
  type(): ButtonVariant;
  type(value: ButtonVariant): VButton;
  variant(): ButtonVariant;
  variant(value: ButtonVariant): VButton;
  formType(): string;
  formType(value: ButtonFormType): VButton;
  size(): ButtonSize;
  size(value: ButtonSize): VButton;
  disabled(): boolean;
  disabled(value: boolean): VButton;
  loading(): boolean;
  loading(value: boolean): VButton;
}

/** Button group with selection state. */
export class VButtons extends HtmlElementNode {
  child(...children: ChildInput[]): this;
  variant(): ButtonVariant;
  variant(value: ButtonVariant): VButtons;
  size(): ButtonSize;
  size(value: ButtonSize): VButtons;
  selectable(value?: boolean): VButtons;
  value(): unknown;
  value(next: unknown): VButtons;
  change(): ((value: unknown, buttons: VButtons) => void) | null;
  change(handler: ((value: unknown, buttons: VButtons) => void) | null): VButtons;
  joined(value?: boolean): VButtons;
  disabled(value: boolean): VButtons;
  options(): VButton[];
  options(
    items:
      VButton | string | number | ButtonOption | Array<VButton | string | number | ButtonOption>
  ): VButtons;
}

export interface ButtonOption {
  label?: ChildInput;
  value?: unknown;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  [key: string]: any;
}

/** Floating action button. */
export class VFloatButton extends HtmlElementNode {
  icon(content: ChildInput): VFloatButton;
  label(content: ChildInput): VFloatButton;
  content(content: ChildInput): VFloatButton;
  text(content: ChildInput): this;
  variant(): ButtonVariant;
  variant(value: ButtonVariant): VFloatButton;
  type(): ButtonVariant;
  type(value: ButtonVariant): VFloatButton;
  size(): ButtonSize;
  size(value: ButtonSize): VFloatButton;
  disabled(): boolean;
  disabled(value: boolean): VFloatButton;
  fixed(value?: boolean): VFloatButton;
  position(): string;
  position(value: string): VFloatButton;
}

/** Icon/symbol-only button without border or outline. */
export class VSymbolButton extends HtmlElementNode {
  icon(content: ChildInput): VSymbolButton;
  ariaLabel(): AttrValue | undefined;
  ariaLabel(value: string): VSymbolButton;
}

/** Dropdown menu anchored to a trigger. */
export class VDropdownMenu extends HtmlElementNode {
  trigger(): HtmlElementNode;
  trigger(setup: SetupInput<HtmlElementNode>): VDropdownMenu;
  menuContent(): HtmlElementNode;
  menuContent(setup: SetupInput<HtmlElementNode>): VDropdownMenu;
  placement(): string;
  placement(value: DropdownPlacement): VDropdownMenu;
  closeOnSelect(value?: boolean): VDropdownMenu;
  open(value?: boolean): VDropdownMenu;
  close(): VDropdownMenu;
  toggle(): VDropdownMenu;
}

/** Right-click context menu. */
export class VContextMenu extends HtmlElementNode {
  target(): HtmlElementNode;
  target(setup: SetupInput<HtmlElementNode>): VContextMenu;
  menuContent(): HtmlElementNode;
  menuContent(setup: SetupInput<HtmlElementNode>): VContextMenu;
  closeOnSelect(value?: boolean): VContextMenu;
  openAt(
    pointOrX?: number | MouseEvent | { clientX?: number; clientY?: number; x?: number; y?: number },
    y?: number
  ): VContextMenu;
  open(value?: boolean): VContextMenu;
  close(): VContextMenu;
}

export const vButton: ElementFactory<VButton> & {
  (first?: SetupInput<VButton> | null, callback?: SetupCallback<VButton>): VButton;
};
export const vButtons: ElementFactory<VButtons> & {
  (first?: SetupInput<VButtons> | null, callback?: SetupCallback<VButtons>): VButtons;
};
export const vFloatButton: ElementFactory<VFloatButton> & {
  (first?: SetupInput<VFloatButton> | null, callback?: SetupCallback<VFloatButton>): VFloatButton;
};
export const vSymbolButton: ElementFactory<VSymbolButton> & {
  (
    first?: SetupInput<VSymbolButton> | null,
    callback?: SetupCallback<VSymbolButton>
  ): VSymbolButton;
};
export const vDropdownMenu: ElementFactory<VDropdownMenu> & {
  (
    first?: SetupInput<VDropdownMenu> | null,
    callback?: SetupCallback<VDropdownMenu>
  ): VDropdownMenu;
};
export const vContextMenu: ElementFactory<VContextMenu> & {
  (first?: SetupInput<VContextMenu> | null, callback?: SetupCallback<VContextMenu>): VContextMenu;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface ActionsParentShortcuts {
  vButton(first?: SetupInput<VButton> | null, callback?: SetupCallback<VButton>): VButton;
  vButtons(first?: SetupInput<VButtons> | null, callback?: SetupCallback<VButtons>): VButtons;
  vFloatButton(
    first?: SetupInput<VFloatButton> | null,
    callback?: SetupCallback<VFloatButton>
  ): VFloatButton;
  vSymbolButton(
    first?: SetupInput<VSymbolButton> | null,
    callback?: SetupCallback<VSymbolButton>
  ): VSymbolButton;
  vDropdownMenu(
    first?: SetupInput<VDropdownMenu> | null,
    callback?: SetupCallback<VDropdownMenu>
  ): VDropdownMenu;
  vContextMenu(
    first?: SetupInput<VContextMenu> | null,
    callback?: SetupCallback<VContextMenu>
  ): VContextMenu;
}

export type { ElementOptions };
