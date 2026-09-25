import { ViewNode, registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { i18n } from '@yoyaflow/yoya-core/internal/core/i18n.js';
import { HtmlElementNode } from '@yoyaflow/yoya-core/html';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { vDropdownMenu } from '../actions/dropdown-menu.js';
import { vMenuItem } from '../navigation/menu.js';
import { createComponentShortcut, isPlainObject, resolveTextValue } from '../components/shared.js';

const defaultLanguages = Object.freeze([
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en' }
]);

/**
 * 语言切换（形态 B，包装型）：**定义函数吃 props**、快捷方法按标准分派；
 * 视图根是内层 `vDropdownMenu`（多值身份 `VLanguageSwitch VDropdownMenu`），
 * 语言变化通过 `locale.subscribe()` 订阅、`whenDestroy` 退订。
 *
 * props：`{ locale, languages, ariaLabel, size, variant, onChange, ...元素选项 }`；
 * 位置参数里的函数 = 构建回调（句柄就是本组件）、对象 = 元素级配置（与旧第二参同口径）。
 */
export function VLanguageSwitch({
  ariaLabel,
  languages,
  locale,
  onChange,
  size,
  variant,
  ...elementOptions
} = {}) {
  // 与旧实现同序：state.locale 先用全局 `i18n` 起，再 `setLocale(props.locale)`
  // （`setLocale` 只在"不同实例"时才订阅，所以这里刻意不把 props.locale 直接写进 state）
  const state = {
    ariaLabel: resolveTextValue(ariaLabel) || '切换语言',
    languages: languages === undefined ? defaultLanguages : normalizeLanguages(languages),
    locale: i18n,
    onChange: typeof onChange === 'function' ? onChange : null,
    size: normalizeSize(size ?? 'medium'),
    variant: normalizeVariant(variant ?? 'secondary')
  };
  const initialLocale = locale ?? i18n;

  let unsubscribe = null;
  const node = vNode((api) => {
    // 多值身份：外面认 `VLanguageSwitch`，下拉语义仍认 `VDropdownMenu`（包装型组件共用视图）
    const root = vDropdownMenu({
      closeOnSelect: true,
      placement: 'bottom-start',
      ...elementOptions
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

    setLocale(initialLocale);
    sync();

    return root;

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

  return node;
}

export const vLanguageSwitch = createComponentShortcut(VLanguageSwitch, { props: true });

/** 旧别名（无 `v` 前缀的写法）：与快捷方法同一个函数。 */
export const LanguageSwitch = vLanguageSwitch;

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
