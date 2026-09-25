import { asSignal, computed, ref } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { ViewNode, vText } from '@yoyaflow/yoya-core/internal/core/index.js';
import { div, li, ol, span } from '@yoyaflow/yoya-core/html';
import {
  createComponentShortcut,
  createListItemKey,
  resolveTextValue
} from '../components/shared.js';

/**
 * 步骤条（票 15 §4；2026-09-23 按「容器组件」口径重写，参考实现 `VTable` / `VAnchor`）。
 *
 * - **结构一次写清**：
 *   `ol[VSteps] > li[VStep] > span[VStepsIndicator] + div[VStepsContent](title + description) + span[VStepsConnector]`；
 * - **指示器 / 标题 / 描述是内部块**（R11 / R12：位置由组件自己定，调用方不按名投递），内容全是活值——
 *   节点在构建期落位，文本 / 句柄走读值绑定；不再有"占位 + 内容工厂投递"那圈（那是给**调用方可投递**的
 *   部件用的，这里三块位置都归组件）；
 * - **列表 = 一份 `ref([])` + `keyed` 对账**：项从 `items` / `vStep` 来，增删改排序交给引擎（同节点复用、
 *   离场销毁、最小搬动），命令只写那一份数据；`data-step-count` 直接读它；
 * - **容器态是几个句柄**：`current / status / direction` 由容器持有，项通过 `track(context)` 拿到它们 +
 *   按自己的身份查下标（容器按自己造出来的项找），状态 / 连线 / 几何全由项自己派生——容器不遍历每一项，
 *   也不替项写状态；
 * - 命令只写状态 / 数据，DOM 全走读值绑定；静态样式在 `yoya.ui.css`（连线的几何随容器 `data-*` 走规则）。
 */

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const STEP_ITEM = Symbol('yoya.stepItem');

const STATUSES = new Set(['error', 'finish', 'process']);

/** 文本归一（读时归一：`null` / 数字 / 节点都成一段文本）。 */
const textOf = (value) => resolveTextValue(value);

/** 列表归一：数组原样、空值成空表、其余单值成一项。 */
const asList = (value) =>
  value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];

/** 序号：完成 ✓、出错 !、其余显示第几个。 */
function stepIndicatorText(status, index) {
  if (status === 'finish') {
    return '✓';
  }

  if (status === 'error') {
    return '!';
  }

  return String(index + 1);
}

/**
 * 步骤项：结构（指示器 / 内容 / 连线）+ 命令（标题 / 描述 / 图标 / 状态）。
 * 字符串 = 标题；props 见 `StepItemOptions`；容器态由 `track(context)` 进来。
 */
