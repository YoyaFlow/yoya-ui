/**
 * 文档级事件绑定——组件代码中唯一允许接触 document 的位置。
 *
 * 外部点击、拖拽、Esc、滚动这类文档级监听无法用元素 DSL 表达，
 * 组件统一通过 bindDocumentEvent 注册：
 * - 自动加 typeof document 守卫，SSR 环境安全；
 * - 返回 unbind 函数，组件在 destroy / close 时调用即可。
 */
export function bindDocumentEvent(type, handler, options = undefined) {
  if (typeof document === 'undefined') {
    return () => {};
  }

  document.addEventListener(type, handler, options);
  return () => {
    document.removeEventListener(type, handler, options);
  };
}

export function unbindDocumentEvent(type, handler, options = undefined) {
  if (typeof document === 'undefined') {
    return;
  }

  document.removeEventListener(type, handler, options);
}

/** window 级全局监听（scroll/resize/popstate 等）的同类收敛入口。 */
export function bindWindowEvent(type, handler, options = undefined) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener(type, handler, options);
  return () => {
    window.removeEventListener(type, handler, options);
  };
}

/** 注入 <style> 到 <head> 的收敛入口；dataAttribute 用于去重与标识。 */
export function injectDocumentStyle(styleText, dataAttribute = null) {
  if (typeof document === 'undefined') {
    return null;
  }

  if (dataAttribute) {
    const existing = document.querySelector(`[${dataAttribute}]`);
    if (existing) {
      return existing;
    }
  }

  const style = document.createElement('style');
  if (dataAttribute) {
    style.setAttribute(dataAttribute, '');
  }
  style.textContent = styleText;
  document.head?.appendChild(style);
  return style;
}
