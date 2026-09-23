import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve('src/yoya.ui.css'), 'utf8');

/** 选择器可能被 prettier 折行：断言时先压平空白，避免写法（换行位置）影响契约。 */
const cssFlat = css.replace(/\s+/g, ' ');

const sharedActionSelectors = [
  "[vn~='VButton']",
  "[vn~='VButton'][data-variant='primary']",
  "[vn~='VButton'][data-variant='primary'][data-interaction='hover']",
  "[vn~='VButton'][data-variant='primary'][data-interaction='active']",
  "[vn~='VButton'][data-variant='primary'][data-interaction='focus']",
  "[vn~='VButton'][data-variant='danger'][data-interaction='hover']",
  "[vn~='VButton'][data-variant='ghost'][data-interaction='hover']",
  "[vn~='VButton'][data-size='small']",
  "[vn~='VButton'][data-size='large']",
  "[vn~='VButton'][disabled]",
  "[vn~='VButton'][data-loading='true']",
  "[vn~='VButton'][data-loading='true'] [vn~='VButtonSpinner']",
  "[vn~='VButtons']",
  "[vn~='VButtons'][data-joined='true']",
  "[vn~='VButtons'][data-joined='true'] > [vn~='VButton']:first-child",
  "[vn~='VButtons'][data-joined='true'] > [vn~='VButton']:last-child",
  "[vn~='VButtons'][data-joined='true'] > [vn~='VButton']:only-child",
  "[vn~='VButtons'][data-joined='true'] > [vn~='VButton'][data-selected='true']",
  "[vn~='VDropdownMenu']",
  "[vn~='VDropdownPanel']",
  "[vn~='VDropdownMenu'][data-open='true'] > [vn~='VDropdownPanel']",
  "[vn~='VDropdownMenu'][data-placement='bottom-start'] > [vn~='VDropdownPanel']",
  "[vn~='VDropdownMenu'][data-placement='top-end'] > [vn~='VDropdownPanel']",
  "[vn~='VContextMenu']",
  "[vn~='VContextTarget']",
  "[vn~='VContextPanel']",
  "[vn~='VContextMenu'][data-open='true'] > [vn~='VContextPanel']",
  "[vn~='VSymbolButton']",
  "[vn~='VSymbolButton']:hover",
  "[vn~='VField']",
  "[vn~='VField'] [vn~='VFieldHeader']",
  "[vn~='VField'] [vn~='VFieldLabel']",
  "[vn~='VField'] [vn~='VFieldDisplay']",
  "[vn~='VField'][data-mode='edit'] [vn~='VFieldDisplay']",
  "[vn~='VField'] [vn~='VFieldEditor']",
  "[vn~='VField'][data-mode='edit'] [vn~='VFieldEditor']",
  "[vn~='VField'][data-hint='true']:not([data-error='true']) [vn~='VFieldHint']",
  "[vn~='VField'][data-error='true'] [vn~='VFieldError']",
  "[vn~='VField'][data-action='true'] [vn~='VFieldAction']",
  "[vn~='VField'][data-mode='edit'] [vn~='VFieldConfirm']",
  "[vn~='VFloatButton']",
  "[vn~='VFloatButton'][data-variant='primary']",
  "[vn~='VFloatButton'][data-size='large']",
  "[vn~='VFloatButton'][data-label='true']",
  "[vn~='VFloatButton'][disabled]",
  "[vn~='VFloatButton'][data-fixed='true']",
  "[vn~='VFloatButton'][data-position='bottom-right']"
];

const formItemSelectors = [
  "[vn~='VFormItem']",
  "[vn~='VFormItem'] > [vn~='VFormItemLabelRow']",
  "[vn~='VFormItem'] > [vn~='VFormItemLabelRow'] > [vn~='VFormItemLabel']",
  "[vn~='VFormItem'] > [vn~='VFormItemLabelRow'] > [vn~='VFormItemRequiredIndicator']",
  "[vn~='VFormItem'][data-indicator='true'] > [vn~='VFormItemLabelRow'] > [vn~='VFormItemRequiredIndicator']",
  "[vn~='VFormItem'] > [vn~='VFormItemEditor']",
  "[vn~='VFormItem'] > [vn~='VFormItemHint']",
  "[vn~='VFormItem'][data-hint='true']:not([data-error='true']) > [vn~='VFormItemHint']",
  "[vn~='VFormItem'] > [vn~='VFormItemError']",
  "[vn~='VFormItem'][data-error='true'] > [vn~='VFormItemError']"
];