export function VStep({
  children: descriptionOption,
  desc,
  description,
  icon = null,
  status = null,
  text,
  title = null,
  ...rest
} = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;

  // 三块内容都是**数据**：节点在构建期落位；文本 / 句柄是活值（`description` / `desc` / `children` 同义）
  const initialTitle = title ?? text ?? null;
  const initialDescription = description ?? desc ?? descriptionOption ?? null;
  const titleNode = initialTitle instanceof ViewNode ? initialTitle : null;
  const descriptionNode = initialDescription instanceof ViewNode ? initialDescription : null;
  const iconNode = icon instanceof ViewNode ? icon : null;

  const titleState = asSignal(titleNode === null ? initialTitle : null);
  const descriptionState = asSignal(descriptionNode === null ? initialDescription : null);
  const iconState = asSignal(iconNode === null ? icon : null);
  const ownStatusState = asSignal(status);

  const titleText = computed(() => textOf(titleState.value));
  const descriptionText = computed(() => textOf(descriptionState.value));
  const iconText = computed(() => textOf(iconState.value));
  const ownStatus = computed(() => (ownStatusState.value ? String(ownStatusState.value) : null));

  /** 容器给的定位 + 容器态（步骤条内部协议）；脱离容器时下面各派生回落到自己的默认值。 */
  const context = ref(null);

  return vNode((api, self) => {
    // 下标按身份查（容器按自己造出来的项找，不遍历结构）；项数 / 当前项 / 方向 / 状态都是容器的句柄
    const index = computed(() => {
      const at = context.value?.indexOf?.(self.node());
      return at === undefined || at < 0 ? 0 : at;
    });
    const total = computed(() => context.value?.total?.value ?? 1);
    const current = computed(() => context.value?.current?.value ?? 0);
    const direction = computed(() => context.value?.direction?.value ?? 'horizontal');

    /** 有效状态：自己显式设过就用它，否则按「已完成 / 当前项 / 未开始」派生。 */
    const statusValue = computed(() => {
      const own = ownStatus.value;

      if (own) {
        return own;
      }

      if (index.value < current.value) {
        return 'finish';
      }

      if (index.value === current.value) {
        return context.value?.status?.value ?? 'process';
      }

      return 'wait';
    });

    /** 指示器内容：给了图标用图标，否则按有效状态给 ✓ / ! / 序号。 */
    const indicatorText = computed(() =>
      iconText.value === '' ? stepIndicatorText(statusValue.value, index.value) : iconText.value
    );

    api.title = (next) => {
      if (next === undefined) {
        return titleState.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vStep.title(node)：标题命令只收文本，节点标题请在构建期用 props.title 给。'
        );
      }

      titleState.value = next ?? null;
      return api;
    };

    api.text = (next) => (next === undefined ? titleText.value : api.title(next));

    api.description = (next) => {
      if (next === undefined) {
        return descriptionState.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vStep.description(node)：描述命令只收文本，节点描述请在构建期用 props.description 给。'
        );
      }

      descriptionState.value = next ?? null;
      return api;
    };

    api.desc = (next) => (next === undefined ? descriptionText.value : api.description(next));

    api.icon = (next) => {
      if (next === undefined) {
        return iconState.value;
      }

      if (next instanceof ViewNode) {
        throw new TypeError(
          'vStep.icon(node)：图标命令只收文本，节点图标请在构建期用 props.icon 给。'
        );
      }

      iconState.value = next ?? null;
      return api;
    };

    api.status = (next) => {
      if (next === undefined) {
        return ownStatus.value;
      }

      ownStatusState.value = next || null;
      return api;
    };

    /** 容器给的定位与容器态：只收句柄，项自己派生（容器不替项写状态，也不遍历每一项）。 */
    api.track = (next) => {
      context.value = next ?? null;
      return api;
    };

    /** 字符串 / 数字 = 标题。 */
    api.setupString = (value) => api.title(value);

    // 结构（R2）：一棵树写在 return 里；状态走读值绑定（R6），几何随容器态走 CSS 变量 / 绑定
    return li(
      {
        ...elementConfig,
        attrs: {
          ...restAttrs,
          'aria-current': computed(() => (index.value === current.value ? 'step' : null))
        },
        'data-last': computed(() => (index.value === total.value - 1 ? 'true' : null)),
        'data-status': statusValue,
        role: 'listitem',
        style: {
          ...restStyle,
          gap: computed(() => (direction.value === 'vertical' ? '10px' : '0')),
          gridTemplateColumns: computed(() =>
            direction.value === 'vertical' ? 'auto minmax(0, 1fr)' : 'minmax(0, 1fr)'
          )
        },
        vn: 'VStep'
      },
      (step) =>
        step.child(
          // 指示器：图标给了就用图标（构建期落位），否则一直是活文本（✓ / ! / 序号）
          span({ vn: 'VStepsIndicator' }, (box) => {
            if (iconNode !== null) {
              box.child(iconNode);
            } else {
              box.child(vText(indicatorText));
            }
          }),

          // 内容盒：标题 / 描述都是内部块，空内容不挂文本节点（CSS `:empty` 规则隐掉空盒）
          div({ vn: 'VStepsContent' }, (content) =>
            content.child(
              div({ vn: 'VStepsTitle' }, (box) => {
                if (titleNode !== null) {
                  box.child(titleNode);
                }

                box.child(vText(titleText).mountable(computed(() => titleText.value !== '')));
              }),
              div({ vn: 'VStepsDescription' }, (box) => {
                if (descriptionNode !== null) {
                  box.child(descriptionNode);
                }

                box.child(
                  vText(descriptionText).mountable(computed(() => descriptionText.value !== ''))
                );
              })
            )
          ),

          span({ vn: 'VStepsConnector' })
        )
    );
  });
}

const stepShortcut = createComponentShortcut(VStep, { props: true });

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vStep(...args) {
  const node = stepShortcut(...args);
  // 标在节点上而不是查组件名：本容器自己认自己的项
  node[STEP_ITEM] = true;
  return node;
}

