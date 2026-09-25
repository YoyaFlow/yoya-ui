import type {
  ComponentNode,
  ElementFactory,
  ElementOptions,
  PropValue,
  SetupCallback,
  SetupInput
} from './core.js';
import type { HtmlElementNode } from './html.js';
import type { ButtonOptions, VButton } from './actions.js';

export type GlowMotion = 'auto' | 'sweep' | 'pulse' | 'none' | string;
export type GlowDirection = 'ltr' | 'rtl' | string;

export interface GlowOptions {
  auto?: boolean;
  motion?: GlowMotion;
  direction?: GlowDirection;
  speed?: number | string;
  strength?: number | string;
  ripple?: boolean;
  [key: string]: unknown;
}

/** `VGlowButton({ … })` 的直接参数（`VButton` 的全部 props + 发光特效键）。 */
export interface GlowButtonOptions extends ButtonOptions {
  direction?: PropValue<GlowDirection>;
  glow?: GlowOptions;
  motion?: PropValue<GlowMotion>;
  play?: PropValue<boolean>;
  ripple?: PropValue<boolean>;
  speed?: PropValue<number | string>;
  strength?: PropValue<number | string>;
}

/** Button with animated glow and click ripple effects. */
export interface VGlowButton extends VButton {
  glow(options: GlowOptions): VGlowButton;
  play(value: boolean): VGlowButton;
  speed(value: number | string): VGlowButton;
  direction(value: GlowDirection): VGlowButton;
  strength(value: number | string): VGlowButton;
  motion(value: GlowMotion): VGlowButton;
  ripple(value: boolean): VGlowButton;
}

export const VGlowButton: { (props?: GlowButtonOptions): VGlowButton };

export const vGlowButton: ElementFactory<VGlowButton> & {
  (
    first?: GlowButtonOptions | SetupInput<VGlowButton> | null,
    callback?: SetupCallback<VGlowButton>
  ): VGlowButton;
};

export type TransitionMotion = 'auto' | 'always';

/** Generic enter / leave transition wrapper driven by CSS or Web Animations API. */
export interface VTransition extends ComponentNode {
  show(): boolean;
  show(value: boolean): VTransition;
  enter(): VTransition;
  leave(): VTransition;
  toggle(): VTransition;
  motion(): TransitionMotion;
  motion(value: TransitionMotion): VTransition;
  duration(): number;
  duration(value: number): VTransition;
}

/**
 * Component definition + shortcut in one value (`VTransition` is the alias of `vTransition`).
 * Identity is the `vn` object fact + DOM attribute (`hasComponentIdentity` / `componentNameOf`);
 * there is no construct signature (`new VTransition()` retired with the other `new` signatures).
 */
export const VTransition: {
  (first?: SetupInput<VTransition> | null, callback?: SetupCallback<VTransition>): VTransition;
};

export const vTransition: ElementFactory<VTransition> & {
  (first?: SetupInput<VTransition> | null, callback?: SetupCallback<VTransition>): VTransition;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface EffectsParentShortcuts {
  vGlowButton(
    first?: GlowButtonOptions | SetupInput<VGlowButton> | null,
    callback?: SetupCallback<VGlowButton>
  ): VGlowButton;
  vTransition(
    first?: SetupInput<VTransition> | null,
    callback?: SetupCallback<VTransition>
  ): VTransition;
}

export type { ElementOptions };
