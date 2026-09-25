import { allocateNumber } from '../core/id.js';
import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { ViewNode, vText } from '../core/index.js';
import { button, div, section, span } from '../html/index.js';
import {
  createComponentShortcut,
  createListItemKey,
  resolveTextValue
} from '../components/shared.js';

/**
 * 页签（票 15 §4；2026-09-23 按「容器组件」口径重写，参考实现 `VTable` / `VAnchor` / `VSteps`）。
 *
 * - **结构一次写清、两个容器常驻**：`div[VTabs] > div[VTabsNav](role=tablist) + div[VTabsPanels]`；
 *   页签 `VTab` 的视图根是**触发器** `button[VTabTrigger]`，面板 `section[VTabPanel]` 在构建期就建好
 *   （不再是 `panelPart === null` 哨兵、也不在命令里现造零件）——两个部件由容器分别投递；
 * - **一项两个父节点 → 两段 `keyed` 用同一份 `ref`**：触发器进 `VTabsNav`、面板进 `VTabsPanels`
 *   （`(tab) => tab` / `(tab) => tab.panel()`），增删改排序由引擎各段对账——不 rebuild、不整段重建；
 * - **选中态是句柄**：容器持有选中下标，项 `track(context)` 拿到后按身份查自己的下标（`indexOf`），
 *   自己派生 `aria-selected` / `data-active` / `tabindex` / 面板 `hidden`——容器不遍历每一项推快照；
 * - **标签 / 图标是内部块**（R11 / R12）：位置归触发器自己，内容全是活值（节点 props 在构建期落位、
 *   文本 / 句柄走读值绑定）；空图标由 `[vn~='VTabIcon']:empty` 规则隐掉（原先两处行内 `display` 退场）；
 * - 命令只写状态 / 内容，`api.setupObject` 退场；点击 / 键盘委托挂在常驻的 `VTabsNav` 上
 *   （`event.currentTarget` 就是它，不再 `let navPart` 捕获）。
 */

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const TAB_ITEM = Symbol('yoya.tabItem');

const VARIANTS = new Set(['card', 'line', 'pills']);
const SIZES = new Set(['default', 'large', 'small']);

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

/** 列表归一：数组原样、空值成空表、其余单值成一项。 */
const asList = (value) =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/**
 * 页签项：触发器是视图根（进导航），面板在构建期建好（进面板容器）。
 * 字符串 = 标签；props 见 `TabItemOptions`；选中态由容器 `track(context)` 进来。
 */
