import { vNode } from '../core/v-node.js';
import { div, li, ol, span } from '../html/index.js';
import { vSlot } from '../layout/v-slot.js';
import { createComponentShortcut, normalizeChildren } from '../components/shared.js';

/**
 * 步骤条（票 15 §4：**结构 + 身份 + 命令**，组件里没有元素节点类）。
 *
 * - 结构：`ol[VSteps] > li[VStep] > span[VStepsIndicator] + div[VStepsContent](title + description) + span[VStepsConnector]`；
 * - **纯内容位走 `VCard` 口径**：指示器 / 标题 / 描述在结构里 `vSlot(…)` 占位，内容
 *   （`VStepsIndicator` / `VStepsTitle` / `VStepsDescription`）自带 `vn_slot`，命令投递即落位；
 *   只有「命令要写样式」的两块（内容盒 / 连线）才留在结构里按需取用——它们不装内容，走不了内容通道；
 * - 命令**直接写快照**（`attr` / `style` / `replaceChildren`）：首屏就是构建期快照，
 *   没有"写完再刷一遍"的动作；
 * - **项归造它的一方**：容器自己造的项自己记账（子项数与每项状态从这份账里收口）；
 *   容器只把自己的容器态**交给**每一项（`vStep.track(…)`），项自己写自己的快照。
 */

/** 项标记：模块内自有子实例判定（不导出类型，也不按组件名分支）。 */
const STEP_ITEM = Symbol('yoya.stepItem');

/** 指示器内容（形态 A）：`vn_slot` 标记 = 它在步骤项里的位置。 */
export function VStepsIndicator() {
  return span({ vn: 'VStepsIndicator', vn_slot: 'indicator' });
}

/** 标题内容（形态 A）。 */
export function VStepsTitle() {
  return div({ vn: 'VStepsTitle', vn_slot: 'title' });
}

/** 描述内容（形态 A）。 */
export function VStepsDescription() {
  return div({ vn: 'VStepsDescription', vn_slot: 'description' });
}

export const vStepsIndicator = createComponentShortcut(VStepsIndicator);
export const vStepsTitle = createComponentShortcut(VStepsTitle);
export const vStepsDescription = createComponentShortcut(VStepsDescription);

/**
 * 步骤项：结构（指示器 / 内容 / 连线）+ 命令（标题 / 描述 / 图标 / 状态）。
 * 字符串 = 标题；对象 = props；容器态由 `track(…)` 进来。
 */
