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
  ".yoya-vcontext-menu[data-open='true'] > .yoya-vcontext-panel",
  "[vn~='VSymbolButton']",
  "[vn~='VSymbolButton']:hover",
  "[vn~='VFloatButton']",
  "[vn~='VFloatButton'][data-variant='primary']",
  "[vn~='VFloatButton'][data-size='large']",
  "[vn~='VFloatButton'][data-label='true']",
  "[vn~='VFloatButton'][disabled]",
  "[vn~='VFloatButton'][data-fixed='true']",
  "[vn~='VFloatButton'][data-position='bottom-right']"
];

const navigationSelectors = [
  "[vn~='VMenu']",
  "[vn~='VMenu'][data-orientation='horizontal']",
  "[vn~='VMenuItem']",
  "[vn~='VMenuItem'][data-active='true']",
  "[vn~='VMenuItem'][data-danger='true']",
  "[vn~='VMenuItem'][data-hovered='true']",
  "[vn~='VMenuItem'][disabled]",
  "[vn~='VMenuDivider']",
  "[vn~='VMenuGroup']",
  "[vn~='VMenuGroupLabel']",
  "[vn~='VSubMenu']",
  "[vn~='VSubMenuPanel']",
  "[vn~='VSubMenu'][data-open='true'] > [vn~='VSubMenuPanel']",
  "[vn~='VSubMenu'][data-inline='true'] > [vn~='VSubMenuPanel']",
  "[vn~='VSidebar']",
  "[vn~='VSidebar'][data-collapsed='true']",
  "[vn~='VSidebar'] [vn~='VSidebarHeader']",
  '.yoya-vnavbar',
  '.yoya-vnavbar-brand',
  '.yoya-vnavbar-brand-title',
  '.yoya-vnavbar-brand-subtitle',
  '.yoya-vnavbar-actions',
  "[vn~='VSteps']",
  "[vn~='VSteps'][data-direction='vertical']",
  "[vn~='VStep']",
  "[vn~='VStepsIndicator']",
  "[vn~='VStepsTitle']",
  "[vn~='VStepsDescription']",
  "[vn~='VStepsConnector']",
  "[vn~='VStep'][data-status='finish'] [vn~='VStepsIndicator']",
  "[vn~='VStep'][data-status='process'] [vn~='VStepsIndicator']",
  "[vn~='VStep'][data-status='error'] [vn~='VStepsIndicator']",
  "[vn~='VStep'][data-status='finish'] [vn~='VStepsConnector']",
  "[vn~='VTabs']",
  "[vn~='VTabs'][data-orientation='vertical']",
  "[vn~='VTabsNav']",
  "[vn~='VTabsPanels']",
  "[vn~='VTabTrigger']",
  "[vn~='VTabTrigger'][data-active='true']",
  "[vn~='VTabTrigger'][disabled]",
  "[vn~='VTabPanel']",
  "[vn~='VTabPanel'][hidden]",
  "[vn~='VTabs'][data-variant='card'] [vn~='VTabTrigger'][data-active='true']",
  "[vn~='VTabs'][data-variant='pills'] [vn~='VTabTrigger'][data-active='true']",
  '.yoya-vbreadcrumb',
  '.yoya-vbreadcrumb-list',
  '.yoya-vbreadcrumb-item',
  '.yoya-vbreadcrumb-link',
  '.yoya-vbreadcrumb-link:hover',
  '.yoya-vbreadcrumb-current',
  ".yoya-vbreadcrumb-item[data-current='true'] .yoya-vbreadcrumb-current",
  '.yoya-vbreadcrumb-separator',
  '.yoya-vbreadcrumb-item:last-child .yoya-vbreadcrumb-separator',
  "[vn~='VAnchor']",
  "[vn~='VAnchor'] [vn~='VAnchorList']",
  "[vn~='VAnchor'] [vn~='VAnchorItem']",
  "[vn~='VAnchor'] [vn~='VAnchorLink']",
  "[vn~='VAnchor'] [vn~='VAnchorLink']:hover",
  "[vn~='VAnchor'] [vn~='VAnchorItem'][data-active='true'] > [vn~='VAnchorLink']",
  "[vn~='VAnchor'] [vn~='VAnchorChildren']",
  "[vn~='VUpload']",
  "[vn~='VUploadDropzone']",
  "[vn~='VUploadDropzone'][data-dragging='true']",
  "[vn~='VUploadList']",
  "[vn~='VUploadItem']",
  "[vn~='VUploadItemName']",
  "[vn~='VUploadProgress']",
  "[vn~='VUploadProgressBar']",
  "[vn~='VUploadRemove']",
  "[vn~='VAvatarUpload']",
  "[vn~='VAvatarUploadPreview']",
  "[vn~='VAvatarUploadImage']",
  "[vn~='VAvatarUploadFallback']",
  "[vn~='VAvatarUploadHint']",
  "[vn~='VAvatarUploadRemove']",
  "[vn~='VProgress']",
  "[vn~='VProgressTrack']",
  "[vn~='VProgressBar']",
  "[vn~='VProgressLabel']",
  "[vn~='VProgressText']",
  "[vn~='VProgress'][data-size='small'] [vn~='VProgressTrack']",
  "[vn~='VProgress'][data-size='large'] [vn~='VProgressTrack']",
  "[vn~='VProgress'][data-indeterminate='true'] [vn~='VProgressBar']",
  '@keyframes yoya-progress-indeterminate',
  '.yoya-vechart',
  '.yoya-vthree'
];

