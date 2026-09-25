import { asSignal, computed } from '@yoyaflow/yoya-core/internal/core/signals/handle.js';
import { vNode } from '@yoyaflow/yoya-core/internal/core/v-node.js';
import { div } from '@yoyaflow/yoya-core/html';
import { createComponentShortcut } from '../components/shared.js';

/**
 * 与图表库无关的宿主容器（形态 B）：适配器负责真正的图表实现。
 *
 * - 结构只有一棵 `div`：静态的 `display` / `width` 归 CSS，尺寸是状态 → 读值绑定。
 * - 适配器生命周期从**猴补**改成组件钩子：`renderDom()` 猴补初始化 → `whenMount`（元素真正落地，
 *   宿主可测量）；`destroy()` 覆写 → `whenDestroy`（幂等，随子树销毁一起走）。
 * - 句柄交给适配器的是**组件节点**（`self.node()`），不是内部节点类型；适配器实例与已初始化
 *   标记是内部字段，不进绑定。
 */
export function VChart({ adapter = null, data, height, options = {}, width, ...rest } = {}) {
  const { attrs: restAttrs, style: restStyle, ...elementConfig } = rest;
  const adapterState = asSignal(adapter);
  const dataState = asSignal(data);
  const optionsState = asSignal(options || {});
  const widthState = asSignal(width);
  const heightState = asSignal(height);
  // 适配器实例 / 生命周期标记：内部字段（不是视图状态）
  let instance = null;
  let initialized = false;
  let destroyed = false;
  let host = null;

  const widthText = computed(() => (widthState.value == null ? null : toCssSize(widthState.value)));
  const heightText = computed(() =>
    heightState.value == null ? null : toCssSize(heightState.value)
  );

  return vNode((api, self) => {
    const context = () => ({
      chart: self.node(),
      data: dataState.value,
      height: heightState.value,
      host,
      options: optionsState.value,
      width: widthState.value
    });

    const destroyAdapter = () => {
      if (!initialized) {
        return;
      }

      const current = adapterState.value;

      if (current && typeof current.destroy === 'function') {
        current.destroy(instance, context());
      }
      instance = null;
      initialized = false;
    };

    const initializeAdapter = () => {
      const current = adapterState.value;

      if (!current || initialized || !host || destroyed) {
        return;
      }

      if (typeof current.init === 'function') {
        instance = current.init(host, context());
      } else if (typeof current === 'function') {
        instance = current(host, context());
      } else {
        throw new TypeError('Chart adapter must provide an init(host, context) function');
      }

      initialized = true;
    };

    const updateAdapter = (method) => {
      const current = adapterState.value;

      if (instance === null || !current || typeof current[method] !== 'function') {
        return;
      }

      current[method](instance, context());
    };

    api.adapter = (next) => {
      if (next === undefined) {
        return adapterState.value;
      }

      if (destroyed) {
        return api;
      }

      destroyAdapter();
      adapterState.value = next || null;
      initializeAdapter();
      return api;
    };

    api.data = (next) => {
      if (next === undefined) {
        return dataState.value;
      }

      dataState.value = next;
      updateAdapter('update');
      return api;
    };

    api.options = (next) => {
      if (next === undefined) {
        return optionsState.value;
      }

      optionsState.value = next || {};
      updateAdapter('update');
      return api;
    };

    api.width = (next) => {
      if (next === undefined) {
        return widthState.value;
      }

      widthState.value = next;
      updateAdapter('resize');
      return api;
    };

    api.height = (next) => {
      if (next === undefined) {
        return heightState.value;
      }

      heightState.value = next;
      updateAdapter('resize');
      return api;
    };

    api.resize = (width, height) => {
      const nextWidth = width === undefined ? widthState.value : width;
      const nextHeight = height === undefined ? heightState.value : height;

      widthState.value = nextWidth;
      heightState.value = nextHeight;
      updateAdapter('resize');
      return api;
    };

    /** 旧 `renderDom()` 猴补的等价物：元素真正落地后适配器才有可测量的宿主。 */
    api.whenMount = (hook) => {
      host = hook.element();
      initializeAdapter();
    };

    /** 旧 `destroy()` 覆写的等价物：随子树销毁收口，销毁后不再初始化（替换适配器也无效）。 */
    api.whenDestroy = () => {
      destroyed = true;
      destroyAdapter();
      host = null;
    };

    return div({
      ...elementConfig,
      attrs: restAttrs ?? {},
      style: { height: heightText, width: widthText, ...restStyle },
      vn: 'VChart'
    });
  });
}

export const vChart = createComponentShortcut(VChart, { props: true });

function toCssSize(value) {
  return typeof value === 'number' ? `${value}px` : value;
}
