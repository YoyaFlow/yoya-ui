import {
  ViewNode,
  applySetupValue,
  defineComponentIdentity,
  hasComponentIdentity,
  registerChildFactories
} from '../core/node.js';
import { i18n } from '../core/i18n.js';
import { HtmlElementNode } from '../html/index.js';
import { vNode } from '../core/v-node.js';
import { vDropdownMenu } from '../actions/dropdown-menu.js';
import { vMenuItem } from '../navigation/menu.js';
import {
  applyComponentArguments,
  applyElementOptions,
  isPlainObject,
  normalizeComponentArguments,
  resolveTextValue
} from '../components/shared.js';

const defaultLanguages = Object.freeze([
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en' }
]);

/**
 * vLanguageSwitch 是预制的语言切换按钮组，绑定 I18n 实例后自动同步语言。
 */
export function vLanguageSwitch(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);

  if (hasComponentIdentity(args.first, 'VLanguageSwitch')) {
    // 复用同类实例：把 options / callback 补上就返回（与 `vTree` 同一口径）
    return applyComponentArguments(args.first, args.options, args.callback);
  }

  let root = null;
  const node = vNode((api) => {
    const state = {
      ariaLabel: '切换语言',
      locale: i18n,
      languages: defaultLanguages,
      onChange: null,
      size: 'medium',
      variant: 'secondary'
    };
    let unsubscribe = null;

    // 多值身份：外面认 `VLanguageSwitch`，下拉语义仍认 `VDropdownMenu`（包装型组件共用视图）
    root = vDropdownMenu({
      closeOnSelect: true,
      placement: 'bottom-start'
    }).setup({ vn: 'VLanguageSwitch VDropdownMenu' });

    Object.assign(api, {
      activeLanguage() {
        return state.locale?.getLanguage?.();
      },
      ariaLabel(value) {
        if (value === undefined) {
          return state.ariaLabel;
        }

        state.ariaLabel = resolveTextValue(value) || state.ariaLabel;
        sync();
        return api;
      },
      change(handler) {
        return api.onChange(handler);
      },
      languages(value) {
        if (value === undefined) {
          return state.languages.map((item) => ({ ...item }));
        }

        state.languages = normalizeLanguages(value);
        sync();
        return api;
      },
      locale(value) {
        if (value === undefined) {
          return state.locale;
        }

        setLocale(value);
        sync();
        return api;
      },
      onChange(handler) {
        if (handler === undefined) {
          return state.onChange;
        }

        state.onChange = typeof handler === 'function' ? handler : null;
        return api;
      },
      size(value) {
        if (value === undefined) {
          return state.size;
        }

        state.size = normalizeSize(value);
        sync();
        return api;
      },
      variant(value) {
        if (value === undefined) {
          return state.variant;
        }

        state.variant = normalizeVariant(value);
        sync();
        return api;
      }
    });

    // 订阅清理挂在组件级钩子上（`destroy` 不再是命令：句柄就是组件节点）
    api.whenDestroy = () => {
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }
    };

    setLocale(state.locale);

    if (typeof args.first === 'function') {
      args.first(api);
    } else {
      applyOptions(args.first);
    }

    sync();
    return root;

    function applyOptions(options) {
      if (!isPlainObject(options)) {
        return;
      }

      const {
        ariaLabel,
        attrs,
        className,
        languages,
        locale,
        onChange,
        size,
        style,
        variant,
        ...elementConfig
      } = options;

      if (Object.keys(elementConfig).length > 0) {
        root.setup(elementConfig);
      }

      if (attrs) {
        applyElementOptions(root, { attrs });
      }

      if (style) {
        applyElementOptions(root, { style });
      }

      if (className !== undefined) {
        root.className(className);
      }

      if (ariaLabel !== undefined) {
        state.ariaLabel = resolveTextValue(ariaLabel) || state.ariaLabel;
      }

      if (locale !== undefined) {
        setLocale(locale);
      }

      if (languages !== undefined) {
        state.languages = normalizeLanguages(languages);
      }

      if (onChange !== undefined) {
        state.onChange = typeof onChange === 'function' ? onChange : null;
      }

      if (size !== undefined) {
        state.size = normalizeSize(size);
      }

      if (variant !== undefined) {
        state.variant = normalizeVariant(variant);
      }
    }

    function selectLanguage(option) {
      if (option.disabled || !state.locale || option.value === state.locale.getLanguage()) {
        return;
      }

      state.locale.setLanguage(option.value);
      root.close();
      sync();

      if (typeof state.onChange === 'function') {
        state.onChange(option, state.locale);
      }
    }

    function setLocale(locale) {
      if (!locale || typeof locale.setLanguage !== 'function' || locale === state.locale) {
        return;
      }

      if (unsubscribe) {
        unsubscribe();
      }

      state.locale = locale;
      unsubscribe = locale.subscribe(() => sync());
    }

    function sync() {
      const currentLanguage = state.locale?.getLanguage?.() || '';
      const currentOption = state.languages.find((option) => option.value === currentLanguage) || {
        label: currentLanguage,
        value: currentLanguage
      };

      root.attr('aria-label', state.ariaLabel || '切换语言');
      root.attr('data-language', currentLanguage);
      root.attr('data-size', state.size);
      root.attr('data-variant', state.variant);

      root.trigger((button) => {
        button.label(currentOption.label);
        button.size(state.size);
        button.variant(state.variant);
        button.attr('aria-label', state.ariaLabel || '切换语言');
        button.attr('data-language', currentLanguage);
      });

      root.menuContent((menu) => {
        state.languages.forEach((option) => {
          const item = vMenuItem((entry) => {
            entry.label(option.label);
            entry.active(option.value === currentLanguage);
            entry.attr({
              'data-language': option.value,
              'data-language-option': 'true'
            });

            if (option.disabled) {
              entry.disabled(true);
            }
          });

          if (!option.disabled) {
            item.on('click', () => selectLanguage(option));
          }

          menu.child(item);
        });
      });

      return api;
    }
  });

  applySetupValue(node, args.callback);
  if (root && args.options) {
    // 第二参 options 与旧口径一致：只落元素级配置（attrs / style）
    applyElementOptions(root, args.options);
  }
  return node;
}

