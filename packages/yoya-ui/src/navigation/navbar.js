import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { ViewNode, vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { div, nav, span, strong } from '@yoyaflow/yoya-core/html';
import { allocateId } from '@yoyaflow/yoya-core/internal/core/id.js';
import {
  createComponentShortcut,
  resolveTextValue,
  setupContentSlot
} from '../components/shared.js';
import { vMenu } from './menu.js';

/**
 * 顶栏导航（票 15 §4；2026-09-23 按「容器组件」口径重写，参考实现 `VTable` / `VBreadcrumb`）。
 *
 * - **结构一次写清、部件常驻**：
 *   `nav[VNavbar] > div[VNavbarBrand](= div[VNavbarBrandDefault](strong[VNavbarBrandTitle] + span[VNavbarBrandSubtitle])
 *   + div[VNavbarBrandCustom]) + div[VNavbarMenuSlot](> vMenu) + div[VNavbarActions]`；
 *   内层菜单是**复用组件** `vMenu()`（水平模式 + 自己的身份 `VMenu`），导航栏只负责把它摆进菜单位；
 * - **品牌区两态走条件挂载**（R7）：默认品牌盒与自定义品牌盒各挂 `mountable(句柄)`，标题 / 副标题同样按"有没有
 *   内容"挂载——迁移前是"两个盒都常驻 + 行内 `display` 切换"（且 CSS 里还各写了一条 `display: none` 的默认值，
 *   于是设了标题反而看不见，见 16 号第 85 条），现在没有行内样式、也没有会被 CSS 抢走的默认值；
 * - **命令只写状态 / 只投递内容**：`title` / `subtitle` / `sticky` / `ariaLabel` 写句柄，`brand` / `menuContent` /
 *   `actions` 是内容投递口（函数 = 回调句柄就是那个部件）；分割线（`data-divider`）与吸顶（`data-sticky`）都是
 *   派生状态，样式在 `yoya.ui.css`（R5）；命令写在各自部件的构建回调里（与 `VTable` 段同一写法）；
 * - props 进参数表（`function VNavbar({ ... })`），`...rest` 照 JSX 摊进根元素工厂。
 */

const DEFAULT_ARIA_LABEL = '导航栏';

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

/**
 * 顶栏导航：品牌区 / 横向菜单 / 右侧动作区三块。props 见 `NavbarOptions`；
 * 菜单内容也支持 `menu` / `content` / `children` 三个兼容键。
 */
export function VNavbar({
  actions,
  ariaLabel,
  brand,
  children: contentOption,
  content,
  menu,
  menuContent,
  sticky = false,
  subtitle,
  title,
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // props 全是**数据**：句柄原样收下，归一（默认值 / 空）放在读时的派生上
  const ariaLabelState = asSignal(ariaLabel ?? DEFAULT_ARIA_LABEL);
  const ariaLabelText = computed(() => textOf(ariaLabelState.value) || DEFAULT_ARIA_LABEL);
  const menuLabelText = computed(() => `${ariaLabelText.value}菜单`);

  const titleState = asSignal(title ?? null);
  const subtitleState = asSignal(subtitle ?? null);
  const titleText = computed(() => textOf(titleState.value));
  const subtitleText = computed(() => textOf(subtitleState.value));
  const hasTitle = computed(() => titleText.value !== '');
  const hasSubtitle = computed(() => subtitleText.value !== '');

  const stickyState = asSignal(sticky);
  const stickyAttr = computed(() => (stickyState.value ? 'true' : null));

  /** 品牌区两态：默认（标题 + 副标题）/ 自定义（`brand(setup)` 投递进来的内容）。 */
  const brandMode = ref('default');
  const hasCustomBrand = ref(false);
  const isCustomBrand = computed(() => brandMode.value === 'custom');
  const hasBrandContent = computed(() =>
    isCustomBrand.value ? hasCustomBrand.value : hasTitle.value || hasSubtitle.value
  );
  const dividerAttr = computed(() => (hasBrandContent.value ? 'true' : null));

  /** 内层菜单：复用组件（水平模式 + 自己的身份），导航栏只管摆位与无障碍名称。 */
  const menuNode = vMenu();

  menuNode.attr({ 'aria-label': menuLabelText, id: allocateId('yoya-navbar-menu') });
  menuNode.horizontal();

  return vNode((api) => {
    api.ariaLabel = (content) => {
      if (content === undefined) {
        return ariaLabelText.value;
      }

      ariaLabelState.value = content ?? null;
      return api;
    };

    /** 标题：只收文本（节点内容走 props.title）；与迁移前同口径——设置标题回到默认品牌。 */
    api.title = (content) => {
      if (content === undefined) {
        return titleText.value;
      }

      if (content instanceof ViewNode) {
        throw new TypeError(
          'vNavbar.title(node)：标题命令只收文本，节点内容请在构建期用 props.title 给。'
        );
      }

      titleState.value = content ?? null;
      brandMode.value = 'default';
      return api;
    };

    api.subtitle = (content) => {
      if (content === undefined) {
        return subtitleText.value;
      }

      if (content instanceof ViewNode) {
        throw new TypeError(
          'vNavbar.subtitle(node)：副标题命令只收文本，节点内容请在构建期用 props.subtitle 给。'
        );
      }

      subtitleState.value = content ?? null;
      brandMode.value = 'default';
      return api;
    };

    /** 吸顶：`true` 写入（与迁移前同口径：无参 = 打开）；显隐与几何在 CSS 的 `data-sticky` 规则里。 */
    api.sticky = (value = true) => {
      if (value === undefined) {
        return Boolean(stickyState.value);
      }

      stickyState.value = Boolean(value);
      return api;
    };

    const initialMenu = menuContent ?? menu ?? content ?? contentOption;
    const initialBrand = brand;

    return nav(
      {
        ...elementConfig,
        attrs: { ...restAttrs, 'aria-label': ariaLabelText, role: 'navigation' },
        'data-sticky': stickyAttr,
        vn: 'VNavbar'
      },
      (root) =>
        root.child(
          // 品牌位：分割线与"有没有内容"都是派生状态（原来那两条 border / padding 写在行内）
          div({ 'data-divider': dividerAttr, vn: 'VNavbarBrand' }, (brandBox) =>
            brandBox.child(
              div({ vn: 'VNavbarBrandDefault' }, (defaultBox) => {
                defaultBox.mountable(computed(() => !isCustomBrand.value));
                defaultBox.child(
                  strong({ vn: 'VNavbarBrandTitle' }, (box) => {
                    box.mountable(hasTitle);
                    box.child(vText(titleText));
                  }),
                  span({ vn: 'VNavbarBrandSubtitle' }, (box) => {
                    box.mountable(hasSubtitle);
                    box.child(vText(subtitleText));
                  })
                );
              }),
              div({ vn: 'VNavbarBrandCustom' }, (customBox) => {
                customBox.mountable(isCustomBrand);

                /** 自定义品牌：`undefined` = 读回品牌盒（取用器），`null` = 回默认品牌，其余 = 投递内容。 */
                api.brand = (setup) => {
                  if (setup === undefined) {
                    return customBox;
                  }

                  if (setup === null) {
                    brandMode.value = 'default';
                    return api;
                  }

                  brandMode.value = 'custom';
                  hasCustomBrand.value = true;
                  setupContentSlot(customBox, setup);
                  return api;
                };

                if (initialBrand !== undefined) {
                  api.brand(initialBrand);
                }
              })
            )
          ),

          // 菜单位：内层是复用组件 `vMenu`，内容投递走 `menuContent`（回调句柄 = 菜单）
          div({ vn: 'VNavbarMenuSlot' }, (slot) => {
            slot.child(menuNode);

            api.menuContent = (setup) => {
              if (setup === undefined) {
                return menuNode;
              }

              if (typeof setup === 'function') {
                menuNode.setup(setup);
                return api;
              }

              menuNode.child(setup);
              return api;
            };

            if (initialMenu !== undefined) {
              api.menuContent(initialMenu);
            }
          }),

          // 动作位：调用方投递按钮 / 开关等内容
          div({ vn: 'VNavbarActions' }, (actionsBox) => {
            api.actions = (setup) => {
              if (setup === undefined) {
                return actionsBox;
              }

              setupContentSlot(actionsBox, setup);
              return api;
            };

            if (actions !== undefined) {
              api.actions(actions);
            }
          })
        )
    );
  });
}

export const vNavbar = createComponentShortcut(VNavbar, { props: true });
