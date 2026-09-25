import { ElementNode, registerChildFactories } from '@yoyaflow/yoya-core/internal/core/node.js';
import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { getYoyaMode, setYoyaMode } from '@yoyaflow/yoya-core/internal/core/theme.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { div } from '@yoyaflow/yoya-core/html';
import { createComponentShortcut, createListItemKey } from '../components/shared.js';
import { vButton } from '../actions/button.js';
import {
  MonitorOutlined,
  MoonOutlined,
  SunOutlined
} from '@yoyaflow/yoya-core/internal/svg/icons.js';

/**
 * 主题模式切换（票 15 §4；2026-09-23 按组件写法重写）。
 *
 * - **结构**：`div[VThemeModeSwitch] > [vn~='VButton'][data-theme-mode]…`——按钮是一份 `ref([])` +
 *   **`keyed` 对账**（`modes()` 变化时按模式键复用 / 增删，不再 `clearChildren()` 整段重建）；
 * - **状态 → 视图**：每个按钮的 `data-active` / `aria-label` / `title` / 图标都是**读值绑定**（`computed`），
 *   当前模式由 `activeMode` 一份句柄派生；点击只写主题 + 这一份句柄；
 * - **R5**：容器与按钮的静态样式（圆形 32px、透明底、图标 16px）与选中态配色全部进 `yoya.ui.css`
 *   （选择器 `[vn~='VThemeModeSwitch']`，JS 不再写任何行内样式）；
 * - 图标走 `vButton({ label: 图标节点 })`（节点标签在构建期落位到标签盒）。
 */

const DEFAULT_MODES = [
  { mode: 'light', label: '浅色', icon: SunOutlined },
  { mode: 'dark', label: '深色', icon: MoonOutlined },
  { mode: 'system', label: '跟随系统', icon: MonitorOutlined }
];

const MODE_LABELS = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统'
};

const MODE_ICONS = {
  light: SunOutlined,
  dark: MoonOutlined,
  system: MonitorOutlined
};

/** 开关自己给图标的尺寸（皮肤里的圆钮是 34px，图标 16px 保持轻盈）。 */
const ICON_SIZE = { height: '16px', width: '16px' };

/** 模式归一：字符串 = 内置模式；对象形按 `ThemeModeEntry` 原样用。 */
function normalizeModes(value) {
  return value.map((entry) =>
    typeof entry === 'string'
      ? { mode: entry, label: MODE_LABELS[entry] || entry, icon: MODE_ICONS[entry] }
      : entry
  );
}

/** 主题模式切换 props：`modes` / `persist`（见 `ThemeModeSwitchOptions`）。 */
export function VThemeModeSwitch({ modes = DEFAULT_MODES, persist = true, ...rest } = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  const modeList = ref(normalizeModes(modes));
  const persistState = asSignal(persist);
  const activeMode = ref(getYoyaMode());

  /** 模式按钮：一份数据源（结构由 keyed 对账，按模式键复用）。 */
  const buttons = ref([]);
  const keyOfMode = createListItemKey('theme-mode');

  const buildButtons = () => {
    buttons.value = modeList.value.map(({ mode, label, icon }) => {
      const Icon = icon || MODE_ICONS[mode] || null;
      // 图标按开关自己的尺寸来：库内图标的默认尺寸是行内写的（24px），不显式收一次
      // 就会盖过皮肤里 `[vn~='VThemeModeSwitch'] svg { 18px }`（票 16 第 97 条的图标默认尺寸）
      const button = vButton({ label: Icon ? Icon().styles(ICON_SIZE) : label });

      button.attr({
        'aria-label': label,
        'data-active': computed(() => (activeMode.value === mode ? 'true' : null)),
        'data-theme-mode': mode,
        title: label
      });
      button.on('click', () => {
        setYoyaMode(mode, { persist: Boolean(persistState.value) });
        sync();
      });

      return button;
    });
  };

  /** 把当前主题模式读回这一份句柄（按钮的 `data-active` 跟着变）。 */
  const sync = () => {
    activeMode.value = getYoyaMode();
  };

  buildButtons();

  return vNode((api) => {
    api.modes = (value) => {
      if (value === undefined) {
        return modeList.value.map((entry) => entry.mode);
      }

      if (!Array.isArray(value)) {
        throw new TypeError('VThemeModeSwitch modes must be an array of mode names');
      }

      modeList.value = normalizeModes(value);
      buildButtons();
      sync();
      return api;
    };

    api.persist = (value) => {
      if (value === undefined) {
        return Boolean(persistState.value);
      }

      persistState.value = Boolean(value);
      return api;
    };

    api.sync = () => {
      sync();
      return api;
    };

    return div({ ...elementConfig, attrs: { ...restAttrs }, vn: 'VThemeModeSwitch' }, (root) =>
      root.keyed(buttons, keyOfMode, (node) => node)
    );
  });
}

export const vThemeModeSwitch = createComponentShortcut(VThemeModeSwitch, { props: true });

registerChildFactories(ElementNode, { vThemeModeSwitch });