export const LanguageSwitch = vLanguageSwitch;
export const VLanguageSwitch = vLanguageSwitch;
defineComponentIdentity(VLanguageSwitch, 'VLanguageSwitch');

registerChildFactories(HtmlElementNode, { vLanguageSwitch });

function normalizeLanguages(value) {
  const source = Array.isArray(value) && value.length > 0 ? value : defaultLanguages;

  return source
    .map((option, index) => {
      if (Array.isArray(option)) {
        const [rawValue, rawLabel] = option;
        const resolvedValue = resolveTextValue(rawValue);

        return {
          disabled: false,
          label: rawLabel ?? resolvedValue,
          value: resolvedValue || `language-${index}`
        };
      }

      if (option instanceof ViewNode) {
        const text = option.textContent();

        return {
          disabled: false,
          label: option,
          value: text || `language-${index}`
        };
      }

      if (isPlainObject(option)) {
        const rawValue =
          option.value ??
          option.key ??
          option.id ??
          option.label ??
          option.text ??
          option.title ??
          `language-${index}`;
        const resolvedValue = resolveTextValue(rawValue);

        return {
          disabled: Boolean(option.disabled),
          label: option.label ?? option.text ?? option.content ?? option.title ?? resolvedValue,
          value: resolvedValue || `language-${index}`
        };
      }

      const resolvedValue = resolveTextValue(option);

      return {
        disabled: false,
        label: resolvedValue,
        value: resolvedValue
      };
    })
    .filter((option) => option.value !== '');
}

function normalizeSize(value) {
  return ['small', 'medium', 'large'].includes(value) ? value : 'medium';
}

function normalizeVariant(value) {
  return ['primary', 'secondary'].includes(value) ? value : 'secondary';
}
