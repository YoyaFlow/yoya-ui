import { ComponentNode, resolveTarget, ViewNode, VTextNode } from './node.js';
import { createIdAllocator, withIdAllocator } from './id.js';
import { withI18nStringShortcut } from './i18n.js';

/**
 * 从已取好的请求字段解析语言标识，优先级：cookie > query > Accept-Language > 默认值。
 * 不依赖具体请求对象形态：cookie / url / acceptLanguage 由调用方按框架自行提取
 * （Node 系取 req.headers.cookie，Fetch 系取 request.headers.get('cookie') 等）。
 */
export function resolveLocale(input = {}, options = {}) {
  const { cookie = '', url = '', acceptLanguage = '' } = input || {};
  const { cookieKey = 'yoya-lang', queryKey = 'locale', defaultLanguage = 'zh-CN' } = options;

  const cookieLocale = readCookieValue(cookie, cookieKey);
  if (cookieLocale) {
    return cookieLocale;
  }

  const queryLocale = readQueryValue(url, queryKey);
  if (queryLocale) {
    return queryLocale;
  }

  const acceptLocale = readAcceptLanguage(acceptLanguage);
  if (acceptLocale) {
    return acceptLocale;
  }

  return defaultLanguage;
}

function readCookieValue(cookieHeader, key) {
  if (!cookieHeader || !key) {
    return null;
  }

  for (const part of String(cookieHeader).split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    if (part.slice(0, separator).trim() !== key) continue;

    const raw = part.slice(separator + 1).trim();
    if (!raw) return null;

    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  return null;
}

function readQueryValue(url, key) {
  if (!url || !key) {
    return null;
  }

  const queryStart = String(url).indexOf('?');
  if (queryStart === -1) {
    return null;
  }

  return new URLSearchParams(String(url).slice(queryStart + 1)).get(key) || null;
}

function readAcceptLanguage(header) {
  if (!header) {
    return null;
  }

  const first = String(header).split(',')[0];
  if (!first) {
    return null;
  }

  return first.split(';')[0].trim() || null;
}

/**
 * 有 i18n 配置时，在构建期间把 ".s()" 快捷方式作用域到指定 I18n 实例；
 * i18n 可传 createI18n 工厂（接收 state）或直接传实例，构建结束后恢复外层实例。
 */
function scopeI18nBuild(i18n, state, build) {
  if (!i18n) {
    return build();
  }

  const locale = typeof i18n === 'function' ? i18n(state) : i18n;
  return withI18nStringShortcut(locale, build);
}

/**
 * 统一解析组件为 ViewNode，支持三种形态：
 * 函数工厂（接收 initialState）、带 render() 的对象组件、ViewNode 实例。
 */
function createRootNode(component, state = null) {
  if (component instanceof ViewNode) {
    return component;
  }

  if (typeof component === 'function') {
    return createRootNode(component(state), state);
  }

  if (component && typeof component.render === 'function') {
    return createRootNode(component.render(), state);
  }

  throw new TypeError(
    'renderToString/mount requires a ViewNode, a component object with render(), or a factory function'
  );
}

/**
 * 统计视图树节点数，供服务端输出上限策略使用。
 */
function countNodes(node) {
  let count = 1;

  if (typeof node.children === 'function') {
    node.children().forEach((child) => {
      count += countNodes(child instanceof ComponentNode ? child._resolve() : child);
    });
  }

  return count;
}

/**
 * 服务端把组件渲染成 HTML 字符串，并把初始状态序列化（安全内联到 script）。
 * maxNodes 超限时返回 exceeded，服务端可回退客户端渲染。
 */
export function renderToString(component, options = {}) {
  const { maxNodes = Infinity, state = null, i18n = null } = options || {};
  const serialized = serializeState(state);

  return withIdAllocator(createIdAllocator(), () => {
    const build = () => {
      const ownsTree = typeof component === 'function';
      const node = createRootNode(component, state);
      let result;

      try {
        if (countNodes(node) > maxNodes) {
          result = { exceeded: true, html: '', state: serialized };
        } else {
          result = { exceeded: false, html: node.toHTML(), state: serialized };
        }
      } finally {
        if (ownsTree) {
          node.destroy();
        }
      }

      return result;
    };

    return scopeI18nBuild(i18n, state, build);
  });
}

/**
 * 序列化首屏状态为 JSON 字符串，`<` 转义为 \u003c，可安全嵌入 <script>。
 */
export function serializeState(state) {
  if (state === null || state === undefined) {
    return null;
  }

  return JSON.stringify(state).replace(/</g, '\\u003c');
}

/**
 * 解析序列化状态；null/空串返回 null。
 */
export function parseState(serialized) {
  if (serialized === null || serialized === undefined || serialized === '') {
    return null;
  }

  return JSON.parse(serialized);
}

/**
 * 客户端全量重建挂载：以 initialState 创建组件树，替换目标容器内容并绑定事件。
 */
export function mount(component, target, state = null, options = {}) {
  return withIdAllocator(createIdAllocator(), () => {
    const build = () => {
      const node = createRootNode(component, state);
      const parent = resolveTarget(target);

      if (parent) {
        parent.replaceChildren();
        parent.appendChild(node.renderDom());
      }

      return node;
    };

    return scopeI18nBuild(options.i18n, state, build);
  });
}

/**
 * 客户端 hydration：收养服务端生成的 DOM（不重建元素），绑定 pending 事件，
 * 并让属性/文本按客户端树对齐。渲染确定性的前提下，节点身份保持不变。
 */
export function hydrate(component, target, state = null, options = {}) {
  return withIdAllocator(createIdAllocator(), () => {
    const build = () => {
      const node = createRootNode(component, state);
      const parent = resolveTarget(target);

      if (parent) {
        const rootElement = parent.firstElementChild;
        if (rootElement) {
          adoptElement(node, rootElement);
          syncSnapshots(node);
          bindElement(node);
          node.renderDom();
        } else {
          parent.appendChild(node.renderDom());
        }
      }

      return node;
    };

    return scopeI18nBuild(options.i18n, state, build);
  });
}

function adoptElement(node, existing) {
  if (node instanceof ComponentNode) {
    adoptElement(node._resolve(), existing);
    return;
  }

  if (node instanceof VTextNode) {
    if (existing && existing.nodeType === 3) {
      node._textNode = existing;
      node._el = existing;
      if (existing.textContent !== node._content) {
        existing.textContent = node._content;
      }
    } else {
      replaceExisting(existing, node.renderDom());
    }
    return;
  }

  if (existing && existing.nodeType === 1 && existing.tagName.toLowerCase() === node._tagName) {
    node._el = existing;
    node._hydrated = true;
    const childNodes = Array.from(existing.childNodes);
    node.children().forEach((child, index) => adoptElement(child, childNodes[index]));
    return;
  }

  replaceExisting(existing, node.renderDom());
}

function bindElement(node) {
  if (node instanceof ComponentNode) {
    bindElement(node._resolve());
    return;
  }

  if (node instanceof VTextNode) {
    return;
  }

  if (node._el && node._hydrated) {
    node._applyBindingsToElement();
  }

  node.children().forEach(bindElement);
}

function syncSnapshots(node) {
  if (node instanceof ComponentNode) {
    syncSnapshots(node._resolve());
    return;
  }

  if (node instanceof VTextNode) {
    return;
  }

  node.children().forEach(syncSnapshots);

  if (typeof node.hydrateSnapshot === 'function') {
    node.hydrateSnapshot();
  }
}

function replaceExisting(existing, created) {
  if (existing && existing.parentNode) {
    existing.parentNode.replaceChild(created, existing);
  }
}