const selectSelectors = [
  "[vn~='VSelect']",
  "[vn~='VSelect'] > [vn~='VSelectField']",
  "[vn~='VSelect'] > [vn~='VSelectField'][data-clearable='true']",
  "[vn~='VSelect'] > [vn~='VSelectField'][disabled]",
  "[vn~='VSelect'] > [vn~='VSelectField'][data-error='true']",
  "[vn~='VSelect'] > [vn~='VSelectField'] > [vn~='VSelectOption'][selected]",
  "[vn~='VSelect'] > [vn~='VSelectField'] > [vn~='VSelectOption'][data-placeholder='true']"
];

const timerRangeSelectors = ["[vn~='VTimerRange']", "[vn~='VTimerRangeError']"];

const themeSelectors = [
  "[vn~='VThemeModeSwitch']",
  "[vn~='VThemeModeSwitch'] > [vn~='VButton']",
  "[vn~='VThemeModeSwitch'] > [vn~='VButton'][data-active='true']",
  "[vn~='VThemeModeSwitch'] svg"
];

const masonrySelectors = [
  "[vn~='VMasonry']",
  "[vn~='VMasonry'][data-column-mode='responsive']",
  "[vn~='VMasonry'] > *"
];

const menuR5Selectors = [
  "[vn~='VMenuItemIcon']:empty",
  "[vn~='VMenuItemShortcut']:empty",
  "[vn~='VSidebar'][data-collapsible='false']",
  "[vn~='VSidebar'][data-overflow='visible']",
  "[vn~='VSidebar'][data-overflow='hidden']",
  "[data-sidebar-hidden='true']"
];

const treeRangerSelectors = [
  "[vn~='VTreeRanger']",
  "[vn~='VTreeRangerColumn']",
  "[vn~='VTreeRangerColumnStatus']",
  "[vn~='VTreeRangerColumnStatus']:empty",
  "[vn~='VTreeRangerViewport']",
  "[vn~='VTreeRangerList']",
  "[vn~='VTreeRangerRow']",
  "[vn~='VTreeRangerRow'][data-selected='true']",
  "[vn~='VTreeRangerIcon']",
  "[vn~='VTreeRangerCrumbs']",
  "[vn~='VTreeRangerCrumbSeparator']",
  "[vn~='VTreeRangerCrumb'][data-active='true']"
];

const rateSelectors = [
  "[vn~='VRate']",
  "[vn~='VRate'][data-disabled='true']",
  "[vn~='VRate'] [vn~='VRateInput']",
  "[vn~='VRate'] [vn~='VRateStars']",
  "[vn~='VRate'][data-focused='true'] [vn~='VRateStars']",
  "[vn~='VRate'][data-error='true'] [vn~='VRateStars']",
  "[vn~='VRate'] [vn~='VRateStar']",
  "[vn~='VRate'][data-disabled='true'] [vn~='VRateStar']",
  "[vn~='VRate'][data-readonly='true'] [vn~='VRateStar']",
  "[vn~='VRate'] [vn~='VRateStarBase']",
  "[vn~='VRate'] [vn~='VRateStarFill']",
  "[vn~='VRate'] [vn~='VRateStar'][data-filled='true'] [vn~='VRateStarFill']"
];

const cascaderSelectors = [
  "[vn~='VCascader']",
  "[vn~='VCascader'] > [vn~='VCascaderTrigger']",
  "[vn~='VCascader'] > [vn~='VCascaderTrigger'] > [vn~='VCascaderArrow']",
  "[vn~='VCascader'] > [vn~='VCascaderPanel']",
  "[vn~='VCascader'][data-open='true'] > [vn~='VCascaderPanel']",
  "[vn~='VCascaderPanel'] > [vn~='VCascaderColumns']",
  "[vn~='VCascaderColumns'] > [vn~='VCascaderColumn']",
  "[vn~='VCascaderColumns'] > [vn~='VCascaderColumn']:not(:last-child)",
  "[vn~='VCascaderColumn'] > [vn~='VCascaderOption']",
  "[vn~='VCascaderColumn'] > [vn~='VCascaderOption']:hover",
  "[vn~='VCascaderOption'][data-active='true']",
  "[vn~='VCascaderOption'] > [vn~='VCascaderOptionLabel']",
  "[vn~='VCascaderOption'] > [vn~='VCascaderOptionArrow']"
];