/**
 * 步骤条容器：`ol[VSteps]`；`current / status / direction / size` 是容器态，
 * 每项的状态与连线由项 `track(…)` 后自己算。
 */
export function VSteps({
  children: stepOptions,
  current = 0,
  direction = 'horizontal',
  items,
  size = 'default',
  status = 'process',
  ...rest
} = {}) {
  const { attrs: restAttrs, ...elementConfig } = rest;

  // props 全是**数据**：句柄原样收下，归一（数字 / 合法值 / 空）放在读时的派生上
  const currentState = asSignal(current);
  const directionState = asSignal(direction);
  const sizeState = asSignal(size);
  const statusState = asSignal(status);

  const currentValue = computed(() => Math.max(0, Number(currentState.value) || 0));
  const directionValue = computed(() =>
    directionState.value === 'vertical' ? 'vertical' : 'horizontal'
  );
  const sizeValue = computed(() => (sizeState.value === 'small' ? 'small' : 'default'));
  const statusValue = computed(() =>
    STATUSES.has(statusState.value) ? statusState.value : 'process'
  );
  const currentText = computed(() => String(currentValue.value));

  /** 项：一份数据源（结构由 keyed 对账；步数直接读它）。 */
  const stepNodes = ref([]);
  const stepCount = computed(() => String(stepNodes.value.length));
  const keyOfStep = createListItemKey('step-item');

  return vNode((api) => {
    /**
     * 容器态句柄：项通过 `track(context)` 拿到它们，并用 `indexOf` 按身份查自己的下标
     * （容器按自己造出来的项找——见 16 号清单第 15 / 22 条，不遍历结构找节点）。
     */
    const context = {
      current: currentValue,
      direction: directionValue,
      indexOf: (step) => stepNodes.value.indexOf(step),
      status: statusValue,
      total: stepCount
    };

    /** 建 / 复用一份项，并把容器态句柄交给它。 */
    const wireStep = (setup) => {
      const step = normalizeStepItem(setup);
      step.track(context);
      return step;
    };

    api.current = (value) => {
      if (value === undefined) {
        return currentValue.value;
      }

      currentState.value = value;
      return api;
    };

    api.status = (value) => {
      if (value === undefined) {
        return statusValue.value;
      }

      statusState.value = value;
      return api;
    };

    api.direction = (value) => {
      if (value === undefined) {
        return directionValue.value;
      }

      directionState.value = value;
      return api;
    };

    api.size = (value) => {
      if (value === undefined) {
        return sizeValue.value;
      }

      sizeState.value = value;
      return api;
    };

    /** 追加一份项：只写数据，结构交给 `keyed` 对账。 */
    api.vStep = (setup) => {
      stepNodes.value = [...stepNodes.value, wireStep(setup)];
      return api;
    };

    /** 项整批替换：写一份新数组（留下来的项按身份键复用，离场的销毁）。 */
    api.items = (value) => {
      if (value === undefined) {
        return stepNodes.value.slice();
      }

      stepNodes.value = asList(value).map(wireStep);
      return api;
    };

    api.next = () => {
      const last = stepNodes.value.length - 1;

      if (currentValue.value < last) {
        api.current(currentValue.value + 1);
      }

      return api;
    };

    api.prev = () => {
      if (currentValue.value > 0) {
        api.current(currentValue.value - 1);
      }

      return api;
    };

    /** 字符串 / 数字 = 一条步骤（只有标题）。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
    };

    const initialSteps = items ?? stepOptions;

    if (initialSteps !== undefined) {
      api.items(initialSteps);
    }

    return ol(
      {
        ...elementConfig,
        attrs: { ...restAttrs, role: 'list' },
        'data-current': currentText,
        'data-direction': directionValue,
        'data-size': sizeValue,
        'data-status': statusValue,
        'data-step-count': stepCount,
        vn: 'VSteps'
      },
      (list) => list.keyed(stepNodes, keyOfStep, (step) => step)
    );
  });
}

export const vSteps = createComponentShortcut(VSteps, { props: true });

/** 步骤归一：已经是本模块造的项就原样用，其余按项的标准分派建一份。 */
function normalizeStepItem(item) {
  return item?.[STEP_ITEM] ? item : vStep(item);
}