export function VStep() {
  return vNode((api, self) => {
    const state = {
      description: '',
      // 未设置与显式设为空串要区分：前者不产出子节点，后者保留空内容盒
      descriptionSet: false,
      direction: 'horizontal',
      icon: null,
      index: 0,
      size: 'default',
      status: null,
      stepsCurrent: 0,
      stepsStatus: 'process',
      title: '',
      titleSet: false,
      total: 1
    };

    /** 指示器已渲染的内容：状态没变就不重挂（用户给的是节点时尤其要认这个账）。 */
    let renderedIndicator;

    /** 内容投递：内容自带 `vn_slot`，投递即替换对应占位里的内容（VCard 口径）。 */
    const deliver = (part) => {
      self.node().child(part);
      return api;
    };

    /** 有效状态：自己显式设过就用它，否则按「已完成 / 当前项 / 未开始」派生。 */
    const effectiveStatus = () => {
      if (state.status) {
        return state.status;
      }

      if (state.index < state.stepsCurrent) {
        return 'finish';
      }

      if (state.index === state.stepsCurrent) {
        return state.stepsStatus || 'process';
      }

      return 'wait';
    };

    /** 指示器内容：给了图标用图标，否则按有效状态给 ✓ / ! / 序号。 */
    const indicatorContent = () => {
      if (state.icon !== null && state.icon !== undefined) {
        return state.icon;
      }

      return stepIndicatorText(effectiveStatus(), state.index);
    };

    /**
     * 写这一项的快照：状态 / aria / 指示器 / 连线 / 缩进。
     * 自身命令（title / description / icon / status）与容器给的 `track(…)` 都走它——
     * 一个状态驱动多处 DOM 时，写口必须收在一个地方，不然会出现"改一半"的中间态。
     */
    const writeStep = () => {
      const status = effectiveStatus();
      const indicatorValue = indicatorContent();

      if (!Object.is(indicatorValue, renderedIndicator)) {
        renderedIndicator = indicatorValue;
        deliver(vStepsIndicator(indicatorValue));
      }

      self.node().attr('data-status', status);
      self.node().attr('aria-current', state.index === state.stepsCurrent ? 'step' : null);
      self.node().attr('data-last', state.index === state.total - 1 ? 'true' : null);

      if (state.direction === 'vertical') {
        self.node().style('gridTemplateColumns', 'auto minmax(0, 1fr)');
        self.node().style('gap', '10px');
      } else {
        self.node().style('gridTemplateColumns', 'minmax(0, 1fr)');
        self.node().style('gap', '0');
      }

      return api;
    };

    api.title = (value) => {
      if (value === undefined) {
        return state.title;
      }

      state.title = value ?? '';
      state.titleSet = true;
      deliver(vStepsTitle(state.titleSet ? normalizeChildren(state.title) : []));
      return writeStep();
    };

    api.text = (value) => (value === undefined ? state.title : api.title(value));

    api.description = (value) => {
      if (value === undefined) {
        return state.description;
      }

      state.description = value ?? '';
      state.descriptionSet = true;
      deliver(vStepsDescription(state.descriptionSet ? normalizeChildren(state.description) : []));
      return writeStep();
    };

    api.desc = (value) => (value === undefined ? state.description : api.description(value));

    api.icon = (value) => {
      if (value === undefined) {
        return state.icon;
      }

      state.icon = value;
      return writeStep();
    };

    api.status = (value) => {
      if (value === undefined) {
        return state.status;
      }

      state.status = value || null;
      return writeStep();
    };

    /** 容器给的定位与容器态（步骤条内部协议）：算出的状态 / 连线 / 尺寸都从它派生。 */
    api.track = (context) => {
      state.direction = context.direction;
      state.index = context.index;
      state.size = context.size;
      state.stepsCurrent = context.current;
      state.stepsStatus = context.status;
      state.total = context.total;
      return writeStep();
    };

    /** props：`title / text / description / desc / icon / status / children` + 其余元素配置。 */
    api.setupObject = (config) => {
      const { children, desc, description, icon, status, text, title, ...elementConfig } = config;

      if (Object.keys(elementConfig).length > 0) {
        self.node().setup(elementConfig);
      }

      if (icon !== undefined) {
        api.icon(icon);
      }

      if (status !== undefined) {
        api.status(status);
      }

      if (title !== undefined) {
        api.title(title);
      } else if (text !== undefined) {
        api.title(text);
      }

      if (description !== undefined) {
        api.description(description);
      } else if (desc !== undefined) {
        api.description(desc);
      } else if (children !== undefined) {
        api.description(children);
      }

      return api;
    };

    /** 字符串 / 数字 = 标题。 */
    api.setupString = (value) => api.title(value);

    // 纯内容位在结构里占位（内容由命令投递）；连线 / 内容盒的样式随容器态走 CSS 规则
    return li({ role: 'listitem', vn: 'VStep' }, (step) => {
      step.child(
        vSlot('indicator'),
        div({ vn: 'VStepsContent' }, (content) =>
          content.child(vSlot('title'), vSlot('description'))
        ),
        span({ vn: 'VStepsConnector' })
      );
    });
  });
}

const stepShortcut = createComponentShortcut(VStep);

/** 快捷方法：建组件 + 按标准分派落调用方参数；同类实例复用由 `createComponentShortcut` 判定。 */
export function vStep(...args) {
  const node = stepShortcut(...args);
  // 标在节点上而不是查组件名：本容器自己认自己的项
  node[STEP_ITEM] = true;
  return node;
}