const avatarSelectors = [
  "[vn~='VAvatar']",
  "[vn~='VAvatar'][data-color]",
  "[vn~='VAvatar'][data-shape='square']",
  "[vn~='VAvatar'][data-size='small']",
  "[vn~='VAvatar'][data-size='large']",
  "[vn~='VAvatar'] [vn~='VAvatarContent']",
  "[vn~='VAvatar'] [vn~='VAvatarImage']",
  "[vn~='VAvatar'][data-image='true'] [vn~='VAvatarImage']",
  "[vn~='VAvatar'] [vn~='VAvatarStatus']",
  "[vn~='VAvatar'][data-status='online'] [vn~='VAvatarStatus']",
  "[vn~='VAvatar'][data-status='busy'] [vn~='VAvatarStatus']",
  "[vn~='VAvatar'][data-status='away'] [vn~='VAvatarStatus']"
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
  "[vn~='VScroll']",
  "[vn~='VScrollList']",
  "[vn~='VScroll'][data-virtual='true'] [vn~='VScrollList']",
  "[vn~='VScrollVirtualItem']",
  "[vn~='VScrollFooter']",
  "[vn~='VScroll'][data-loading='true'] > [vn~='VScrollFooter']",
  "[vn~='VScroll'][data-blocked='true'] > [vn~='VScrollFooter']",
  "[vn~='VScrollStatus']"
];

const carouselSelectors = [
  "[vn~='VCarousel']",
  "[vn~='VCarouselViewport']",
  "[vn~='VCarouselTrack']",
  "[vn~='VCarouselSlide']",
  "[vn~='VCarouselArrow']",
  "[vn~='VCarouselArrow'][data-dir='prev']",
  "[vn~='VCarouselArrow'][data-dir='next']",
  "[vn~='VCarouselDots']",
  "[vn~='VCarouselDot']",
  "[vn~='VCarouselDot'][aria-selected='true']"
];

const effectsSelectors = [
  '.yoya-vglow-button',
  '.yoya-vglow-button .yoya-vbutton-label',
  '.yoya-vglow-button .yoya-vbutton-spinner',
  '.yoya-vglow-button::before',
  ".yoya-vglow-button[data-glow-play='hover']",
  ".yoya-vglow-button[data-glow-play='hover']:hover::before",
  ".yoya-vglow-button[data-glow-speed='slow']",
  ".yoya-vglow-button[data-glow-speed='fast']",
  ".yoya-vglow-button[data-glow-direction='rtl']",
  ".yoya-vglow-button[data-glow-strength='soft']",
  '.yoya-vglow-button[disabled]::before',
  '.yoya-vglow-button .yoya-vglow-button-ripple',
  ".yoya-vglow-button[data-glow-motion='always']::before",
  ".yoya-vglow-button[data-glow-motion='always'] .yoya-vglow-button-ripple",
  '@keyframes yoya-glow-button-sweep',
  '@keyframes yoya-glow-button-ripple'
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

  it('covers the effects glow button selectors', () => {
    effectsSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('keeps a static glow sheen under prefers-reduced-motion', () => {
    const reducedBlocks =
      css.match(/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g) ?? [];
    const glowBlock =
      reducedBlocks.find((block) => block.includes('.yoya-vglow-button::before')) ?? '';
    const alwaysBlock =
      reducedBlocks.find((block) => block.includes("data-glow-motion='always'")) ?? '';

    expect(glowBlock).toContain('animation: none !important;');
    expect(glowBlock).toContain('left: 35%');
    expect(glowBlock).toContain('width: 30%');
    expect(alwaysBlock).toContain('animation: yoya-glow-button-sweep');
    expect(alwaysBlock).toContain('!important');
  });

  it('hides scrollbars on aside and main layout regions', () => {
    expect(css).toMatch(
      /:where\(\.yoya-vaside\),\s*:where\(\.yoya-vmain\) \{\s*-ms-overflow-style: none;\s*scrollbar-width: none;/
    );
    expect(css).toMatch(
      /:where\(\.yoya-vaside\)::-webkit-scrollbar,[\s\S]*?:where\(\.yoya-vmain\)::-webkit-scrollbar \{\s*display: none;\s*height: 0;/
    );
  });

  it('keeps theme variables available to the shared action batch', () => {
    expect(css).toContain('--yoya-color-primary');
    expect(css).toContain('--yoya-color-danger');
    expect(css).toContain('--yoya-color-surface');
    expect(css).toContain('--yoya-color-border');
  });
});
