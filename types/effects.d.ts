import type { ElementFactory, ElementOptions, SetupCallback, SetupInput } from './core.js';
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

/** Parent-shortcut surface merged onto HtmlElementNode. */
export interface EffectsParentShortcuts {
  vGlowButton(
    first?: SetupInput<VGlowButton> | null,
    callback?: SetupCallback<VGlowButton>
  ): VGlowButton;
}

export type { ElementOptions };
