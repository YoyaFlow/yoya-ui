/**
 * 示例站的明暗模式（第三方演示共用口径）：读 `document.documentElement` 上的 `data-yoya-mode`，
 * 跟随示例站顶部主题开关与系统模式。第三方库自己的配色 / 主题 API 仍由各自的胶水组件调用，
 * 这里只回答"现在是不是深色"与"什么时候变了"。
 */
export function isDarkMode() {
  if (typeof document === 'undefined') {
    return false;
  }

  const mode = document.documentElement?.dataset.yoyaMode;

  if (mode === 'dark') {
    return true;
  }

  if (mode === 'system' && typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  return false;
}

/** 订阅明暗变化（属性冒泡 + 系统模式媒体查询），返回退订函数。 */
export function watchDocsTheme(onChange) {
  const stops = [];

  if (typeof document !== 'undefined' && typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => onChange());
    observer.observe(document.documentElement, {
      attributeFilter: ['data-yoya-mode'],
      attributes: true
    });
    stops.push(() => observer.disconnect());
  }

  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => onChange();
    query.addEventListener?.('change', handleChange);
    stops.push(() => query.removeEventListener?.('change', handleChange));
  }

  return () => stops.forEach((stop) => stop());
}
