import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { ViewNode, vText } from '../core/index.js';
import { a, li, nav, ol, span } from '../html/index.js';
import {
  createComponentShortcut,
  createListItemKey,
  resolveTextValue
} from '../components/shared.js';

/**
 * 面包屑导航（票 15 §4；2026-09-23 按「容器组件」口径重写，参考实现 `VTable` / `VAnchor` / `VSteps`）。
 *
 * - **结构一次写清、部件常驻**：
 *   `nav[VBreadcrumb] > ol[VBreadcrumbList] > li[VBreadcrumbItem] > a[VBreadcrumbLink] + span[VBreadcrumbCurrent] + span[VBreadcrumbSeparator]`；
 *   列表是导航的**匿名占位**（`vn_slot: ''`）——`breadcrumb.child(item)` 照旧落进这张 `<ol>`；
 * - **列表 = 一份 `ref([])` + `keyed` 对账**：层级只从 `items` / `vBreadcrumbItem` 来，增删改排序由引擎按
 *   身份键复用 / 搬动 / 销毁——不 `destroy()` 全量重建、也不 rebuild；`data-item-count` 直接读这份数据；
 * - **链接位 / 当前位 / 分隔符都是内部块**（R11 / R12：位置由组件自己定，调用方不按名投递），两块内容是
 *   **同一份数据**：文本 / 句柄两个盒都有，"链接还是当前文本"由根上的 `data-mode`（加上 `data-current`）
 *   交给 CSS 规则（R5，JS 不再写行内 `display`）；
 * - **分隔符是容器态**：容器持有那一份句柄，项通过 `track(context)` 拿到它（与 `VSteps` 同口径），命令只写
 *   这一份数据；最后一项的分隔符由 `:last-child` 规则隐掉（原来那条行内 `display` 与既有规则重复）；
 * - 文本是数据（节点文案在构建期走 props，`label()` 命令只收文本）；静态样式在 `yoya.ui.css`（R5）。
 */

const DEFAULT_ARIA_LABEL = '面包屑';
const DEFAULT_SEPARATOR = '›';

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const BREADCRUMB_ITEM = Symbol('yoya.breadcrumbItem');

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

/** 列表归一：数组原样、空值成空表、其余单值成一项。 */
const asList = (value) =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * 面包屑层级（形态 B）：结构 = `li > a[VBreadcrumbLink] + span[VBreadcrumbCurrent] + span[VBreadcrumbSeparator]`。
 * 字符串 = 文案；props 见 `BreadcrumbItemOptions`；容器态（分隔符）由 `track(context)` 进来。
 */
export function VBreadcrumbItem({
  active,
  children: labelOption,
  content,
  current,
  href = null,
  label,
  text,
  to,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // 文案：节点在构建期落位；文本 / 句柄是活值（`label` / `text` / `content` / `children` 四键同义）
  const initialLabel = label ?? text ?? content ?? labelOption ?? null;
  const labelNode = initialLabel instanceof ViewNode ? initialLabel : null;
  const labelState = asSignal(labelNode === null ? initialLabel : null);
  const labelText = computed(() => textOf(labelState.value));
  const hasLabel = computed(() => labelText.value !== '');

  // 地址：句柄原样存、`String(…)` 放读时；`null` / 空串 = 没有地址（属性摘掉、也不是链接）
  const hrefState = asSignal(href ?? to);
  const hrefAttr = computed(() => {
    const value = hrefState.value;
    return value === null || value === undefined || value === '' ? null : textOf(value);
  });
  const hasHref = computed(() => hrefAttr.value !== null);

  // 当前态：`active` / `current` 两键同义（都给了以 `active` 为准）
  const activeState = asSignal(active ?? current ?? false);
  const isCurrent = computed(() => Boolean(activeState.value));

  /** 容器给的分隔符（与步骤条同口径的内部协议）；脱离容器时回落到默认分隔符。 */
  const context = ref(null);
  const separatorText = computed(
    () => textOf(context.value?.separator?.value) || DEFAULT_SEPARATOR
  );

  /**
   * 呈现模式：有地址且不是当前项 → 链接位；否则 → 当前文本位（迁移前这两条 `display` 写在行内，
   * 现在由根上的 `data-mode` 交给 CSS 规则）。节点文案只能挂一处，跟着模式落进当时可见的那个盒。
   */
  const mode = computed(() => (hasHref.value && !isCurrent.value ? 'link' : 'text'));

  return vNode((api) => {
    api.label = (next) => {
      if (next === undefined) {
        return labelText.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vBreadcrumbItem.label(node)：文案命令只收文本，节点文案请在构建期用 props.label 给。'
        );
      }

      labelState.value = next ?? null;
      return api;
    };

    api.text = (next) => (next === undefined ? labelText.value : api.label(next));
    api.content = (next) => (next === undefined ? labelText.value : api.label(next));

    api.href = (next) => {
      if (next === undefined) {
        return hrefAttr.value;
      }

      hrefState.value = next ?? null;
      return api;
    };

    api.to = (next) => api.href(next);

    /** 当前态：`true` 写入（与迁移前同口径：无参 = 标记为当前项）。 */
    api.active = (next = true) => {
      activeState.value = Boolean(next);
      return api;
    };

    api.current = (next = true) => api.active(next);

    /** 容器把分隔符句柄交给项（与 `VStep.track` 同口径的内部协议）。 */
    api.track = (next) => {
      context.value = next ?? null;
      return api;
    };

    /** 字符串 / 数字 = 层级文案（与迁移前 `_setupBreadcrumbItem` 的兜底分支同口径）。 */
    api.setupString = (value) => api.label(value);

    return li(
      {
        ...elementConfig,
        attrs: { ...restAttrs, 'aria-current': computed(() => (isCurrent.value ? 'page' : null)) },
        'data-current': computed(() => (isCurrent.value ? 'true' : null)),
        'data-mode': mode,
        vn: 'VBreadcrumbItem'
      },
      (item) =>
        item.child(
          // 链接位：有地址且不是当前项时才是链接（显隐交给 `[data-mode]` 规则）
          a({ vn: 'VBreadcrumbLink' }, (link) => {
            link.attr('href', hrefAttr);

            if (labelNode !== null && mode.value === 'link') {
              link.child(labelNode);
            }

            link.child(vText(labelText).mountable(hasLabel));
          }),

          // 当前位：没有地址或已经是当前项时显示（内容与链接位同一份数据）
          span({ vn: 'VBreadcrumbCurrent' }, (box) => {
            if (labelNode !== null && mode.value === 'text') {
              box.child(labelNode);
            }

            box.child(vText(labelText).mountable(hasLabel));
          }),

          // 分隔符位：内容来自容器那份句柄，最后一项由 `:last-child` 规则隐掉
          span({ attrs: { 'aria-hidden': 'true' }, vn: 'VBreadcrumbSeparator' }, (box) =>
            box.child(vText(separatorText))
          )
        )
    );
  });
}

