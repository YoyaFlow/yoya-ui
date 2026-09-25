import type {
  ComponentNode,
  AttrValue,
  ChildInput,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput
} from '@yoyaflow/yoya-core/internal/types/core.js';
import type { HtmlElementNode } from '@yoyaflow/yoya-core/internal/types/html.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'small' | 'medium' | 'large';
export type ButtonFormType = 'button' | 'submit' | 'reset';
export type DropdownPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** 按钮 props：`label` / `text` / `children` 三键同义（节点在构建期落位到标签盒）。 */
export interface ButtonOptions {
  label?: ChildInput;
  text?: ChildInput;
  children?: ChildInput;
  /** 变体：`type` / `variant` 两键同义。 */
  type?: PropValue<ButtonVariant>;
  variant?: PropValue<ButtonVariant>;
  formType?: PropValue<ButtonFormType>;
  size?: PropValue<ButtonSize>;
  disabled?: PropValue<boolean>;
  loading?: PropValue<boolean>;
  /** 单选联动的值（`VButtons` 里用；不填按标签文本比对）。 */
  value?: unknown;
  /** 元素级配置（`class` / `style` / `onXxx` / `data-*` / `attrs` …）照旧透传。 */
  [key: string]: unknown;
}

/** Compound button component. */
export interface VButton extends ComponentNode {
  label(): string;
  label(content: ChildInput): VButton;
  content(content: ChildInput): VButton;
  text(content: ChildInput): VButton;
  /** 单选联动的值（`VButtons` 用）。 */
  value(): string | null;
  value(next: unknown): VButton;
  /** 派生的比对值：显式 value 优先，否则标签文本。 */
  valueText(): string;
  type(): ButtonVariant;
  type(value: ButtonVariant): VButton;
  variant(): ButtonVariant;
  variant(value: ButtonVariant): VButton;
  formType(): string;
  formType(value: ButtonFormType): VButton;
  size(): ButtonSize;
  size(value: ButtonSize): VButton;
  /** 写方法（与迁移前同口径：无参 = 禁用）；读态用 `isDisabled()`。 */
  disabled(value: boolean): VButton;
  isDisabled(): boolean;
  /** 写方法（无参 = 关闭）；读态用 `isLoading()`。 */
  loading(value: boolean): VButton;
  isLoading(): boolean;
  /** 把焦点交给按钮元素。 */
  /** 元素级操作 API（`ElementNode.focus()`），返回 `this` 以满足基类签名。 */
  focus(): this;
}

export const VButton: { (props?: ButtonOptions): VButton };

/** `vButtons({ … })` 的 props：`options` / `children` 都是按钮数据。 */
export interface ButtonsOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  selectable?: boolean;
  value?: unknown;
  change?: (value: unknown, buttons: VButtons) => void;
  joined?: boolean;
  disabled?: boolean;
  options?: ButtonOption | ButtonOption[];
  children?: ButtonOption | ButtonOption[];
  [key: string]: unknown;
}