export function VTab({
  active = false,
  children: contentOption,
  content,
  disabled = false,
  icon = null,
  key,
  label,
  text,
  title,
  value,
  ...rest
} = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;

  const sequence = allocateNumber();
  // id 前缀去 `yoya-v`（全局名只留中性前缀，与 `yoya-timer-range-*` / `yoya-progress-*` 同一口径）
  const triggerId = `yoya-tab-trigger-${sequence}`;
  const panelId = `yoya-tab-panel-${sequence}`;

  // 标签 / 图标：节点在构建期落位；文本 / 句柄是活值（`label` / `text` / `title` 三键同义）
  const initialLabel = label ?? text ?? title ?? null;
  const labelNode = initialLabel instanceof ViewNode ? initialLabel : null;
  const iconNode = icon instanceof ViewNode ? icon : null;
  const labelState = asSignal(labelNode === null ? initialLabel : null);
  const iconState = asSignal(iconNode === null ? icon : null);
  const labelText = computed(() => textOf(labelState.value));
  const iconText = computed(() => textOf(iconState.value));

  // 标识：`key` / `value` 同义；归一（字符串 / 空）放在读时
  const keyState = asSignal(key ?? value ?? null);
  const keyValue = computed(() => {
    const raw = keyState.value;
    return raw === null || raw === undefined ? null : textOf(raw);
  });

  const activeState = asSignal(active);
  const disabledState = asSignal(disabled);
  const disabledValue = computed(() => Boolean(disabledState.value));

  /** 容器给的容器态（选中下标 + 按身份查下标）；脱离容器时回落到自己的显式位。 */
  const context = ref(null);

  return vNode((api, self) => {
    const isActive = computed(() => {
      const container = context.value;
      const on = container
        ? container.indexOf(self.node()) === container.activeIndex.value
        : Boolean(activeState.value);

      return on && !disabledValue.value;
    });
    const activeAttr = computed(() => (isActive.value ? 'true' : null));
    const selectedAttr = computed(() => (isActive.value ? 'true' : 'false'));
    const tabIndexValue = computed(() => (isActive.value ? '0' : '-1'));

    // 面板：构建期就建好（挂载由容器的面板段投递）；选中态 / 可聚焦性都是读值绑定
    const panel = section({
      attrs: {
        'aria-labelledby': triggerId,
        'data-active': activeAttr,
        hidden: computed(() => (isActive.value ? null : true)),
        id: panelId,
        role: 'tabpanel',
        tabindex: tabIndexValue
      },
      vn: 'VTabPanel'
    });

    api.key = (next) => {
      if (next === undefined) {
        return keyValue.value;
      }

      keyState.value = next ?? null;
      return api;
    };

    api.value = (next) => (next === undefined ? keyValue.value : api.key(next));

    api.label = (next) => {
      if (next === undefined) {
        return labelText.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vTab.label(node)：标签命令只收文本，节点标签请在构建期用 props.label 给。'
        );
      }

      labelState.value = next ?? null;
      return api;
    };

    api.text = (next) => (next === undefined ? labelText.value : api.label(next));
    api.title = (next) => (next === undefined ? labelText.value : api.label(next));

    api.icon = (next) => {
      if (next === undefined) {
        return iconText.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vTab.icon(node)：图标命令只收文本，节点图标请在构建期用 props.icon 给。'
        );
      }

      iconState.value = next ?? null;
      return api;
    };

    /** 面板（内容通道）：无参 = 面板句柄；其余走面板自己的 setup 分派。 */
    api.content = (setup) => {
      if (setup === undefined) {
        return panel;
      }

      panel.setup(setup);
      return api;
    };

    api.disabled = (next) => {
      if (next === undefined) {
        return disabledValue.value;
      }

      disabledState.value = next;
      return api;
    };

    /** 选中位：`true` 写入（容器路径由 `track` 决定，这里是脱离容器 / 命令控制的显式位）。 */
    api.active = (next = true) => {
      activeState.value = Boolean(next);
      return api;
    };

    /** 面板句柄 / 触发器句柄：容器按自己造出来的项取用它们，投递进两个容器。 */
    api.panel = () => panel;
    api.trigger = () => self.node();

    /** 字符串 / 数字 = 标签。 */
    api.setupString = (next) => api.label(next);

    /**
     * 容器态：只收句柄（容器不替项写状态，项自己派生）。
     */
    api.track = (next) => {
      context.value = next ?? null;
      return api;
    };

    // props 里的面板内容与命令共用同一条通道
    const initialContent = content ?? contentOption;

    if (initialContent !== undefined) {
      api.content(initialContent);
    }

    // 结构（R2）：一棵树写在 return 里；状态走读值绑定（R6）
    return button(
      {
        ...elementConfig,
        attrs: {
          ...restAttrs,
          'aria-controls': panelId,
          'aria-disabled': computed(() => (disabledValue.value ? 'true' : null)),
          'aria-selected': selectedAttr,
          id: triggerId,
          role: 'tab',
          tabindex: tabIndexValue
        },
        'data-active': activeAttr,
        disabled: computed(() => (disabledValue.value ? true : null)),
        style: restStyle,
        type: 'button',
        vn: 'VTabTrigger'
      },
      (trigger) =>
        trigger.child(
          // 图标位 / 标签位都是内部块：内容全是活值，空图标由 `:empty` 规则隐掉
          span({ vn: 'VTabIcon' }, (box) => {
            if (iconNode !== null) {
              box.child(iconNode);
            }

            box.child(vText(iconText).mountable(computed(() => iconText.value !== '')));
          }),
          span({ vn: 'VTabLabel' }, (box) => {
            if (labelNode !== null) {
              box.child(labelNode);
            }

            box.child(vText(labelText).mountable(computed(() => labelText.value !== '')));
          })
        )
    );
  });
}

const tabShortcut = createComponentShortcut(VTab, { props: true });

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vTab(...args) {
  const node = tabShortcut(...args);
  // 标在节点上而不是查组件名：容器自己认自己的项
  node[TAB_ITEM] = true;
  return node;
}

/**
 * 页签容器：`div[VTabs]` + 常驻的导航 / 面板容器。
 * props 见 `TabsOptions`（`children` 是页签列表的兼容别名），页签只从 `items` / `vTab` 来。
 */
