import type { ElementFactory, ElementOptions, SetupCallback, SetupInput } from './core.js';
import type { HtmlElementNode } from './html.js';
import type { VButton } from './actions.js';

export type GlowMotion = 'auto' | 'sweep' | 'pulse' | 'none' | string;
export type GlowDirection = 'ltr' | 'rtl' | string;

export interface GlowOptions {
  auto?: boolean;
  motion?: GlowMotion;
  direction?: GlowDirection;
  speed?: number | string;
  strength?: number | string;
  ripple?: boolean;
  [key: string]: any;
}

/** Button with animated glow and click ripple effects. */
export class VGlowButton extends VButton {
  glow(options: GlowOptions): VGlowButton;
  play(value: boolean): VGlowButton;
  speed(value: number | string): VGlowButton;
  direction(value: GlowDirection): VGlowButton;
  strength(value: number | string): VGlowButton;
  motion(value: GlowMotion): VGlowButton;
  ripple(value: boolean): VGlowButton;
}

export const vGlowButton: ElementFactory<VGlowButton> & {
  (first?: SetupInput<VGlowButton> | null, callback?: SetupCallback<VGlowButton>): VGlowButton;
};

export type TransitionMotion = 'auto' | 'always';

/** Generic enter / leave transition wrapper driven by CSS or Web Animations API. */
export class VTransition extends HtmlElementNode {
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

export const vTransition: ElementFactory<VTransition> & {
  (first?: SetupInput<VTransition> | null, callback?: SetupCallback<VTransition>): VTransition;
};

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface EffectsParentShortcuts {
  vGlowButton(
    first?: SetupInput<VGlowButton> | null,
    callback?: SetupCallback<VGlowButton>
  ): VGlowButton;
  vTransition(
    first?: SetupInput<VTransition> | null,
    callback?: SetupCallback<VTransition>
  ): VTransition;
}

export type { ElementOptions };
