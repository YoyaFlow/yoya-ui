import { asSignal, computed } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { div } from '@yoyaflow/yoya-core/html';
import { createComponentShortcut, setupContentSlot, themeValue } from '../components/shared.js';

const timelineStatusColors = {
  danger: themeValue('color-danger', '#dc2626'),
  default: themeValue('color-text-secondary', '#94a3b8'),
  processing: themeValue('color-info', '#1677ff'),
  success: themeValue('color-success', '#16a34a'),
  warning: themeValue('color-warning', '#d97706')
};

const statusNames = new Set(Object.keys(timelineStatusColors));

/**
 * 时间线（形态 B）：竖向事件流，节点状态色区分成功 / 失败 / 进行中。
 *
 * - 结构只有「根 + 一条竖线」：线在视图里，**永远是第一个孩子**；条目走匿名内容通道
 *   （`timeline.vTimelineItem(…)` 投递进来的项排在线的后面，与迁移前一致）。
 * - 静态样式（定位 / 颜色 / 宽度）在 `yoya.ui.css`。
 */
export function VTimeline({ children, ...rest } = {}) {
  return vNode(() =>
    div({ ...rest, vn: 'VTimeline' }, (root) => {
      root.child(div({ vn: 'VTimelineLine' }));
      if (children !== undefined) {
        root.child(children);
      }
    })
  );
}

export const vTimeline = createComponentShortcut(VTimeline, { props: true });

/**
 * 时间线条目（形态 B）：指示点 + 标题 + 时间 + 内容。
 *
 * - `status` / `title` / `time` 是**数据**（状态与活文本走读值绑定）；状态色是状态 → 读值绑定，
 *   其余样式在 `yoya.ui.css`。
 * - `content(setup)` 保留**内容通道**口径（`setupContentSlot`：函数 / 节点 / 文本 + 无参返回内容盒）：
 *   内容盒在结构里，命令拿到它就写——与 `VField` 的查看面 / 编辑面同一写法。
 */
export function VTimelineItem({
  content,
  status = 'default',
  time = '',
  title = '',
  ...rest
} = {}) {
  const statusState = asSignal(status);
  const titleState = asSignal(title);
  const timeState = asSignal(time);

  const statusValue = computed(() =>
    statusNames.has(statusState.value) ? statusState.value : 'default'
  );
  const dotColor = computed(() => timelineStatusColors[statusValue.value]);
  const titleText = computed(() => titleState.value ?? '');
  const timeText = computed(() => timeState.value ?? '');

  // 内容盒：命令要往里写内容，所以留成有名节点（与 `VField` 的查看面 / 编辑面同一口径）
  const contentBox = div({ vn: 'VTimelineItemContent' });

  return vNode((api) => {
    api.status = (next) => {
      if (next === undefined) {
        return statusValue.value;
      }

      statusState.value = next;
      return api;
    };

    api.title = (next) => {
      if (next === undefined) {
        return titleText.value;
      }

      titleState.value = next;
      return api;
    };

    api.time = (next) => {
      if (next === undefined) {
        return timeText.value;
      }

      timeState.value = next;
      return api;
    };

    api.content = (setup) => {
      if (setup === undefined) {
        return contentBox;
      }

      setupContentSlot(contentBox, setup);
      return api;
    };

    // props 里的内容在构建期落位（内容盒此时还没进树，写完跟着树一起落地）
    if (content !== undefined) {
      setupContentSlot(contentBox, content);
    }

    // 结构（R2）：一棵树写在 return 里；静态样式在 CSS（R5），随状态变的走绑定（R6）
    return div({ ...rest, vn: 'VTimelineItem' }, (item) => {
      item.child(
        div({ vn: 'VTimelineItemIndicator' }, (indicator) =>
          indicator.child(div({ style: { background: dotColor }, vn: 'VTimelineItemDot' }))
        ),
        div({ vn: 'VTimelineItemBody' }, (body) => {
          body.child(
            div({ vn: 'VTimelineItemTitle' }, (box) => box.child(vText(titleText))),
            div({ vn: 'VTimelineItemTime' }, (box) => box.child(vText(timeText))),
            contentBox
          );
        })
      );
    });
  });
}

export const vTimelineItem = createComponentShortcut(VTimelineItem, { props: true });