export function VTabs({
  active,
  ariaLabel = '标签页',
  change,
  children: itemOptions,
  items,
  onChange,
  onTabChange,
  orientation = 'horizontal',
  size = 'default',
  variant = 'line',
  ...rest
} = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;

  // props 全是**数据**：句柄原样收下，归一（合法值 / 默认值）放在读时的派生上
  const ariaLabelState = asSignal(ariaLabel);
  const ariaLabelText = computed(() => textOf(ariaLabelState.value) || '标签页');
  const orientationState = asSignal(orientation);
  const orientationValue = computed(() =>
    orientationState.value === 'vertical' ? 'vertical' : 'horizontal'
  );
  const variantState = asSignal(variant);
  const variantValue = computed(() =>
    VARIANTS.has(variantState.value) ? variantState.value : 'line'
  );
  const sizeState = asSignal(size);
  const sizeValue = computed(() => (SIZES.has(sizeState.value) ? sizeState.value : 'default'));

  /** 选中态：key 或下标都收（句柄就是活值），下标在**读时**按当前项归一。 */
  const activeState = asSignal(active ?? 0);
  const activeIndexValue = computed(() => resolveIndex(activeState.value));
  const activeIndexText = computed(() => String(activeIndexValue.value));
  const activeKeyValue = computed(() => {
    const tab = tabNodes.value[activeIndexValue.value];
    return tab ? tab.key() : null;
  });

  const clampIndex = (value) => {
    if (!Number.isFinite(Number(value))) {
      return 0;
    }

    const index = Math.max(0, Math.floor(Number(value)));
    return tabNodes.value.length === 0 ? 0 : Math.min(index, tabNodes.value.length - 1);
  };

  /** key → 下标；不是 key 就按数字算（数字 / 数字串都收）。 */
  const resolveIndex = (value) => {
    if (typeof value === 'number') {
      return clampIndex(value);
    }

    const text = textOf(value);
    const keyIndex = tabNodes.value.findIndex((tab) => String(tab.key()) === String(text));

    if (keyIndex >= 0) {
      return keyIndex;
    }

    const numeric = Number(text);
    return clampIndex(Number.isFinite(numeric) ? numeric : 0);
  };

  /** 项：一份数据源，两段 `keyed` 都从它对账（触发器 / 面板各一段）。 */
  const tabNodes = ref([]);
  const tabCount = computed(() => String(tabNodes.value.length));
  const keyOfTab = createListItemKey('tab-item');

  /** 变更回调：外面拿不到，命令只改这份引用。 */
  let changeHandler =
    typeof change === 'function'
      ? change
      : typeof onChange === 'function'
        ? onChange
        : typeof onTabChange === 'function'
          ? onTabChange
          : null;

  return vNode((api) => {
    /**
     * 容器态句柄：项 `track(context)` 拿到后自己按下标比对；
     * `indexOf` 只在本容器自己造出来的项里查（16 号清单第 15 / 22 条），不遍历结构找节点。
     */
    const context = {
      activeIndex: activeIndexValue,
      indexOf: (tab) => tabNodes.value.indexOf(tab)
    };

    const wireTab = (setup) => {
      const tab = normalizeTabItem(setup);
      tab.track(context);
      return tab;
    };

    const enabledTabs = () => tabNodes.value.filter((tab) => !tab.disabled());

    /** 选中某一项：只动容器自己的状态，项由句柄自己跟上。 */
    const selectIndex = (index, emit = true) => {
      if (tabNodes.value.length === 0) {
        activeState.value = 0;
        return api;
      }

      let next = clampIndex(index);

      if (tabNodes.value[next]?.disabled()) {
        const firstEnabled = tabNodes.value.findIndex((tab) => !tab.disabled());
        next = firstEnabled >= 0 ? firstEnabled : activeIndexValue.value;
      }

      const changed = next !== activeIndexValue.value;
      activeState.value = next >= 0 ? next : activeIndexValue.value;

      if (emit && changed && typeof changeHandler === 'function') {
        const tab = tabNodes.value[activeIndexValue.value];

        changeHandler({
          active: tab.key() ?? activeIndexValue.value,
          index: activeIndexValue.value,
          item: tab,
          key: tab.key()
        });
      }

      return api;
    };

    /** 触发器元素 → 项：容器按自己造出来的项找（不遍历结构）。 */
    const tabFromTrigger = (trigger) =>
      tabNodes.value.find((tab) => tab.trigger().owns(trigger)) ?? null;

    const handleNavClick = (event) => {
      const trigger = event.target.closest?.('[vn~="VTabTrigger"]');

      // 委托挂在常驻的导航容器上：`currentTarget` 就是它
      if (!trigger || !event.currentTarget?.contains(trigger)) {
        return;
      }

      const tab = tabFromTrigger(trigger);

      if (tab && !tab.disabled()) {
        selectIndex(tabNodes.value.indexOf(tab), true);
      }
    };

    const handleKeydown = (event) => {
      const trigger = event.target.closest?.('[vn~="VTabTrigger"]');

      if (!trigger || !event.currentTarget?.contains(trigger)) {
        return;
      }

      const current = tabFromTrigger(trigger);

      if (!current) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectIndex(tabNodes.value.indexOf(current), true);
        return;
      }

      const step =
        orientationValue.value === 'vertical'
          ? { ArrowDown: 1, ArrowUp: -1 }
          : { ArrowLeft: -1, ArrowRight: 1 };
      const enabled = enabledTabs();

      if (
        enabled.length === 0 ||
        (!step[event.key] && event.key !== 'Home' && event.key !== 'End')
      ) {
        return;
      }

      event.preventDefault();

      let nextIndex;

      if (event.key === 'Home') {
        nextIndex = 0;
      } else if (event.key === 'End') {
        nextIndex = enabled.length - 1;
      } else {
        const currentEnabled = Math.max(0, enabled.indexOf(current));
        nextIndex = (currentEnabled + step[event.key] + enabled.length) % enabled.length;
      }

      const nextTab = enabled[nextIndex];

      if (!nextTab) {
        return;
      }

      selectIndex(tabNodes.value.indexOf(nextTab), true);
      nextTab.trigger().focus();
    };

    /** 追加一份页签：只写数据，结构（触发器 / 面板两端）交给 `keyed` 对账。 */
    api.vTab = (setup) => {
      tabNodes.value = [...tabNodes.value, wireTab(setup)];
      return api;
    };

    /** 页签整批替换：写一份新数组（留下来的项按身份键复用，离场的销毁）。 */
    api.items = (value) => {
      if (value === undefined) {
        return tabNodes.value.slice();
      }

      tabNodes.value = asList(value).map(wireTab);
      return api;
    };

    api.active = (value) => {
      if (value === undefined) {
        const tab = tabNodes.value[activeIndexValue.value];
        return tab ? (tab.key() ?? activeIndexValue.value) : null;
      }

      return selectIndex(resolveIndex(value), false);
    };

    api.activeIndex = (value) => {
      if (value === undefined) {
        return activeIndexValue.value;
      }

      return selectIndex(value, false);
    };

    api.ariaLabel = (content) => {
      if (content === undefined) {
        return ariaLabelText.value;
      }

      ariaLabelState.value = content;
      return api;
    };

    api.orientation = (value) => {
      if (value === undefined) {
        return orientationValue.value;
      }

      orientationState.value = value;
      return api;
    };

    api.variant = (value) => {
      if (value === undefined) {
        return variantValue.value;
      }

      variantState.value = value;
      return api;
    };

    api.size = (value) => {
      if (value === undefined) {
        return sizeValue.value;
      }

      sizeState.value = value;
      return api;
    };

    api.change = (handler) => {
      if (handler === undefined) {
        return changeHandler;
      }

      changeHandler = typeof handler === 'function' ? handler : null;
      return api;
    };

    api.onChange = (handler) => api.change(handler);

    api.next = () => {
      const enabled = enabledTabs();
      const currentEnabled = enabled.indexOf(tabNodes.value[activeIndexValue.value]);
      const nextTab = enabled[(currentEnabled + 1 + enabled.length) % enabled.length];

      if (enabled.length > 0 && nextTab) {
        selectIndex(tabNodes.value.indexOf(nextTab), true);
      }

      return api;
    };

    api.prev = () => {
      const enabled = enabledTabs();
      const currentEnabled = enabled.indexOf(tabNodes.value[activeIndexValue.value]);
      const prevTab = enabled[(currentEnabled - 1 + enabled.length) % enabled.length];

      if (enabled.length > 0 && prevTab) {
        selectIndex(tabNodes.value.indexOf(prevTab), true);
      }

      return api;
    };

    /** 字符串 / 数字 = 一条页签。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
    };

    const initialItems = items ?? itemOptions;

    if (initialItems !== undefined) {
      api.items(initialItems);
    }

    // 初始选中项按 key / 下标归一（放在 items 之后：按 key 找得到项）
    if (active !== undefined) {
      api.active(active);
    }

    return div(
      {
        ...elementConfig,
        attrs: restAttrs,
        'data-active-index': activeIndexText,
        'data-active-key': activeKeyValue,
        'data-orientation': orientationValue,
        'data-size': sizeValue,
        'data-tab-count': tabCount,
        'data-variant': variantValue,
        style: restStyle,
        vn: 'VTabs'
      },
      (root) =>
        root.child(
          // 导航容器（常驻）：触发器段 + 点击 / 键盘委托
          div(
            {
              attrs: {
                'aria-label': ariaLabelText,
                'aria-orientation': orientationValue,
                role: 'tablist'
              },
              vn: 'VTabsNav'
            },
            (nav) => {
              nav.on('click', handleNavClick);
              nav.on('keydown', handleKeydown);
              nav.keyed(tabNodes, keyOfTab, (tab) => tab);
            }
          ),

          // 面板容器（常驻）：同一份项数据的另一段对账
          div({ vn: 'VTabsPanels' }, (panels) =>
            panels.keyed(tabNodes, keyOfTab, (tab) => tab.panel())
          )
        )
    );
  });
}

export const vTabs = createComponentShortcut(VTabs, { props: true });

/** 项归一：已经是本模块造的项就原样用，其余按项的标准分派建一份。 */
function normalizeTabItem(item) {
  return item?.[TAB_ITEM] ? item : vTab(item);
}
