import { allocateNumber } from '../core/id.js';
import { vNode } from '../core/v-node.js';
import { button, div, section, span } from '../html/index.js';
import { vSlot } from '../layout/v-slot.js';
import {
  createComponentShortcut,
  replaceChildren,
  resolveTextValue
} from '../components/shared.js';

/**
 * 页签（票 15 §4：**结构 + 身份 + 命令**，组件里没有元素节点类）。
 *
 * - 结构：`div[VTabs] > div[VTabsNav](role=tablist) + div[VTabsPanels]`；
 *   页签项 `VTab` 的视图根是**触发器** `button[VTabTrigger]`，面板 `section[VTabPanel]` 由项自己的
 *   `panel()` 命令按需建、建过复用——容器取走半边的**内容**分别落进导航与面板容器；
 * - 触发器里的**标签 / 图标**是固定内容位：结构里 `vSlot('label')` / `vSlot('icon')` 声明占位，
 *   内容（`VTabLabel` / `VTabIcon`）自带 `vn_slot` 标记，命令投递即落位（`VCard` 同一口径，替换语义自带）；
 * - 不在视图里的部件（面板）才「用到才建、建过复用」（与 `VTable` 段命令同一口径），不预建、不按身份查找；
 * - 命令**直接写快照**（`attr` / `replaceChildren`）：首屏就是构建期快照，没有"写完再刷一遍"；
 * - 容器只把「你是不是当前项」交给每一项（`tab.active(…)`），项自己写自己的触发器 / 面板快照。
 */

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const TAB_ITEM = Symbol('yoya.tabItem');

/** 页签导航（形态 A）。 */
function TabsNav() {
  return div({
    'aria-label': '标签页',
    'aria-orientation': 'horizontal',
    role: 'tablist',
    vn: 'VTabsNav'
  });
}

/** 面板容器（形态 A）。 */
function TabsPanels() {
  return div({ vn: 'VTabsPanels' });
}

/** 标签内容（形态 A）：`vn_slot` 标记 = 它在触发器里的位置。 */
export function VTabLabel() {
  return span({ vn: 'VTabLabel', vn_slot: 'label' });
}

/** 图标内容（形态 A）：默认隐藏，投递图标后由内容自己决定显隐。 */
export function VTabIcon() {
  return span({ 'aria-hidden': 'true', vn: 'VTabIcon', vn_slot: 'icon' }).style('display', 'none');
}

export const vTabLabel = createComponentShortcut(VTabLabel);
export const vTabIcon = createComponentShortcut(VTabIcon);

/**
 * 页签项：触发器是视图根（进导航），面板走 `panel()` 内容通道（进面板容器）。
 * 字符串 = 标签；对象 = props；`active / disabled / index` 由容器 `active(…)` 驱动。
 */
