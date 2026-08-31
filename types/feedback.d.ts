import type {
  ChildInput,
  ElementFactory,
  ElementOptions,
  SetupCallback,
  SetupInput,
  ViewNode
} from './core.js';
import type { HtmlElementNode } from './html.js';

export type MessageType = 'success' | 'error' | 'warning' | 'info';
export type MessagePlacement =
  'top' | 'top-left' | 'top-right' | 'bottom' | 'bottom-left' | 'bottom-right';

export interface MessageOptions {
  duration?: number;
  closable?: boolean;
  type?: MessageType;
  [key: string]: any;
}

/** Modal dialog. */
export class VDialog extends HtmlElementNode {
  content(value: ChildInput): VDialog;
  open(value?: boolean): VDialog;
  close(): VDialog;
}

/** Single toast/message entry. */
export class VMessage extends HtmlElementNode {
  content(content: ChildInput): VMessage;
  type(): MessageType;
  type(value: MessageType): VMessage;
  closable(value?: boolean): VMessage;
  countdown(duration: number, enabled?: boolean): VMessage;
  onClose(handler: (message: VMessage) => void): VMessage;
  close(): VMessage;
}

/** Message container that stacks messages. */
export class VMessageContainer extends HtmlElementNode {
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

/** Tooltip anchored to a target. */
export class VTooltip extends HtmlElementNode {
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

export const vDialog: ElementFactory<VDialog>;
export const vMessage: ElementFactory<VMessage>;
export const vMessageContainer: ElementFactory<VMessageContainer>;
export const vTooltip: ElementFactory<VTooltip>;
export const vMessageManager: ElementFactory<VMessageManager> & {
  (
    first?:
      VMessageContainer | { container: VMessageContainer } | SetupInput<VMessageManager> | null,
    callback?: SetupCallback<VMessageManager>
  ): VMessageManager;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface FeedbackParentShortcuts {
  vDialog(first?: SetupInput<VDialog> | null, callback?: SetupCallback<VDialog>): VDialog;
  vMessage(first?: SetupInput<VMessage> | null, callback?: SetupCallback<VMessage>): VMessage;
  vMessageContainer(
    first?: SetupInput<VMessageContainer> | null,
    callback?: SetupCallback<VMessageContainer>
  ): VMessageContainer;
  vTooltip(first?: SetupInput<VTooltip> | null, callback?: SetupCallback<VTooltip>): VTooltip;
}

export type { ElementOptions };
