/**
 * demo-kit：模板自带的示例组件族 —— 照它写你自己的组件族。
 *
 * 三条口径（详细说明见 `docs/genui-kit.zh-CN.md`）：
 *
 * 1. **工厂形状 `(props, place)`**：props 是 JSON（可能夹着活值句柄），`place` 是 GenUI 交给
 *    组件自己用的内容落位回调 —— `children` 已经渲染好了，位置由你决定。
 * 2. **组件只做"JSON → yoya 节点"的翻译**：状态归 GenUI 数据模型（`data` + `@:/路径`），
 *    活值一路保持句柄、不要在中途 `String(...)`（一 `String` 就把活值冻成快照）。
 * 3. **运行期元数据与 kit.json 同真**：`KIT_NAMESPACE` / `KIT_VERSION` / `repo` / `source`
 *    四段文本会被 `npm run kit:check` 逐字核对，改了一边忘了另一边当场红。
 */
import { createPlugin } from '@yoyaflow/yoya-core/genui';
import { div, h3, p, span, strong } from '@yoyaflow/yoya-core/html';
import { vBadge } from '@yoyaflow/yoya-ui/ui';

export const KIT_NAMESPACE = 'my-org/my-kit';
export const KIT_VERSION = '0.1.0';

/** 色调 → 描边 / 底色（静态样式放这里，组件本体只放随状态变的绑定）。 */
const TONES = {
  neutral: { border: '1px solid rgba(15, 23, 42, 0.10)', background: '#ffffff' },
  info: { border: '1px solid rgba(22, 119, 255, 0.28)', background: 'rgba(22, 119, 255, 0.04)' },
  success: {
    border: '1px solid rgba(82, 196, 26, 0.30)',
    background: 'rgba(82, 196, 26, 0.05)'
  },
  warning: {
    border: '1px solid rgba(250, 173, 20, 0.34)',
    background: 'rgba(250, 173, 20, 0.06)'
  }
};

const TREND_TEXT = { up: '▲', down: '▼', flat: '—' };
const TREND_COLOR = { up: '#16a34a', down: '#dc2626', flat: '#64748b' };

/**
 * element 形态的通用配置：调用方的 `class` / `attrs` / `style` 通道原样透传，
 * 其余 props 不外泄成 DOM 属性（JSON 里的业务字段不该跑到标签上）。
 *
 * `vn` 是**视图根的身份**（组件实例判定、CSS 作用域、GenUI 扫描都读它）：
 * 调用方没给就用组件自己的默认值。
 */
function elementConfig(props, defaults, extra) {
  const { attrs, class: className, style, vn, id, ...rest } = props;
  const { vn: defaultVn, ...styleDefaults } = defaults;
  const unused = Object.keys(rest);

  if (unused.length > 0) {
    // 只在开发期喊一声：props 写错了当场看得见，但仍然渲染（不因为一个拼错的键白屏）
    console.warn(`[demo-kit] 未识别的 props：${unused.join(', ')}`);
  }

  return {
    ...(id !== undefined ? { id } : {}),
    ...(extra ?? {}),
    vn: vn ?? defaultVn,
    attrs,
    class: className,
    style: { boxSizing: 'border-box', ...styleDefaults, ...(style ?? {}) }
  };
}

/**
 * 面板：标题 + 说明 + 内容位（`children` 由 GenUI 渲染好交给 `place`）。
 *
 * 这是**最常用的形状**：调用方按 JSON 给 props，内容按书写顺序落进面板。
 */
export function PanelKit(props = {}, place) {
  const { title, description, tone = 'neutral', ...rest } = props;
  const skin = TONES[tone] ?? TONES.neutral;

  return div(
    elementConfig(
      rest,
      {
        vn: 'PanelKit',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '16px',
        borderRadius: '10px',
        font: '14px/1.6 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
        color: '#0f172a',
        width: '100%',
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.06)',
        ...skin
      },
      { 'data-tone': tone }
    ),
    (root) => {
      if (title !== undefined && title !== null && title !== '') {
        root.child(
          h3(
            { vn: 'PanelKitTitle', style: { margin: '0', fontSize: '16px', lineHeight: '1.4' } },
            (heading) => heading.child(title)
          )
        );
      }

      if (description !== undefined && description !== null && description !== '') {
        root.child(
          p(
            {
              vn: 'PanelKitDescription',
              style: { margin: '0', fontSize: '13px', opacity: '0.72' }
            },
            (paragraph) => paragraph.child(description)
          )
        );
      }

      // 内容位：位置固定在最后（单内容位不给部件 API，见组件写法规则 R11）
      place?.(root);
    }
  );
}