export function VTab() {
  return vNode((api, self) => {
    const state = { active: false, disabled: false, key: null };
    const sequence = allocateNumber();
    // id 前缀去 `yoya-v`（全局名只留中性前缀，与 `yoya-timer-range-*` / `yoya-progress-*` 同一口径）
    const triggerId = `yoya-tab-trigger-${sequence}`;
    const panelId = `yoya-tab-panel-${sequence}`;

    let panelPart = null;

    /** 写这一项的快照：触发器与面板的选中态。 */
    const writeTab = () => {
      const active = state.active && !state.disabled;

      self.node().attr({
        'aria-selected': active ? 'true' : 'false',
        'data-active': active ? 'true' : null,
        tabindex: active ? '0' : '-1'
      });

      if (panelPart) {
        panelPart.attr({
          'data-active': active ? 'true' : null,
          hidden: active ? null : true,
          tabindex: active ? '0' : '-1'
        });
      }

      return api;
    };

    /** 面板（内容通道）：容器把它落进 `VTabsPanels`；用到才建、建过复用。 */
    api.panel = () => {
      if (!panelPart) {
        panelPart = section({
          'aria-labelledby': triggerId,
          hidden: true,
          id: panelId,
          role: 'tabpanel',
          tabindex: '-1',
          vn: 'VTabPanel'
        });
        writeTab();
      }

      return panelPart;
    };

    /** 触发器（视图根）：容器把它落进 `VTabsNav`。 */
    api.trigger = () => self.node();

    api.key = (value) => {
      if (value === undefined) {
        return state.key;
      }

      state.key = value === null || value === undefined ? null : String(resolveTextValue(value));
      return api;
    };

    api.value = (value) => (value === undefined ? state.key : api.key(value));

    api.label = (content) => {
      if (content === undefined) {
        return state.label == null ? '' : resolveTextValue(state.label);
      }

      state.label = content;
      // 内容自带 `vn_slot`，投递即替换标签占位里的内容（VCard 口径）
      self.node().child(vTabLabel(content));
      return api;
    };

    api.text = (content) => (content === undefined ? api.label() : api.label(content));
    api.title = (content) => (content === undefined ? api.label() : api.label(content));

    api.icon = (content) => {
      state.icon = content;
      const empty = content === null || content === undefined || content === '';

      // 空图标保持隐藏（与旧实现一致）：内容自带 vn_slot，投递即替换图标占位里的内容
      self.node().child(vTabIcon(content).style('display', empty ? 'none' : null));
      return api;
    };

    api.content = (setup) => {
      if (setup === undefined) {
        return panelPart ? panelPart : null;
      }

      api.panel().setup(setup);
      return api;
    };

    api.disabled = (value) => {
      if (value === undefined) {
        return state.disabled;
      }

      state.disabled = Boolean(value);
      self.node().attr({
        'aria-disabled': state.disabled ? 'true' : null,
        disabled: state.disabled ? true : null
      });
      return writeTab();
    };

    api.active = (value) => {
      if (value === undefined) {
        return state.active;
      }

      state.active = Boolean(value);
      return writeTab();
    };

    /** props：`key / value / label / text / title / icon / content / children / disabled / active`。 */
    api.setupObject = (config) => {
      const {
        active,
        children,
        content,
        disabled,
        icon,
        key,
        label,
        text,
        title,
        value,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        // 其余键落**视图根元素**：`self.node()` 是组件节点，它的 `setup()` 会再进一次本方法（自递归）
        view.setup(elementConfig);
      }

      if (label !== undefined) {
        api.label(label);
      } else if (text !== undefined) {
        api.label(text);
      } else if (title !== undefined) {
        api.label(title);
      }

      if (content !== undefined) {
        api.content(content);
      } else if (children !== undefined) {
        api.content(children);
      }

      if (icon !== undefined) {
        api.icon(icon);
      }

      if (key !== undefined) {
        api.key(key);
      } else if (value !== undefined) {
        api.key(value);
      }

      if (disabled !== undefined) {
        api.disabled(disabled);
      }

      if (active !== undefined) {
        api.active(active);
      }

      return api;
    };

    /** 字符串 / 数字 = 标签。 */
    api.setupString = (value) => api.label(value);

    const view = button(
      {
        'aria-controls': panelId,
        'aria-selected': 'false',
        id: triggerId,
        role: 'tab',
        tabindex: '-1',
        type: 'button',
        vn: 'VTabTrigger'
      },
      (trigger) => {
        trigger.child(vSlot('icon'), vSlot('label'));
      }
    );

    return view;
  });
}

const tabShortcut = createComponentShortcut(VTab);

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vTab(...args) {
  const node = tabShortcut(...args);
  // 标在节点上而不是查组件名：容器自己认自己的项
  node[TAB_ITEM] = true;
  return node;
}

/**
 * 页签容器：`div[VTabs]` + 导航 / 面板容器（用到才建）。
 * 对象 = props，字符串 = 一条页签，函数 = 构建回调（默认落组件节点构建帧）。
 */
