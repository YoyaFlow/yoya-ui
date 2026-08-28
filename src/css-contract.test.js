import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/yoya.ui.css'), 'utf8');

const sharedActionSelectors = [
  '.yoya-vbutton',
  ".yoya-vbutton[data-variant='primary']",
  ".yoya-vbutton[data-variant='primary'][data-interaction='hover']",
  ".yoya-vbutton[data-variant='primary'][data-interaction='active']",
  ".yoya-vbutton[data-variant='primary'][data-interaction='focus']",
  ".yoya-vbutton[data-variant='danger'][data-interaction='hover']",
  ".yoya-vbutton[data-variant='ghost'][data-interaction='hover']",
  ".yoya-vbutton[data-size='small']",
  ".yoya-vbutton[data-size='large']",
  '.yoya-vbutton[disabled]',
  ".yoya-vbutton[data-loading='true']",
  ".yoya-vbutton[data-loading='true'] .yoya-vbutton-spinner",
  '.yoya-vdropdown-menu',
  '.yoya-vdropdown-panel',
  ".yoya-vdropdown-menu[data-open='true'] > .yoya-vdropdown-panel",
  '.yoya-vcontext-menu',
  '.yoya-vcontext-target',
  '.yoya-vcontext-panel',
  ".yoya-vcontext-menu[data-open='true'] > .yoya-vcontext-panel"
];

const navigationSelectors = [
  '.yoya-vmenu',
  ".yoya-vmenu[data-orientation='horizontal']",
  '.yoya-vmenu-item',
  ".yoya-vmenu-item[data-active='true']",
  ".yoya-vmenu-item[data-danger='true']",
  ".yoya-vmenu-item[data-hovered='true']",
  '.yoya-vmenu-item[disabled]',
  '.yoya-vmenu-divider',
  '.yoya-vmenu-group',
  '.yoya-vmenu-group-label',
  '.yoya-vsubmenu',
  '.yoya-vsubmenu-panel',
  ".yoya-vsubmenu[data-open='true'] > .yoya-vsubmenu-panel",
  ".yoya-vsubmenu[data-inline='true'] > .yoya-vsubmenu-panel",
  '.yoya-vsidebar',
  ".yoya-vsidebar[data-collapsed='true']",
  '.yoya-vsidebar-header',
  '.yoya-vnavbar',
  '.yoya-vnavbar-brand',
  '.yoya-vnavbar-brand-title',
  '.yoya-vnavbar-brand-subtitle',
  '.yoya-vnavbar-actions',
  '.yoya-vsteps',
  ".yoya-vsteps[data-direction='vertical']",
  '.yoya-vstep',
  '.yoya-vsteps-indicator',
  '.yoya-vsteps-title',
  '.yoya-vsteps-description',
  '.yoya-vsteps-connector',
  ".yoya-vstep[data-status='finish'] .yoya-vsteps-indicator",
  ".yoya-vstep[data-status='process'] .yoya-vsteps-indicator",
  ".yoya-vstep[data-status='error'] .yoya-vsteps-indicator",
  ".yoya-vstep[data-status='finish'] .yoya-vsteps-connector",
  '.yoya-vtabs',
  ".yoya-vtabs[data-orientation='vertical']",
  '.yoya-vtabs-nav',
  '.yoya-vtabs-panels',
  '.yoya-vtab-trigger',
  ".yoya-vtab-trigger[data-active='true']",
  '.yoya-vtab-trigger[disabled]',
  '.yoya-vtab-panel',
  '.yoya-vtab-panel[hidden]',
  ".yoya-vtabs[data-variant='card'] .yoya-vtab-trigger[data-active='true']",
  ".yoya-vtabs[data-variant='pills'] .yoya-vtab-trigger[data-active='true']",
  '.yoya-vbreadcrumb',
  '.yoya-vbreadcrumb-list',
  '.yoya-vbreadcrumb-item',
  '.yoya-vbreadcrumb-link',
  '.yoya-vbreadcrumb-link:hover',
  '.yoya-vbreadcrumb-current',
  ".yoya-vbreadcrumb-item[data-current='true'] .yoya-vbreadcrumb-current",
  '.yoya-vbreadcrumb-separator',
  '.yoya-vbreadcrumb-item:last-child .yoya-vbreadcrumb-separator',
  '.yoya-vanchor',
  '.yoya-vanchor-list',
  '.yoya-vanchor-item',
  '.yoya-vanchor-link',
  '.yoya-vanchor-link:hover',
  ".yoya-vanchor-item[data-active='true'] > .yoya-vanchor-link",
  '.yoya-vanchor-children',
  '.yoya-vupload',
  '.yoya-vupload-dropzone',
  ".yoya-vupload-dropzone[data-dragging='true']",
  '.yoya-vupload-list',
  '.yoya-vupload-item',
  '.yoya-vupload-item-name',
  '.yoya-vupload-progress',
  '.yoya-vupload-progress-bar',
  '.yoya-vupload-remove',
  '.yoya-vavatar-upload',
  '.yoya-vavatar-upload-preview',
  '.yoya-vavatar-upload-image',
  '.yoya-vavatar-upload-fallback',
  '.yoya-vavatar-upload-hint',
  '.yoya-vavatar-upload-remove',
  '.yoya-vprogress',
  '.yoya-vprogress-track',
  '.yoya-vprogress-bar',
  '.yoya-vprogress-label',
  '.yoya-vprogress-text',
  ".yoya-vprogress[data-size='small'] .yoya-vprogress-track",
  ".yoya-vprogress[data-size='large'] .yoya-vprogress-track",
  ".yoya-vprogress[data-indeterminate='true'] .yoya-vprogress-bar",
  '@keyframes yoya-vprogress-indeterminate',
  '.yoya-vechart'
];

