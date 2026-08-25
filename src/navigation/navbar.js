import { HtmlElementNode } from '../html/index.js';
import { VMenu } from './menu.js';
import {
  applyComponentSetup,
  componentClass,
  createComponentFactory,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  setupContentSlot,
  themeBorder
} from '../components/shared.js';

let navbarSequence = 0;

export class VNavbar extends HtmlElementNode {
  constructor(setup = null) {
    super('nav', null);
    const menuId = `yoya-vnavbar-menu-${++navbarSequence}`;

    this._brandTitle = new HtmlElementNode('strong').className('yoya-vnavbar-brand-title');
    this._brandSubtitle = new HtmlElementNode('span').className('yoya-vnavbar-brand-subtitle');
    this._brandDefault = new HtmlElementNode('div')
      .className('yoya-vnavbar-brand-default')
      .child(this._brandTitle, this._brandSubtitle);
    this._brandCustom = new HtmlElementNode('div').className('yoya-vnavbar-brand-custom');
    this._brandBox = new HtmlElementNode('div')
      .className('yoya-vnavbar-brand')
      .child(this._brandDefault, this._brandCustom);

    this._menu = new VMenu()
      .id(menuId)
      .className('yoya-vnavbar-menu')
      .attr('aria-label', '导航菜单');
    this._menu.horizontal();
    this._menuWrapper = new HtmlElementNode('div')
      .className('yoya-vnavbar-menu-slot')
      .child(this._menu);
    this._actionsBox = new HtmlElementNode('div').className('yoya-vnavbar-actions');

    this.className(componentClass, 'yoya-vnavbar');
    this.attr({ 'aria-label': '导航栏', role: 'navigation' });
    this.child(this._brandBox, this._menuWrapper, this._actionsBox);
    this._setupNavbar(setup);
  }

  ariaLabel(content) {
    const label = resolveTextValue(content) || '导航栏';
    this.attr('aria-label', label);
    this._menu.attr('aria-label', `${label}菜单`);
    return this;
  }

  title(content) {
    this._showDefaultBrand();
    replaceChildren(this._brandTitle, normalizeChildren(content));
    this._brandTitle.style('display', resolveTextValue(content) ? null : 'none');
    this._syncBrandDivider();
    return this;
  }

  subtitle(content) {
    this._showDefaultBrand();
    replaceChildren(this._brandSubtitle, normalizeChildren(content));
    this._brandSubtitle.style('display', resolveTextValue(content) ? null : 'none');
    this._syncBrandDivider();
    return this;
  }

  brand(setup) {
    if (setup === undefined) {
      return this._brandBox;
    }

    if (setup === null) {
      this._showDefaultBrand();
      this._syncBrandDivider();
      return this;
    }

    this._showCustomBrand();
    setupContentSlot(this._brandCustom, setup);
    this._syncBrandDivider();
    return this;
  }

  menuContent(setup) {
    if (setup === undefined) {
      return this._menu;
    }

    setupContentSlot(this._menu, setup);
    return this;
  }

  actions(setup) {
    if (setup === undefined) {
      return this._actionsBox;
    }

    setupContentSlot(this._actionsBox, setup);
    return this;
  }

  _showDefaultBrand() {
    setupContentSlot(this._brandCustom, null);
    this._brandCustom.style('display', 'none');
    this._brandDefault.style('display', null);
    return this;
  }

  _showCustomBrand() {
    this._brandDefault.style('display', 'none');
    this._brandCustom.style('display', null);
    return this;
  }

  _syncBrandDivider() {
    const hasBrandContent = Boolean(
      this._brandDefault.textContent().trim() || this._brandCustom.textContent().trim()
    );

    this._brandBox.styles({
      borderRight: hasBrandContent ? themeBorder('color-border-faint', '#e2e8f0') : null,
      paddingRight: hasBrandContent ? '14px' : null
    });
    return this;
  }

  _setupNavbar(setup) {
    if (setup === null || setup === undefined) {
      return;
    }

    if (typeof setup === 'function') {
      setup(this);
      return;
    }

    if (isPlainObject(setup)) {
      const {
        actions,
        ariaLabel,
        brand,
        children,
        content,
        menu,
        menuContent,
        subtitle,
        title,
        ...elementConfig
      } = setup;

      if (Object.keys(elementConfig).length > 0) {
        super._setupObject(elementConfig);
      }

      const hasCustomBrand = brand !== undefined && brand !== null;

      if (brand !== undefined) {
        this.brand(brand);
      } else if (title !== undefined) {
        this.title(title);
      }

      if (subtitle !== undefined && !hasCustomBrand) {
        this.subtitle(subtitle);
      }

      const navigation = menuContent ?? menu ?? content ?? children;
      if (navigation !== undefined) {
        this.menuContent(navigation);
      }

      if (actions !== undefined) {
        this.actions(actions);
      }

      if (ariaLabel !== undefined) {
        this.ariaLabel(ariaLabel);
      }

      return;
    }

    applyComponentSetup(this, setup);
  }
}

export function vNavbar(first = null, second = null, third = null) {
  return createComponentFactory(VNavbar, first, second, third);
}
