import { asSignal, computed, ref } from '../core/signals/handle.js';
import { vNode } from '../core/v-node.js';
import { ViewNode, vText } from '../core/index.js';
import { img, span } from '../html/index.js';
import { createComponentShortcut } from '../components/shared.js';

const AVATAR_SIZES = ['small', 'medium', 'large', 'xlarge'];

/**
 * 头像（形态 B，照 `AGENTS.md`「Component Writing Rules」R1–R12 写）。
 *
 * - 一个业务组件函数 = 一个边界（R1）；整棵树写在最后那个 `return` 里，子节点用回调往下嵌（R2）。
 * - props 在参数表里解构、`...rest` 摊进根元素工厂（R3）；属性 / 样式进工厂参数（R4）。
 * - **静态样式在 `yoya.ui.css`**（R5）：尺寸 / 圆角 / 状态点 / 内容位与图片位的显隐都在 CSS；
 *   自定义颜色是**状态** → 只注 `--yoya-avatar-color`（R10），文字反色由 `[data-color]` 规则开关。
 * - **数据驱动**（R6 / R9）：`text` / `icon` / `src` / `size` / `shape` / `color` / `status` 给句柄就是活值，
 *   归一化放在**读时**的 `computed` 里；命令只写数据，不搬结构（没有部件句柄、没有 `replaceChildren`）。
 * - **节点内容只在构建期落位**：要运行期换的是文本（传句柄或走 `text()` / `content()` / `icon()`）；
 *   要换节点就重建组件 —— 这三个命令收到节点直接报错。
 * - **内容位只有一处**（R11）：位置由组件自己写死，不给部件 API、不留匿名投递通道；
 *   匿名 `child(...)` 是普通元素语义（进组件根），与迁移前一致。
 */
export function VAvatar({
  alt,
  children,
  color = null,
  content,
  icon,
  shape = 'circle',
  size = 'medium',
  src = null,
  status = null,
  text,
  ...rest
} = {}) {
  // `attrs` / `style` 是调用方的显式通道：并进自己的默认值，调用方给的那份优先
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;
  const altState = asSignal(alt ?? '');
  const colorState = asSignal(color || null);
  const shapeState = asSignal(shape);
  const sizeState = asSignal(size);
  const srcState = asSignal(src ?? null);
  const statusState = asSignal(status || null);
  // aria-label：命令写下的显式值（`alt()`）；内容写入会把它交还给内容文本
  const labelState = ref(null);
  // 图片态：`null` = 跟随 `src`（构建期口径），`true` / `false` = `src()` / 内容命令写过的结论
  const imageState = ref(null);

  // 归一化一律放在读时（R9）：状态存"句柄原样 / 普通值包 ref"
  const altValue = computed(() => altState.value ?? '');
  const colorValue = computed(() => colorState.value || null);
  const shapeValue = computed(() => (shapeState.value === 'square' ? 'square' : 'circle'));
  const sizeValue = computed(() =>
    AVATAR_SIZES.includes(sizeState.value) ? sizeState.value : 'medium'
  );
  const srcValue = computed(() => srcState.value || null);
  const statusValue = computed(() => statusState.value || null);
  const imageValue = computed(() =>
    imageState.value === null ? Boolean(srcValue.value) : imageState.value
  );

  // 内容位只有一处：节点在构建期落位，文本 / 句柄是活值（`text` / `content` / `icon` 写同一份数据）
  const initial = text ?? content ?? icon ?? children ?? null;
  const contentNode = initial instanceof ViewNode ? initial : null;
  const contentValue = asSignal(contentNode === null ? initial : null);
  const contentText = computed(() =>
    resolveAvatarText(contentNode === null ? contentValue.value : contentNode)
  );
  // aria-label = 显式值 → 内容文本 → alt → ''（迁移前 `_syncAvatar` 的同一条链）
  const labelValue = computed(() => labelState.value || contentText.value || altValue.value || '');

  return vNode((api) => {
    /** 内容命令：只写数据（`text` / `content` / `icon` 迁移前同义）。 */
    const writeContent = (next) => {
      if (next instanceof ViewNode) {
        throw new TypeError(
          'vAvatar 的内容命令只收文本：节点内容请在构建期用 props（text / content / icon / children）给。'
        );
      }

      contentValue.value = next ?? null;
      labelState.value = null; // 内容写入接管 aria-label，显式 `alt()` 让位
      imageState.value = false; // 内容写入 = 文字态（迁移前 `text()` 会清掉 `data-image`）
      return api;
    };
    const contentCommand = (next) => (next === undefined ? contentValue.value : writeContent(next));

    api.text = contentCommand;
    api.content = contentCommand;
    api.icon = contentCommand;

    api.src = (next) => {
      if (next === undefined) {
        return srcValue.value;
      }

      srcState.value = next || null;
      imageState.value = Boolean(next);
      return api;
    };

    api.alt = (next) => {
      if (next === undefined) {
        return altValue.value;
      }

      const value = next ?? '';
      altState.value = value;
      if (value) {
        labelState.value = value;
      }
      return api;
    };

    api.size = (next) => {
      if (next === undefined) {
        return sizeValue.value;
      }

      sizeState.value = next;
      return api;
    };

    api.shape = (next) => {
      if (next === undefined) {
        return shapeValue.value;
      }

      shapeState.value = next;
      return api;
    };

    api.color = (next) => {
      if (next === undefined) {
        return colorValue.value;
      }

      colorState.value = next || null;
      return api;
    };

    api.status = (next) => {
      if (next === undefined) {
        return statusValue.value;
      }

      statusState.value = next || null;
      return api;
    };

    /** 位置参数：字符串 / 数字 = 内容（迁移前 `_setupAvatar` 的兜底分支同口径）。 */
    api.setupString = (next) => writeContent(next);

    // 结构（R2）：一棵树写在 return 里；属性 / 样式在工厂参数里（R4），子节点在回调里往下嵌
    return span(
      {
        ...elementConfig,
        attrs: { role: 'img', 'aria-label': labelValue, ...restAttrs },
        'data-color': colorValue,
        'data-image': computed(() => (imageValue.value ? 'true' : null)),
        'data-shape': shapeValue,
        'data-size': sizeValue,
        'data-status': statusValue,
        style: { '--yoya-avatar-color': colorValue, ...restStyle },
        vn: 'VAvatar'
      },
      (root) => {
        root.child(
          // 图片位：地址与替代文本都是活值
          img({ attrs: { alt: altValue, src: srcValue }, vn: 'VAvatarImage' }),

          // 内容位：节点在构建期落位，文本 / 句柄是活值（没有文本时不挂文本节点）
          span({ vn: 'VAvatarContent' }, (box) => {
            if (contentNode !== null) {
              box.child(contentNode);
            }
            box.child(vText(contentText).mountable(computed(() => contentText.value !== '')));
          }),

          // 状态点：颜色与显隐全是 `[data-status]` 的 CSS 规则
          span({ attrs: { 'aria-hidden': 'true' }, vn: 'VAvatarStatus' })
        );
      }
    );
  });
}

export const vAvatar = createComponentShortcut(VAvatar, { props: true });

function resolveAvatarText(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value.textContent === 'function') {
    return value.textContent();
  }

  return String(value);
}