/**
 * 指标卡：标签 + 数值 + 单位 + 趋势。
 *
 * `value` 声明了 `live: true`（见下面的组件表）：`"@:/metrics/orders"` 这类引用会以**句柄**
 * 形式进来，写数据模型即更新文本，不重建节点。
 */
export function MetricKit(props = {}, place) {
  const { label, unit, value, trend, tone = 'neutral', ...rest } = props;
  const skin = TONES[tone] ?? TONES.neutral;

  return div(
    elementConfig(
      rest,
      {
        vn: 'MetricKit',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        padding: '14px 16px',
        borderRadius: '10px',
        minWidth: 'min(100%, 180px)',
        font: '14px/1.5 system-ui, -apple-system, "Segoe UI", "Microsoft YaHei", sans-serif',
        color: '#0f172a',
        ...skin
      },
      { 'data-tone': tone }
    ),
    (root) => {
      if (label !== undefined && label !== null && label !== '') {
        root.child(
          span({ vn: 'MetricKitLabel', style: { fontSize: '12px', color: '#64748b' } }, (node) =>
            node.child(label)
          )
        );
      }

      root.child(
        span(
          {
            vn: 'MetricKitValue',
            style: { display: 'flex', alignItems: 'baseline', gap: '4px' }
          },
          (node) => {
            node.child(
              strong({ style: { fontSize: '24px', lineHeight: '1.2' } }, (text) =>
                text.child(value)
              )
            );

            if (unit !== undefined && unit !== null && unit !== '') {
              node.child(
                span({ style: { fontSize: '12px', color: '#64748b' } }, (text) => text.child(unit))
              );
            }

            if (trend !== undefined && trend !== null && trend !== '') {
              node.child(
                span(
                  {
                    vn: 'MetricKitTrend',
                    'data-trend': trend,
                    style: { fontSize: '12px', color: TREND_COLOR[trend] ?? TREND_COLOR.flat }
                  },
                  (text) => text.child(TREND_TEXT[trend] ?? String(trend))
                )
              );
            }
          }
        )
      );

      place?.(root);
    }
  );
}

/**
 * 徽标：**包 yoya-ui 组件的参考实现** —— 真正做 kit 时最常写的就是这一种。
 *
 * - 内容走 `childrenProp: 'children'`：GenUI 在调用工厂之前就把子节点渲染好塞进 props；
 * - `count` / `text` / `status` 声明 `live: true`：引用来的是句柄，`vBadge` 自己按活值处理；
 * - 有 `childrenProp` 的组件**不吃节点级 `text` 短写**（GenUI 的文本通道让位给内容通道），
 *   文本写 `props.text`（本组件的契约就是这么定的）。
 */
export function BadgeKit(props = {}) {
  const { children, count, dot, label, overflowCount, showZero, status, text } = props;

  return vBadge({
    children,
    count,
    dot,
    overflowCount,
    showZero,
    status,
    text: text ?? label
  });
}

export const demoKitComponents = {
  PanelKit,
  MetricKit,
  BadgeKit
};

export const DEMO_KIT_COMPONENT_NAMES = Object.keys(demoKitComponents);

/**
 * 组件族插件：一个 kit 制品注册一族组件。
 *
 * - `kind: 'element'` = 工厂是 `(props, place)` 形态（内容由组件自己落位）；
 * - `props` 表只写**要覆盖默认行为**的键：默认是"按名字透传 + 落当次值"，
 *   写 `{ live: true }` 才是把活值句柄原样交给组件（`@:/路径` 联动的基础）；
 * - 内容 / 文本通道用 `childrenProp` / `textProp` 声明，其余交给默认。
 */
export const demoKitPlugin = createPlugin({
  id: `${KIT_NAMESPACE}@${KIT_VERSION}#demo-kit`,
  namespace: KIT_NAMESPACE,
  version: KIT_VERSION,
  repo: 'https://github.com/your-org/my-kit',
  source: 'components/demo-kit/impl.js',
  aliases: ['my-kit'],
  components: {
    PanelKit: { factory: PanelKit, kind: 'element' },
    MetricKit: {
      factory: MetricKit,
      kind: 'element',
      props: { label: { live: true }, unit: { live: true }, value: { live: true } }
    },
    BadgeKit: {
      factory: BadgeKit,
      kind: 'element',
      childrenProp: 'children',
      props: {
        count: { live: true },
        label: { live: true },
        status: { live: true },
        text: { live: true }
      }
    }
  }
});

export default demoKitComponents;
