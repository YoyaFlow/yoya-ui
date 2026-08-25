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
  ".yoya-vstep[data-status='finish'] .yoya-vsteps-connector"
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

  it('keeps theme variables available to the shared action batch', () => {
    expect(css).toContain('--yoya-color-primary');
    expect(css).toContain('--yoya-color-danger');
    expect(css).toContain('--yoya-color-surface');
    expect(css).toContain('--yoya-color-border');
  });
});