const breadcrumbItemShortcut = createComponentShortcut(VBreadcrumbItem, { props: true });

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vBreadcrumbItem(...args) {
  const node = breadcrumbItemShortcut(...args);
  // 标在节点上而不是查组件名：本容器自己认自己的层级
  node[BREADCRUMB_ITEM] = true;
  return node;
}

/**
 * 面包屑容器：`nav > ol[VBreadcrumbList]`；层级只从 `items` / `vBreadcrumbItem` 来——
 * 匿名 `child()` 的内容照旧渲染（落进那张 `<ol>`），但不计入层级数（见 16 号清单第 7 / 84 条）。
 */
export function VBreadcrumb({
  ariaLabel,
  children: itemOptions,
  items,
  separator = DEFAULT_SEPARATOR,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // props 全是**数据**：句柄原样收下，归一（默认值 / 空）放在读时的派生上
  const ariaLabelState = asSignal(ariaLabel ?? DEFAULT_ARIA_LABEL);
  const ariaLabelText = computed(() => textOf(ariaLabelState.value) || DEFAULT_ARIA_LABEL);

  const separatorState = asSignal(separator);
  const separatorText = computed(() => textOf(separatorState.value) || DEFAULT_SEPARATOR);

  /** 层级：一份数据源（结构由 keyed 对账；计数与分隔符都读它）。 */
  const itemNodes = ref([]);
  const itemCount = computed(() => String(itemNodes.value.length));
  const keyOfItem = createListItemKey('breadcrumb-item');

  return vNode((api) => {
    /**
     * 容器态：分隔符句柄。项通过 `track(context)` 拿到它、自己写自己的分隔符文本
     * （容器不遍历每一项，也不替项写内容）。
     */
    const context = { separator: separatorText };

    /** 建 / 复用一份层级，并把容器态句柄交给它。 */
    const wireItem = (setup) => {
      const item = normalizeBreadcrumbItem(setup);
      item.track(context);
      return item;
    };

    api.ariaLabel = (content) => {
      if (content === undefined) {
        return ariaLabelText.value;
      }

      ariaLabelState.value = content ?? null;
      return api;
    };

    api.separator = (content) => {
      if (content === undefined) {
        return separatorState.value;
      }

      // 与迁移前同口径：`null` / 空串都回落到默认分隔符
      separatorState.value =
        content === null || content === '' ? DEFAULT_SEPARATOR : (content ?? DEFAULT_SEPARATOR);
      return api;
    };

    /** 追加一份层级：只写数据，结构交给 `keyed` 对账。 */
    api.vBreadcrumbItem = (setup) => {
      itemNodes.value = [...itemNodes.value, wireItem(setup)];
      return api;
    };

    /** 层级整批替换：写一份新数组（留下来的项按身份键复用，离场的销毁）。 */
    api.items = (value) => {
      if (value === undefined) {
        return itemNodes.value.slice();
      }

      itemNodes.value = asList(value).map(wireItem);
      return api;
    };

    /** 字符串 / 数字 = 一条层级（只有文案）。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
    };

    const initialItems = items ?? itemOptions;

    if (initialItems !== undefined) {
      api.items(initialItems);
    }

    return nav(
      {
        ...elementConfig,
        attrs: { ...restAttrs, 'aria-label': ariaLabelText },
        'data-item-count': itemCount,
        'data-separator': separatorText,
        vn: 'VBreadcrumb'
      },
      (root) =>
        root.child(
          // 列表位（常驻）：层级从 itemNodes 对账；匿名投递的内容也落在这里
          ol({ vn: 'VBreadcrumbList', vn_slot: '' }, (list) =>
            list.keyed(itemNodes, keyOfItem, (node) => node)
          )
        )
    );
  });
}

export const vBreadcrumb = createComponentShortcut(VBreadcrumb, { props: true });

/** 层级归一：已经是本模块造的项就原样用，其余按项的标准分派建一份。 */
function normalizeBreadcrumbItem(item) {
  return item?.[BREADCRUMB_ITEM] ? item : vBreadcrumbItem(item);
}
