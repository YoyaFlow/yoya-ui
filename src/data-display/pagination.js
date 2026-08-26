import { ViewNode, VTextNode } from '../core/node.js';
import { HtmlElementNode } from '../html/index.js';
import {
  componentClass,
  applyComponentArguments,
  normalizeComponentArguments,
  isPlainObject,
  normalizeChildren,
  replaceChildren,
  resolveTextValue,
  themeBorder,
  themeValue
} from '../components/shared.js';

let paginationSequence = 0;

export function VPagination(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  const sequence = ++paginationSequence;
  const state = {
    ariaLabel: '分页',
    page: 1,
    pageSize: 10,
    pageSizes: [],
    total: 0,
    totalPages: 1
  };

  let root = null;
  let changeHandler = null;

  const rootId = `yoya-vpagination-${sequence}`;
  const pageInputId = `yoya-vpagination-page-${sequence}`;
  const pageSizeId = `yoya-vpagination-size-${sequence}`;

  const totalText = new VTextNode('共 0 条');
  const pageText = new VTextNode('第 1 / 1 页');
  const summary = new HtmlElementNode('div')
    .className('yoya-vpagination-summary')
    .attr('aria-live', 'polite')
    .styles({
      display: 'grid',
      gap: '2px'
    });
  const controls = new HtmlElementNode('div').className('yoya-vpagination-controls').styles({
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px'
  });
  const jumpGroup = new HtmlElementNode('div').className('yoya-vpagination-jump').styles({
    alignItems: 'center',
    display: 'inline-flex',
    gap: '6px'
  });
  const sizeGroup = new HtmlElementNode('div').className('yoya-vpagination-size').styles({
    alignItems: 'center',
    display: 'inline-flex',
    gap: '6px'
  });

  const firstButton = createActionButton('first', '首页');
  const previousButton = createActionButton('previous', '上一页');
  const nextButton = createActionButton('next', '下一页');
  const lastButton = createActionButton('last', '尾页');
  const jumpButton = createActionButton('jump', '前往');
  const pageInput = new HtmlElementNode('input')
    .className('yoya-vpagination-page-input')
    .attr({
      'aria-label': '跳转页码',
      'data-role': 'page-input',
      id: pageInputId,
      inputmode: 'numeric',
      min: '1',
      step: '1',
      type: 'number',
      value: '1'
    })
    .styles({
      boxSizing: 'border-box',
      minWidth: '72px',
      width: '72px'
    });
  const jumpLabel = new HtmlElementNode('label')
    .className('yoya-vpagination-jump-label')
    .attr('for', pageInputId)
    .styles({
      color: themeValue('color-text-secondary', '#475569'),
      fontSize: '12px',
      fontWeight: '600'
    });
  const jumpSuffix = new HtmlElementNode('span')
    .className('yoya-vpagination-jump-suffix')
    .styles({
      color: themeValue('color-text-muted', '#64748b'),
      fontSize: '12px'
    })
    .text('页');
  const pageSizeLabel = new HtmlElementNode('label')
    .className('yoya-vpagination-size-label')
    .attr('for', pageSizeId)
    .styles({
      color: themeValue('color-text-secondary', '#475569'),
      fontSize: '12px',
      fontWeight: '600'
    });
  const pageSizeSelect = new HtmlElementNode('select')
    .className('yoya-vpagination-page-size')
    .attr({
      'aria-label': '每页条数',
      'data-role': 'page-size',
      id: pageSizeId
    })
    .styles({
      boxSizing: 'border-box',
      minWidth: '92px',
      width: 'auto'
    });

  root = new HtmlElementNode('nav')
    .className(componentClass, 'yoya-vpagination')
    .attr({
      'aria-label': state.ariaLabel,
      id: rootId
    })
    .styles({
      alignItems: 'center',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      justifyContent: 'space-between',
      minWidth: '0',
      padding: '4px 0'
    });

  root.child(summary, controls, sizeGroup);
  summary.child(totalText, pageText);
  controls.child(firstButton, previousButton, jumpGroup, nextButton, lastButton);
  jumpGroup.child(jumpLabel, pageInput, jumpSuffix, jumpButton);
  sizeGroup.child(pageSizeLabel, pageSizeSelect);

  pageInput.on('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      jumpToPage();
    }
  });
  jumpButton.on('click', () => jumpToPage());
  firstButton.on('click', () => setPage(1, true));
  previousButton.on('click', () => setPage(state.page - 1, true));
  nextButton.on('click', () => setPage(state.page + 1, true));
  lastButton.on('click', () => setPage(state.totalPages, true));
  pageSizeSelect.on('change', () => {
    const nextValue = normalizePageSizeValue(
      pageSizeSelect._el?.value ?? pageSizeSelect.attr('value')
    );
    if (nextValue !== null) {
      setPageSize(nextValue, true);
    }
  });

  const api = {
    change(handler) {
      if (handler === undefined) {
        return changeHandler;
      }

      changeHandler = typeof handler === 'function' ? handler : null;
      return api;
    },
    onChange(handler) {
      return api.change(handler);
    },
    page(value) {
      if (value === undefined) {
        return state.page;
      }

      setPage(value, false);
      return api;
    },
    pageSize(value) {
      if (value === undefined) {
        return state.pageSize;
      }

      setPageSize(value, false);
      return api;
    },
    pageSizes(value) {
      if (value === undefined) {
        return state.pageSizes.slice();
      }

      state.pageSizes = normalizePageSizeOptions(value);
      sync();
      return api;
    },
    total(value) {
      if (value === undefined) {
        return state.total;
      }

      state.total = normalizeTotal(value);
      state.totalPages =
        state.total === 0 ? 1 : Math.max(1, Math.ceil(state.total / state.pageSize));
      sync();
      return api;
    },
    totalPages(value) {
      if (value === undefined) {
        return state.totalPages;
      }

      state.totalPages = normalizeTotalPages(value);
      sync();
      return api;
    },
    update(result = {}) {
      if (isPlainObject(result)) {
        const { page, pageSize, pageSizes, total, totalPages } = result;

        if (pageSizes !== undefined) {
          state.pageSizes = normalizePageSizeOptions(pageSizes);
        }

        if (pageSize !== undefined) {
          state.pageSize = normalizePageSizeValue(pageSize) ?? state.pageSize;
        }

        if (total !== undefined) {
          state.total = normalizeTotal(total);
        }

        if (totalPages !== undefined) {
          state.totalPages = normalizeTotalPages(totalPages);
        } else {
          state.totalPages =
            state.total > 0 ? Math.max(1, Math.ceil(state.total / state.pageSize)) : 1;
        }

        if (page !== undefined) {
          state.page = normalizePageValue(page);
        }

        if (state.total === 0) {
          state.page = 1;
        } else {
          state.page = clampPage(state.page);
        }
      }

      sync();
      return api;
    },
    render() {
      sync();
      return root;
    }
  };

  applyPaginationSetup(args.first);
  sync();
  applyComponentArguments(api, args.options, args.callback);
  return api;

  function applyPaginationSetup(value) {
    if (value === null || value === undefined) {
      return;
    }

    if (typeof value === 'function') {
      value(api);
      return;
    }

    if (isPlainObject(value)) {
      const {
        ariaLabel,
        change,
        children,
        className,
        onChange,
        page,
        pageSize,
        pageSizes,
        total,
        totalPages,
        ...elementConfig
      } = value;

      if (Object.keys(elementConfig).length > 0) {
        root.setup(elementConfig);
      }

      if (className !== undefined) {
        root.className(className);
      }

      if (ariaLabel !== undefined) {
        state.ariaLabel = resolveTextValue(ariaLabel) || state.ariaLabel;
      }

      if (pageSizes !== undefined) {
        state.pageSizes = normalizePageSizeOptions(pageSizes);
      }

      if (total !== undefined) {
        state.total = normalizeTotal(total);
      }

      if (pageSize !== undefined) {
        state.pageSize = normalizePageSizeValue(pageSize) ?? state.pageSize;
      }

      if (totalPages !== undefined) {
        state.totalPages = normalizeTotalPages(totalPages);
      }

      if (page !== undefined) {
        state.page = normalizePageValue(page);
      }

      if (totalPages === undefined && state.total > 0) {
        state.totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
      }

      if (typeof change === 'function') {
        changeHandler = change;
      } else if (typeof onChange === 'function') {
        changeHandler = onChange;
      }

      if (children !== undefined) {
        root.child(children);
      }

      return;
    }
  }

  function createActionButton(action, label) {
    const control = new HtmlElementNode('button')
      .className('yoya-vpagination-button')
      .attr({
        'data-action': action,
        type: 'button'
      })
      .styles({
        background: themeValue('color-surface', '#ffffff'),
        border: themeBorder('color-border-strong', '#cbd5e1'),
        borderRadius: '6px',
        color: themeValue('color-text', '#172033'),
        cursor: 'pointer',
        font: 'inherit',
        lineHeight: '1',
        padding: '6px 10px',
        whiteSpace: 'nowrap'
      });

    replaceChildren(control, normalizeChildren(label));
    return control;
  }

  function normalizePageSizeValue(value) {
    const parsed = Number(resolveTextValue(value));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return null;
    }

    return Math.max(1, Math.floor(parsed));
  }

  function normalizeTotal(value) {
    const parsed = Number(resolveTextValue(value));

    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }

    return Math.floor(parsed);
  }

  function normalizeTotalPages(value) {
    const parsed = Number(resolveTextValue(value));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }

    return Math.max(1, Math.floor(parsed));
  }

  function normalizePageValue(value) {
    const parsed = Number(resolveTextValue(value));

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 1;
    }

    return Math.floor(parsed);
  }

  function normalizePageSizeOptions(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((option, index) => {
        if (Array.isArray(option) && option.length > 0) {
          const [rawValue, rawLabel = undefined] = option;
          const resolvedValue = resolveTextValue(rawValue);

          return {
            disabled: false,
            label: rawLabel ?? `${resolvedValue} / 页`,
            value: resolvedValue || `page-size-${index}`
          };
        }

        if (option instanceof ViewNode) {
          const text = option.textContent();

          return {
            disabled: false,
            label: option,
            value: text || `page-size-${index}`
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
            `page-size-${index}`;
          const resolvedValue = resolveTextValue(rawValue);

          return {
            disabled: Boolean(option.disabled),
            label:
              option.label ??
              option.text ??
              option.content ??
              option.title ??
              `${resolvedValue} / 页`,
            value: resolvedValue || `page-size-${index}`
          };
        }

        const resolvedValue = resolveTextValue(option);

        return {
          disabled: false,
          label: `${resolvedValue} / 页`,
          value: resolvedValue || `page-size-${index}`
        };
      })
      .filter((option) => option.value !== '');
  }

  function renderPageSizeOptions() {
    const normalizedOptions = normalizePageSizeOptions(state.pageSizes);

    if (normalizedOptions.length === 0) {
      sizeGroup.style('display', 'none');
      replaceChildren(pageSizeSelect, []);
      return;
    }

    const selectedValue = String(state.pageSize);
    const hasSelectedValue = normalizedOptions.some((option) => option.value === selectedValue);
    const options = hasSelectedValue
      ? normalizedOptions
      : [{ disabled: false, label: `${selectedValue} / 页`, value: selectedValue }].concat(
          normalizedOptions
        );

    sizeGroup.style('display', null);
    replaceChildren(
      pageSizeSelect,
      options.map((option, index) => {
        const item = new HtmlElementNode('option').className('yoya-vpagination-page-size-option');
        item.attr({
          disabled: option.disabled ? true : null,
          selected: option.value === selectedValue ? true : null,
          value: option.value
        });
        replaceChildren(item, normalizeChildren(option.label));
        item.attr('data-option-index', String(index));
        return item;
      })
    );
    pageSizeSelect.attr('value', selectedValue);
  }

  function clampPage(value) {
    if (state.total === 0) {
      return 1;
    }

    const minPage = 1;
    const maxPage = Math.max(1, state.totalPages);
    return Math.min(Math.max(minPage, normalizePageValue(value)), maxPage);
  }

  function setButtonState(node, disabled) {
    node.attr('disabled', disabled ? true : null);
    node.attr('aria-disabled', disabled ? 'true' : null);
    node.style('cursor', disabled ? 'not-allowed' : 'pointer');
    node.style('opacity', disabled ? '0.56' : '1');
  }

  function sync() {
    state.total = normalizeTotal(state.total);
    state.pageSize = normalizePageSizeValue(state.pageSize) ?? 1;
    state.totalPages = state.total === 0 ? 1 : Math.max(1, normalizeTotalPages(state.totalPages));
    state.page = state.total === 0 ? 1 : clampPage(state.page);

    root.attr('aria-label', state.ariaLabel || '分页');
    root.attr('data-empty', state.total === 0 ? 'true' : null);
    root.attr('data-page', String(state.page));
    root.attr('data-page-size', String(state.pageSize));
    root.attr('data-total', String(state.total));
    root.attr('data-total-pages', String(state.totalPages));
    totalText.textContent(`共 ${state.total} 条`);
    pageText.textContent(`第 ${state.page} / ${state.totalPages} 页`);

    pageInput.attr({
      disabled: state.total === 0 ? true : null,
      max: String(state.totalPages),
      min: '1',
      value: String(state.page)
    });
    pageInput.attr('aria-disabled', state.total === 0 ? 'true' : null);
    jumpButton.attr('disabled', state.total === 0 ? true : null);
    jumpButton.attr('aria-disabled', state.total === 0 ? 'true' : null);

    setButtonState(firstButton, state.total === 0 || state.page <= 1);
    setButtonState(previousButton, state.total === 0 || state.page <= 1);
    setButtonState(nextButton, state.total === 0 || state.page >= state.totalPages);
    setButtonState(lastButton, state.total === 0 || state.page >= state.totalPages);

    renderPageSizeOptions();

    return api;
  }

  function emitChange() {
    if (typeof changeHandler === 'function') {
      changeHandler({
        page: state.page,
        pageSize: state.pageSize
      });
    }
  }

  function setPage(value, emit = false) {
    if (state.total === 0) {
      sync();
      return api;
    }

    const nextPage = clampPage(value);

    if (nextPage !== state.page) {
      state.page = nextPage;
      sync();
      if (emit) {
        emitChange();
      }
      return api;
    }

    sync();
    return api;
  }

  function setPageSize(value, emit = false) {
    const nextPageSize = normalizePageSizeValue(value);

    if (nextPageSize === null) {
      sync();
      return api;
    }

    const changed = nextPageSize !== state.pageSize;

    if (changed) {
      state.pageSize = nextPageSize;
      state.page = 1;
      state.totalPages =
        state.total === 0 ? 1 : Math.max(1, Math.ceil(state.total / state.pageSize));
    }

    sync();

    if (emit && changed) {
      emitChange();
    }

    return api;
  }

  function jumpToPage() {
    if (state.total === 0) {
      return api;
    }

    const rawValue = pageInput._el?.value ?? pageInput.attr('value');
    const nextPage = normalizePageValue(rawValue);

    if (nextPage <= 0) {
      return api;
    }

    return setPage(nextPage, true);
  }
}

export function vPagination(first = null, second = null, third = null) {
  const args = normalizeComponentArguments(first, second, third);
  if (
    args.first &&
    typeof args.first.render === 'function' &&
    typeof args.first.update === 'function'
  ) {
    return applyComponentArguments(args.first, args.options, args.callback);
  }

  return applyComponentArguments(VPagination(args.first), args.options, args.callback);
}
