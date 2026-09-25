import type {
  ComponentNode,
  ChildInput,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput,
  ViewNode
} from './core.js';
import type { HtmlElementNode } from './html.js';

export type MessageType = 'success' | 'error' | 'warning' | 'info';
export type MessagePlacement =
  'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right';

export interface MessageOptions {
  duration?: PropValue<number>;
  closable?: PropValue<boolean>;
  type?: PropValue<MessageType>;
  [key: string]: unknown;
}

/** `VDialog({ … })` 的直接参数。 */
export interface DialogOptions {
  children?: ChildInput;
  closable?: PropValue<boolean>;
  content?: ChildInput;
  onClose?: (dialog: VDialog) => void;
  open?: PropValue<boolean>;
  [key: string]: unknown;
}

/** Modal dialog. */
export interface VDialog extends ComponentNode {
  content(value: ChildInput): VDialog;
  open(value?: boolean): VDialog;
  close(): VDialog;
}

export const VDialog: { (props?: DialogOptions): VDialog };

/** `VMessage({ … })` 的直接参数。 */
export interface MessageComponentOptions extends MessageOptions {
  children?: ChildInput;
  content?: ChildInput;
  countdown?: PropValue<number>;
  text?: ChildInput;
}

/** Single toast/message entry. */
export interface VMessage extends ComponentNode {
  content(content: ChildInput): VMessage;
  type(): MessageType;
  type(value: MessageType): VMessage;
  closable(value?: boolean): VMessage;
  countdown(duration: number, enabled?: boolean): VMessage;
  onClose(handler: (message: VMessage) => void): VMessage;
  close(): VMessage;
}

export const VMessage: { (props?: MessageComponentOptions): VMessage };

/** `VMessageContainer({ … })` 的直接参数。 */
export interface MessageContainerOptions {
  inline?: PropValue<boolean>;
  placement?: PropValue<MessagePlacement>;
  [key: string]: unknown;
}

/** Message container that stacks messages. */
export interface VMessageContainer extends ComponentNode {
  placement(): MessagePlacement;
  placement(value: MessagePlacement): VMessageContainer;
  inline(value?: boolean): VMessageContainer;
  show(content: ChildInput, options?: MessageOptions): VMessage;
  success(content: ChildInput, options?: MessageOptions): VMessage;
  error(content: ChildInput, options?: MessageOptions): VMessage;
  warning(content: ChildInput, options?: MessageOptions): VMessage;
  info(content: ChildInput, options?: MessageOptions): VMessage;
  close(id: unknown): VMessageContainer;
  clear(): VMessageContainer;
}

export const VMessageContainer: { (props?: MessageContainerOptions): VMessageContainer };

/** Owns an explicitly bound message container and its lifecycle. */
export class VMessageManager extends ViewNode {
  constructor(setup?: VMessageContainer | { container: VMessageContainer } | null);
  container(): VMessageContainer;
  bindTo(target: string | ParentNode): this;
  renderDom(): Node | null;
  toHTML(): string;
  show(content: ChildInput, options?: MessageOptions): VMessage | null;
  success(content: ChildInput, options?: MessageOptions): VMessage | null;
  error(content: ChildInput, options?: MessageOptions): VMessage | null;
  warning(content: ChildInput, options?: MessageOptions): VMessage | null;
  info(content: ChildInput, options?: MessageOptions): VMessage | null;
  close(id: unknown): VMessageManager;
  clear(): VMessageManager;
}

/** `VTooltip({ … })` 的直接参数。 */
export interface TooltipOptions {
  children?: ChildInput;
  content?: ChildInput;
  open?: PropValue<boolean>;
  placement?: PropValue<string>;
  target?: SetupInput<HtmlElementNode>;
  trigger?: PropValue<'hover' | 'focus' | 'click' | 'manual'>;
  [key: string]: unknown;
}

/** Tooltip anchored to a target. */
export interface VTooltip extends ComponentNode {
  target(setup: SetupInput<HtmlElementNode>): VTooltip;
  content(setup: SetupInput<HtmlElementNode>): VTooltip;
  placement(): string;
  placement(value: string): VTooltip;
  trigger(): 'hover' | 'focus' | 'click' | 'manual';
  trigger(value: string): VTooltip;
  open(value?: boolean): VTooltip;
  close(): VTooltip;
  toggle(): VTooltip;
}

export const VTooltip: { (props?: TooltipOptions): VTooltip };

/** Default toast singleton. */
export const toast: {
  use(container: VMessageContainer): typeof toast;
  container(): VMessageContainer;
  show(content: ChildInput, options?: MessageOptions): VMessage;
  success(content: ChildInput, options?: MessageOptions): VMessage;
  error(content: ChildInput, options?: MessageOptions): VMessage;
  warning(content: ChildInput, options?: MessageOptions): VMessage;
  info(content: ChildInput, options?: MessageOptions): VMessage;
  close(id: unknown): VMessageContainer;
  clear(): VMessageContainer;
};

export interface ConfirmOptions {
  title?: ChildInput;
  content?: ChildInput;
  confirmText?: ChildInput;
  cancelText?: ChildInput;
  danger?: boolean;
  onConfirm?: () => boolean | void | Promise<boolean>;
  onCancel?: () => void;
}

/** 命令式确认弹窗：resolves true on confirm, false on cancel / danger. */
export function vConfirm(options?: ConfirmOptions): Promise<boolean>;

export const vDialog: ElementFactory<VDialog> & {
  (first?: DialogOptions | SetupInput<VDialog> | null, callback?: SetupCallback<VDialog>): VDialog;
};
export const vMessage: ElementFactory<VMessage> & {
  (
    first?: MessageComponentOptions | SetupInput<VMessage> | null,
    callback?: SetupCallback<VMessage>
  ): VMessage;
};
export const vMessageContainer: ElementFactory<VMessageContainer> & {
  (
    first?: MessageContainerOptions | SetupInput<VMessageContainer> | null,
    callback?: SetupCallback<VMessageContainer>
  ): VMessageContainer;
};
export const vTooltip: ElementFactory<VTooltip> & {
  (
    first?: TooltipOptions | SetupInput<VTooltip> | null,
    callback?: SetupCallback<VTooltip>
  ): VTooltip;
};
export const vMessageManager: ElementFactory<VMessageManager> & {
  (
    first?:
      VMessageContainer | { container: VMessageContainer } | SetupInput<VMessageManager> | null,
    callback?: SetupCallback<VMessageManager>
  ): VMessageManager;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface FeedbackParentShortcuts {
  vDialog(
    first?: DialogOptions | SetupInput<VDialog> | null,
    callback?: SetupCallback<VDialog>
  ): VDialog;
  vMessage(
    first?: MessageComponentOptions | SetupInput<VMessage> | null,
    callback?: SetupCallback<VMessage>
  ): VMessage;
  vMessageContainer(
    first?: MessageContainerOptions | SetupInput<VMessageContainer> | null,
    callback?: SetupCallback<VMessageContainer>
  ): VMessageContainer;
  vTooltip(
    first?: TooltipOptions | SetupInput<VTooltip> | null,
    callback?: SetupCallback<VTooltip>
  ): VTooltip;
}

export type { ElementOptions };