const routerViewsSelectors = [
  "[vn~='VRouterViews']",
  "[vn~='VRouterViews'] > [vn~='VRouterViewsTitlebar']",
  "[vn~='VRouterViews'] > [vn~='VRouterViewsContent']",
  "[vn~='VRouterViews'][data-title-position='left'] > [vn~='VRouterViewsTitlebar']",
  "[vn~='VRouterViews'][data-title-position='left'] > [vn~='VRouterViewsContent']",
  "[vn~='VRouterViews'][data-title-locked='true']",
  "[vn~='VRouterViews'][data-title-locked='true'] > [vn~='VRouterViewsTitlebar']",
  "[vn~='VRouterViews'][data-title-locked='true'] > [vn~='VRouterViewsContent']",
  "[vn~='VRouterViewsTitlebar'] > [vn~='VRouterViewsExpand']",
  "[vn~='VRouterViews'][data-title-overflow='true'] > [vn~='VRouterViewsTitlebar'] > [vn~='VRouterViewsExpand']",
  "[vn~='VRouterViewsTitle']",
  "[vn~='VRouterViewsTitle'][data-active='true']",
  "[vn~='VRouterViews'][data-title-position='top'] [vn~='VRouterViewsTitle'][data-active='true']",
  "[vn~='VRouterViews'][data-title-position='left'] [vn~='VRouterViewsTitle'][data-active='true']",
  "[vn~='VRouterViewsTitle'] > [vn~='VRouterViewsLabel']",
  "[vn~='VRouterViewsTitle'] > [vn~='VRouterViewsClose']",
  "[vn~='VRouterViews'] > [vn~='VRouterViewsPopup']",
  "[vn~='VRouterViews'][data-title-popup='true'] > [vn~='VRouterViewsPopup']",
  "[vn~='VRouterViewsPopup'] > [vn~='VRouterViewsPopupItem']",
  "[vn~='VRouterViewsPopupItem'][aria-current='true']",
  "[vn~='VRouterViewsPopupItem'] > [vn~='VRouterViewsPopupTitle']",
  "[vn~='VRouterViewsPopupItem'] > [vn~='VRouterViewsPopupClose']",
  "[vn~='VRouterViewsContext']",
  "[vn~='VRouterViewsContext'] > [vn~='VRouterViewsContextItem']",
  "[vn~='VRouterViewsContextItem'][data-danger='true']",
  "[vn~='VRouterViewsContextItem'][aria-disabled='true']",
  "[vn~='VRouterViewsPopupItem']:hover",
  "[vn~='VRouterViewsPopupItem']:hover [vn~='VRouterViewsPopupClose']",
  "[vn~='VRouterViewsTitlebar']::-webkit-scrollbar",
  "[vn~='VRouterViewsPopup']::-webkit-scrollbar",
  "[vn~='VRouterViewsContextItem']:hover",
  "[vn~='VRouterViewsContextSeparator']"
];

const tableSelectors = [
  "[vn~='VTable']",
  "[vn~='VTableScroll']",
  "[vn~='VTableGrid']",
  "[vn~='VTableCaption']",
  "[vn~='VTableCaption'][data-has-text='true']",
  "[vn~='VTh']",
  "[vn~='VTd']",
  "[vn~='VTd'][data-empty='true']"
];