export function VTabs() {
  return vNode((api, self) => {
    const state = {
      activeIndex: 0,
      ariaLabel: '标签页',
      change: null,
      orientation: 'horizontal',
      size: 'default',
      variant: 'line'
    };

    let navPart = null;
    let panelsPart = null;
    let tabs = [];

    /** 导航容器：用到才建、建过复用；点击 / 键盘委托挂在它自己身上。 */
    const navOf = () => {
      if (!navPart) {
        navPart = TabsNav();
        navPart.attr({ 'aria-label': state.ariaLabel, 'aria-orientation': state.orientation });
        navPart.on('click', handleNavClick);
        navPart.on('keydown', handleKeydown);
        self.node().child(navPart);
      }

      return navPart;
    };

    /** 面板容器：用到才建、建过复用。 */
    const panelsOf = () => {
      if (!panelsPart) {
        panelsPart = TabsPanels();
        self.node().child(panelsPart);
      }

      return panelsPart;
    };

    const enabledTabs = () => tabs.filter((tab) => !tab.disabled());

    /** 容器态 → 每一项：容器只说「你是不是当前项 / 第几个」，项自己写自己的快照。 */
    const deliverSelection = () => {
      self.node().attr({
        'data-active-index': String(state.activeIndex),
        'data-active-key':
          tabs[state.activeIndex]?.key() != null ? String(tabs[state.activeIndex].key()) : null,
        'data-tab-count': String(tabs.length)
      });

      tabs.forEach((tab, index) => tab.active(index === state.activeIndex && !tab.disabled()));
      return api;
    };

    const clampIndex = (value) => {
      if (!Number.isFinite(Number(value))) {
        return 0;
      }

      const index = Math.max(0, Math.floor(Number(value)));
      return tabs.length === 0 ? 0 : Math.min(index, tabs.length - 1);
    };

    const resolveIndex = (value) => {
      if (typeof value === 'number') {
        return clampIndex(value);
      }

      const text = resolveTextValue(value);
      const keyIndex = tabs.findIndex((tab) => String(tab.key()) === String(text));

      if (keyIndex >= 0) {
        return keyIndex;
      }

      const numeric = Number(text);
      return clampIndex(Number.isFinite(numeric) ? numeric : 0);
    };

    /** 选中某一项：只动容器自己的状态与属性，项由 `deliverSelection` 通知。 */
    const selectIndex = (index, emit = true) => {
      if (tabs.length === 0) {
        state.activeIndex = 0;
        return deliverSelection();
      }

      let next = clampIndex(index);

      if (tabs[next]?.disabled()) {
        const firstEnabled = tabs.findIndex((tab) => !tab.disabled());
        next = firstEnabled >= 0 ? firstEnabled : state.activeIndex;
      }

      const changed = next !== state.activeIndex;
      state.activeIndex = next >= 0 ? next : state.activeIndex;
      deliverSelection();

      if (emit && changed && typeof state.change === 'function') {
        const tab = tabs[state.activeIndex];

        state.change({
          active: tab.key() ?? state.activeIndex,
          index: state.activeIndex,
          item: tab,
          key: tab.key()
        });
      }

      return api;
    };

    /** 触发器元素 → 项：容器按自己造出来的项找（不遍历结构）。 */
    const tabFromTrigger = (trigger) =>
      tabs.find((tab) => tab.trigger().renderDom() === trigger) ?? null;

    const handleNavClick = (event) => {
      const trigger = event.target.closest?.('[vn~="VTabTrigger"]');

      if (!trigger || !navPart?.renderDom()?.contains(trigger)) {
        return;
      }

      const tab = tabFromTrigger(trigger);

      if (tab && !tab.disabled()) {
        selectIndex(tabs.indexOf(tab), true);
      }
    };

    const handleKeydown = (event) => {
      const trigger = event.target.closest?.('[vn~="VTabTrigger"]');

      if (!trigger || !navPart?.renderDom()?.contains(trigger)) {
        return;
      }

      const current = tabFromTrigger(trigger);

      if (!current) {
        return;
      }

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        selectIndex(tabs.indexOf(current), true);
        return;
      }

      const step =
        state.orientation === 'vertical'
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

      selectIndex(tabs.indexOf(nextTab), true);
      nextTab.trigger().renderDom()?.focus?.();
    };

    api.items = (value) => {
      if (value === undefined) {
        return tabs.slice();
      }

      tabs.forEach((tab) => tab.destroy());
      tabs = [];

      if (navPart) {
        replaceChildren(navPart, []);
      }

      if (panelsPart) {
        replaceChildren(panelsPart, []);
      }

      (Array.isArray(value) ? value : []).forEach((item) => api.vTab(item));
      return deliverSelection();
    };

    /** 项投递：触发器落进导航、面板落进面板容器，项记在自己账上。 */
    api.vTab = (setup) => {
      const tab = normalizeTabItem(setup);
      tabs = [...tabs, tab];
      navOf().child(tab);
      panelsOf().child(tab.panel());
      return deliverSelection();
    };

    api.active = (value) => {
      if (value === undefined) {
        const tab = tabs[state.activeIndex];
        return tab ? (tab.key() ?? state.activeIndex) : null;
      }

      return selectIndex(resolveIndex(value), false);
    };

    api.activeIndex = (value) => {
      if (value === undefined) {
        return state.activeIndex;
      }

      return selectIndex(value, false);
    };

    api.ariaLabel = (content) => {
      if (content === undefined) {
        return state.ariaLabel;
      }

      state.ariaLabel = resolveTextValue(content) || '标签页';

      if (navPart) {
        navPart.attr('aria-label', state.ariaLabel);
      }

      return api;
    };

    api.orientation = (value) => {
      if (value === undefined) {
        return state.orientation;
      }

      state.orientation = value === 'vertical' ? 'vertical' : 'horizontal';
      self.node().attr('data-orientation', state.orientation);

      if (navPart) {
        navPart.attr('aria-orientation', state.orientation);
      }

      return api;
    };

    api.variant = (value) => {
      if (value === undefined) {
        return state.variant;
      }

      state.variant = ['card', 'line', 'pills'].includes(value) ? value : 'line';
      self.node().attr('data-variant', state.variant);
      return api;
    };

    api.size = (value) => {
      if (value === undefined) {
        return state.size;
      }

      state.size = ['default', 'large', 'small'].includes(value) ? value : 'default';
      self.node().attr('data-size', state.size);
      return api;
    };

    api.change = (handler) => {
      if (handler === undefined) {
        return state.change;
      }

      state.change = typeof handler === 'function' ? handler : null;
      return api;
    };

    api.onChange = (handler) => api.change(handler);

    api.next = () => {
      const enabled = enabledTabs();
      const currentEnabled = enabled.indexOf(tabs[state.activeIndex]);
      const nextTab = enabled[(currentEnabled + 1 + enabled.length) % enabled.length];

      if (enabled.length > 0 && nextTab) {
        selectIndex(tabs.indexOf(nextTab), true);
      }

      return api;
    };

    api.prev = () => {
      const enabled = enabledTabs();
      const currentEnabled = enabled.indexOf(tabs[state.activeIndex]);
      const prevTab = enabled[(currentEnabled - 1 + enabled.length) % enabled.length];

      if (enabled.length > 0 && prevTab) {
        selectIndex(tabs.indexOf(prevTab), true);
      }

      return api;
    };

    /** props：`items / children / active / ariaLabel / orientation / variant / size / change / onChange`。 */
    api.setupObject = (config) => {
      const {
        active,
        ariaLabel,
        change,
        children,
        items,
        onChange,
        onTabChange,
        orientation,
        size,
        variant,
        ...elementConfig
      } = config;

      if (Object.keys(elementConfig).length > 0) {
        // 其余键落**视图根元素**：`self.node()` 是组件节点，它的 `setup()` 会再进一次本方法（自递归）
        view.setup(elementConfig);
      }

      if (ariaLabel !== undefined) {
        api.ariaLabel(ariaLabel);
      }

      if (orientation !== undefined) {
        api.orientation(orientation);
      }

      if (variant !== undefined) {
        api.variant(variant);
      }

      if (size !== undefined) {
        api.size(size);
      }

      if (typeof change === 'function') {
        api.change(change);
      } else if (typeof onChange === 'function') {
        api.change(onChange);
      } else if (typeof onTabChange === 'function') {
        api.change(onTabChange);
      }

      const itemsSetup = items ?? children;

      if (itemsSetup !== undefined) {
        api.items(itemsSetup);
      }

      if (active !== undefined) {
        api.active(active);
      }

      return api;
    };

    /** 字符串 / 数字 = 一条页签。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
    };

    // 结构里就带默认快照（命令只覆盖自己那一项）
    const view = div({
      'data-active-index': '0',
      'data-orientation': 'horizontal',
      'data-size': 'default',
      'data-tab-count': '0',
      'data-variant': 'line',
      vn: 'VTabs'
    });

    return view;
  });
}

export const vTabs = createComponentShortcut(VTabs);

/** 项归一：已经是本模块造的项就原样用，其余按项的标准分派建一份。 */
function normalizeTabItem(item) {
  return item?.[TAB_ITEM] ? item : vTab(item);
}