/** Button group with selection state. */
export interface VButtons extends ComponentNode {
  child(...children: ChildInput[]): this;
  /** 追加一份按钮，返回按钮句柄（`container.vButton(…)`）。 */
  vButton(setup: ButtonOption | SetupInput<VButton>): VButton;
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

export const VButtons: { (props?: ButtonsOptions): VButtons };

export interface ButtonOption {
  label?: ChildInput;
  value?: unknown;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  [key: string]: any;
}

/** `VFloatButton({ … })` 的直接参数。 */
export interface FloatButtonOptions {
  children?: ChildInput;
  disabled?: PropValue<boolean>;
  fixed?: PropValue<boolean>;
  icon?: ChildInput;
  label?: ChildInput;
  position?: PropValue<string>;
  size?: PropValue<ButtonSize>;
  text?: ChildInput;
  variant?: PropValue<ButtonVariant>;
  [key: string]: unknown;
}

/** Floating action button. */
export interface VFloatButton extends ComponentNode {
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

export const VFloatButton: { (props?: FloatButtonOptions): VFloatButton };

/** `VSymbolButton({ … })` 的直接参数。 */
export interface SymbolButtonOptions {
  ariaLabel?: string;
  icon?: ChildInput;
  title?: ChildInput;
  [key: string]: unknown;
}

/** Icon/symbol-only button without border or outline. */
export interface VSymbolButton extends ComponentNode {
  icon(content: ChildInput): VSymbolButton;
  ariaLabel(): AttrValue | undefined;
  ariaLabel(value: string): VSymbolButton;
}

export const VSymbolButton: { (props?: SymbolButtonOptions): VSymbolButton };

/** `VDropdownMenu({ … })` 的直接参数（`menu` / `menuContent` / `trigger` 收节点或句柄）。 */
export interface DropdownMenuOptions {
  children?: ChildInput;
  closeOnSelect?: PropValue<boolean>;
  content?: ChildInput;
  label?: ChildInput;
  menu?: SetupInput<HtmlElementNode>;
  menuContent?: SetupInput<HtmlElementNode>;
  open?: PropValue<boolean>;
  placement?: PropValue<DropdownPlacement>;
  text?: ChildInput;
  trigger?: SetupInput<HtmlElementNode>;
  [key: string]: unknown;
}

/** Dropdown menu anchored to a trigger. */
export interface VDropdownMenu extends ComponentNode {
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

export const VDropdownMenu: { (props?: DropdownMenuOptions): VDropdownMenu };

/** `VContextMenu({ … })` 的直接参数（`menu` / `menuContent` / `target` 收节点或句柄）。 */
export interface ContextMenuOptions {
  children?: ChildInput;
  closeOnSelect?: PropValue<boolean>;
  content?: ChildInput;
  menu?: SetupInput<HtmlElementNode>;
  menuContent?: SetupInput<HtmlElementNode>;
  open?: PropValue<boolean>;
  target?: SetupInput<HtmlElementNode>;
  x?: PropValue<number>;
  y?: PropValue<number>;
  [key: string]: unknown;
}

/** Right-click context menu. */
export interface VContextMenu extends ComponentNode {
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

export const VContextMenu: { (props?: ContextMenuOptions): VContextMenu };

export const vButton: ElementFactory<VButton> & {
  (first?: ButtonOptions | SetupInput<VButton> | null, callback?: SetupCallback<VButton>): VButton;
};
export const vButtons: ElementFactory<VButtons> & {
  (
    first?: ButtonsOptions | SetupInput<VButtons> | null,
    callback?: SetupCallback<VButtons>
  ): VButtons;
};
export const vFloatButton: ElementFactory<VFloatButton> & {
  (
    first?: FloatButtonOptions | SetupInput<VFloatButton> | null,
    callback?: SetupCallback<VFloatButton>
  ): VFloatButton;
};
export const vSymbolButton: ElementFactory<VSymbolButton> & {
  (
    first?: SymbolButtonOptions | SetupInput<VSymbolButton> | null,
    callback?: SetupCallback<VSymbolButton>
  ): VSymbolButton;
};
export const vDropdownMenu: ElementFactory<VDropdownMenu> & {
  (
    first?: DropdownMenuOptions | SetupInput<VDropdownMenu> | null,
    callback?: SetupCallback<VDropdownMenu>
  ): VDropdownMenu;
};
export const vContextMenu: ElementFactory<VContextMenu> & {
  (
    first?: ContextMenuOptions | SetupInput<VContextMenu> | null,
    callback?: SetupCallback<VContextMenu>
  ): VContextMenu;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface ActionsParentShortcuts {
  vButton(
    first?: ButtonOptions | SetupInput<VButton> | null,
    callback?: SetupCallback<VButton>
  ): VButton;
  vButtons(
    first?: ButtonsOptions | SetupInput<VButtons> | null,
    callback?: SetupCallback<VButtons>
  ): VButtons;
  vFloatButton(
    first?: FloatButtonOptions | SetupInput<VFloatButton> | null,
    callback?: SetupCallback<VFloatButton>
  ): VFloatButton;
  vSymbolButton(
    first?: SymbolButtonOptions | SetupInput<VSymbolButton> | null,
    callback?: SetupCallback<VSymbolButton>
  ): VSymbolButton;
  vDropdownMenu(
    first?: DropdownMenuOptions | SetupInput<VDropdownMenu> | null,
    callback?: SetupCallback<VDropdownMenu>
  ): VDropdownMenu;
  vContextMenu(
    first?: ContextMenuOptions | SetupInput<VContextMenu> | null,
    callback?: SetupCallback<VContextMenu>
  ): VContextMenu;
}

export type { ElementOptions };

// 组件域把父快捷方法**并入** core 的节点接口（票 06 硬点 1）：core 的声明不再 import 组件，
// 增强在组件包自己的类型被引入时生效——与运行期"组件包被 import 时 registerChildFactories"同向。
declare module '@yoyaflow/yoya-core/html' {
  interface HtmlElementNode extends ActionsParentShortcuts {}
}