/**
 * 步骤条容器：`ol[VSteps]`；`current / status / direction / size` 是容器态，
 * 每项的状态与连线由容器 `track(…)` 后由项自己算。
 */
export function VSteps() {
  return vNode((api, self) => {
    const state = { current: 0, direction: 'horizontal', size: 'default', status: 'process' };

    /** 项账：容器自己造的项（`items` 替换 / `vStep` 追加都记在这里）。 */
    let steps = [];

    /** 把容器态交给每一项（父→子命令）：容器不替项写状态，只给"第几个 / 共几个 + 容器态"。 */
    const deliverContext = () => {
      steps.forEach((step, index) =>
        step.track({
          current: state.current,
          direction: state.direction,
          index,
          size: state.size,
          status: state.status,
          total: steps.length
        })
      );
      return api;
    };

    api.current = (value) => {
      if (value === undefined) {
        return state.current;
      }

      state.current = Math.max(0, Number(value) || 0);
      self.node().attr('data-current', String(state.current));
      return deliverContext();
    };

    api.status = (value) => {
      if (value === undefined) {
        return state.status;
      }

      state.status = ['error', 'finish', 'process'].includes(value) ? value : 'process';
      self.node().attr('data-status', state.status);
      return deliverContext();
    };

    api.direction = (value) => {
      if (value === undefined) {
        return state.direction;
      }

      state.direction = value === 'vertical' ? 'vertical' : 'horizontal';
      self.node().attr('data-direction', state.direction);
      return deliverContext();
    };

    api.size = (value) => {
      if (value === undefined) {
        return state.size;
      }

      state.size = value === 'small' ? 'small' : 'default';
      self.node().attr('data-size', state.size);
      return deliverContext();
    };

    /** 项投递：造一份项并落进 `<ol>`，账记在自己身上。 */
    api.vStep = (setup) => {
      const step = normalizeStepItem(setup);
      steps = [...steps, step];
      self.node().child(step);
      self.node().attr('data-step-count', String(steps.length));
      // 项数一变，**每一项**的"共几个"都变了（最后一项的连线显隐靠它）
      return deliverContext();
    };

    api.items = (value) => {
      if (value === undefined) {
        return steps.slice();
      }

      steps.forEach((step) => step.destroy());
      steps = [];
      (Array.isArray(value) ? value : []).forEach((item) => api.vStep(item));
      self.node().attr('data-step-count', String(steps.length));
      return deliverContext();
    };

    api.next = () => {
      if (state.current < steps.length - 1) {
        api.current(state.current + 1);
      }

      return api;
    };

    api.prev = () => {
      if (state.current > 0) {
        api.current(state.current - 1);
      }

      return api;
    };

    /** props：`current / status / direction / size / items / children` + 其余元素配置。 */
    api.setupObject = (config) => {
      const { children, current, direction, items, size, status, ...elementConfig } = config;

      if (Object.keys(elementConfig).length > 0) {
        self.node().setup(elementConfig);
      }

      if (current !== undefined) {
        api.current(current);
      }

      if (status !== undefined) {
        api.status(status);
      }

      if (direction !== undefined) {
        api.direction(direction);
      }

      if (size !== undefined) {
        api.size(size);
      }

      const itemsSetup = items ?? children;

      if (itemsSetup !== undefined) {
        api.items(itemsSetup);
      }

      return api;
    };

    /** 字符串 / 数字 = 一条步骤（只有标题）。 */
    api.setupString = (value) => {
      api.items([value]);
      return api;
    };

    // 结构里就带默认快照（命令只覆盖自己那一项）：首屏不依赖"谁先跑过一遍"
    return ol({
      'data-current': '0',
      'data-direction': 'horizontal',
      'data-size': 'default',
      'data-status': 'process',
      'data-step-count': '0',
      role: 'list',
      vn: 'VSteps'
    });
  });
}

export const vSteps = createComponentShortcut(VSteps);

/** 步骤归一：已经是本模块造的项就原样用，其余按项的标准分派建一份。 */
function normalizeStepItem(item) {
  return item?.[STEP_ITEM] ? item : vStep(item);
}

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