const cardSelectors = [
  "[vn~='VCard']",
  "[vn~='VCardHeader']",
  "[vn~='VCardBody']",
  "[vn~='VCardFooter']"
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
  "[vn~='VNavbar']",
  "[vn~='VNavbar'][data-sticky='true']",
  "[vn~='VNavbarBrand']",
  "[vn~='VNavbarBrand'][data-divider='true']",
  "[vn~='VNavbarBrandTitle']",
  "[vn~='VNavbarBrandSubtitle']",
  "[vn~='VNavbarBrandDefault']",
  "[vn~='VNavbarBrandCustom']",
  "[vn~='VNavbarMenuSlot']",
  "[vn~='VNavbarActions']",
  "[vn~='VSteps']",
  "[vn~='VSteps'][data-direction='vertical']",
  "[vn~='VStep']",
  "[vn~='VStepsIndicator']",
  "[vn~='VStepsTitle']",
  "[vn~='VStepsDescription']",
  "[vn~='VSteps'] [vn~='VStepsTitle']:empty",
  "[vn~='VStepsConnector']",
  "[vn~='VStep'][data-status='finish'] [vn~='VStepsIndicator']",
  "[vn~='VStep'][data-status='process'] [vn~='VStepsIndicator']",
  "[vn~='VStep'][data-status='error'] [vn~='VStepsIndicator']",
  "[vn~='VStep'][data-status='finish'] [vn~='VStepsConnector']",
  "[vn~='VTabs']",
  "[vn~='VTabs'][data-orientation='vertical']",
  "[vn~='VTabsNav']",
  "[vn~='VTabsPanels']",
  "[vn~='VTabs'] [vn~='VTabIcon']:empty",
  "[vn~='VTabTrigger']",
  "[vn~='VTabTrigger'][data-active='true']",
  "[vn~='VTabTrigger'][disabled]",
  "[vn~='VTabPanel']",
  "[vn~='VTabPanel'][hidden]",
  "[vn~='VTabs'][data-variant='card'] [vn~='VTabTrigger'][data-active='true']",
  "[vn~='VTabs'][data-variant='pills'] [vn~='VTabTrigger'][data-active='true']",
  "[vn~='VBreadcrumb']",
  "[vn~='VBreadcrumb'] [vn~='VBreadcrumbList']",
  "[vn~='VBreadcrumbItem']",
  "[vn~='VBreadcrumbLink']",
  "[vn~='VBreadcrumbLink']:hover",
  "[vn~='VBreadcrumbLink']:focus-visible",
  "[vn~='VBreadcrumbCurrent']",
  "[vn~='VBreadcrumbItem'][data-current='true'] > [vn~='VBreadcrumbCurrent']",
  "[vn~='VBreadcrumbItem'][data-mode='link'] > [vn~='VBreadcrumbLink']",
  "[vn~='VBreadcrumbItem'][data-mode='text'] > [vn~='VBreadcrumbCurrent']",
  "[vn~='VBreadcrumbSeparator']",
  "[vn~='VBreadcrumbItem']:last-child > [vn~='VBreadcrumbSeparator']",
  "[vn~='VAnchor']",
  "[vn~='VAnchor'] [vn~='VAnchorList']",
  "[vn~='VAnchor'] [vn~='VAnchorItem']",
  "[vn~='VAnchor'] [vn~='VAnchorLink']",
  "[vn~='VAnchor'] [vn~='VAnchorLink']:hover",
  "[vn~='VAnchor'] [vn~='VAnchorItem'][data-active='true'] > [vn~='VAnchorLink']",
  "[vn~='VAnchor'] [vn~='VAnchorChildren']",
  "[vn~='VAnchorItem'] > [vn~='VAnchorChildren']:empty",
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
  "[vn~='VEChart']",
  "[vn~='VThree']"
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
  "[vn~='VTooltip']",
  "[vn~='VTooltipTarget']",
  "[vn~='VTooltipPanel']",
  "[vn~='VTooltip'][data-open='true'] > [vn~='VTooltipPanel']",
  "[vn~='VTooltip'][data-placement='top'] > [vn~='VTooltipPanel']",
  "[vn~='VTooltip'][data-placement='bottom-start'] > [vn~='VTooltipPanel']",
  "[vn~='VTooltip'][data-placement='left'] > [vn~='VTooltipPanel']",
  "[vn~='VTooltip'][data-placement='right-end'] > [vn~='VTooltipPanel']",
  "[vn~='VTooltip'][data-placement='top'] > [vn~='VTooltipPanel']::after",
  "[vn~='VTooltip'][data-placement='bottom'] > [vn~='VTooltipPanel']::after",
  "[vn~='VTooltip'][data-placement='left'] > [vn~='VTooltipPanel']::after",
  "[vn~='VTooltip'][data-placement='right'] > [vn~='VTooltipPanel']::after",
  "[vn~='VDialog']",
  "[vn~='VDialogHeader']",
  "[vn~='VDialog'][data-closable='false'] > [vn~='VDialogHeader']",
  "[vn~='VDialogClose']"
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
  "[vn~='VGlowButton']",
  "[vn~='VGlowButton'] [vn~='VButtonLabel']",
  "[vn~='VGlowButton'] [vn~='VButtonSpinner']",
  "[vn~='VGlowButton']::before",
  "[vn~='VGlowButton'][data-glow-play='hover']",
  "[vn~='VGlowButton'][data-glow-play='hover']:hover::before",
  "[vn~='VGlowButton'][data-glow-speed='slow']",
  "[vn~='VGlowButton'][data-glow-speed='fast']",
  "[vn~='VGlowButton'][data-glow-direction='rtl']",
  "[vn~='VGlowButton'][data-glow-strength='soft']",
  "[vn~='VGlowButton'][disabled]::before",
  "[vn~='VGlowButton'] [vn~='VGlowButtonRipple']",
  "[vn~='VGlowButton'][data-glow-motion='always']::before",
  "[vn~='VGlowButton'][data-glow-motion='always'] [vn~='VGlowButtonRipple']",
  '@keyframes yoya-glow-button-sweep',
  '@keyframes yoya-glow-button-ripple'
];

describe('CSS style contract', () => {
  it('covers the shared action batch selectors', () => {
    sharedActionSelectors.forEach((selector) => {
      expect(css, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the form item selectors', () => {
    formItemSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the select selectors', () => {
    selectSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the timer range selectors', () => {
    timerRangeSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the theme mode switch selectors', () => {
    themeSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the masonry selectors', () => {
    masonrySelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the menu / sidebar state selectors', () => {
    menuR5Selectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the tree ranger selectors', () => {
    treeRangerSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the rate selectors', () => {
    rateSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the cascader selectors', () => {
    cascaderSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the router views selectors', () => {
    routerViewsSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the table selectors', () => {
    tableSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
    });
  });

  it('covers the card selectors', () => {
    cardSelectors.forEach((selector) => {
      expect(cssFlat, `missing CSS rule for ${selector}`).toContain(selector);
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
      reducedBlocks.find((block) => block.includes("[vn~='VGlowButton']::before")) ?? '';
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