const avatarSelectors = [
  '.yoya-vavatar',
  ".yoya-vavatar[data-shape='square']",
  ".yoya-vavatar[data-size='small']",
  ".yoya-vavatar[data-size='large']",
  '.yoya-vavatar-content',
  '.yoya-vavatar-image',
  ".yoya-vavatar[data-image='true'] .yoya-vavatar-image",
  '.yoya-vavatar-status',
  ".yoya-vavatar[data-status='online'] .yoya-vavatar-status",
  ".yoya-vavatar[data-status='busy'] .yoya-vavatar-status",
  ".yoya-vavatar[data-status='away'] .yoya-vavatar-status"
];

const feedbackSelectors = [
  '.yoya-vtooltip',
  '.yoya-vtooltip-target',
  '.yoya-vtooltip-panel',
  ".yoya-vtooltip[data-open='true'] > .yoya-vtooltip-panel",
  ".yoya-vtooltip[data-placement='top'] > .yoya-vtooltip-panel::after",
  ".yoya-vtooltip[data-placement='bottom'] > .yoya-vtooltip-panel::after",
  ".yoya-vtooltip[data-placement='left'] > .yoya-vtooltip-panel::after",
  ".yoya-vtooltip[data-placement='right'] > .yoya-vtooltip-panel::after"
];

const scrollSelectors = [
  '.yoya-vscroll',
  '.yoya-vscroll-list',
  ".yoya-vscroll[data-virtual='true'] .yoya-vscroll-list",
  '.yoya-vscroll-virtual-item',
  '.yoya-vscroll-footer',
  ".yoya-vscroll[data-loading='true'] > .yoya-vscroll-footer",
  ".yoya-vscroll[data-blocked='true'] > .yoya-vscroll-footer",
  '.yoya-vscroll-status'
];

const carouselSelectors = [
  '.yoya-vcarousel',
  '.yoya-vcarousel-viewport',
  '.yoya-vcarousel-track',
  '.yoya-vcarousel-slide',
  '.yoya-vcarousel-arrow',
  '.yoya-vcarousel-arrow--prev',
  '.yoya-vcarousel-arrow--next',
  '.yoya-vcarousel-dots',
  '.yoya-vcarousel-dot',
  ".yoya-vcarousel-dot[aria-selected='true']"
];

describe('CSS style contract', () => {
  it('covers the shared action batch selectors', () => {
    sharedActionSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the navigation batch selectors', () => {
    navigationSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the avatar selectors', () => {
    avatarSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the feedback tooltip selectors', () => {
    feedbackSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the infinite scroll selectors', () => {
    scrollSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the carousel selectors', () => {
    carouselSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('keeps theme variables available to the shared action batch', () => {
    expect(css).toContain('--yoya-color-primary');
    expect(css).toContain('--yoya-color-danger');
    expect(css).toContain('--yoya-color-surface');
    expect(css).toContain('--yoya-color-border');
  });
});
