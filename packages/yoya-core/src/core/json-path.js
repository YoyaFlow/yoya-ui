// JSON 路径原语：core 拥有「按路径读写 JSON 树」这条语义，genui 消费它
// （`genui/protocol/values.js` 从这里转出同一批函数，历史引用面不变）。
// 放在 core 的原因：句柄面（`asSignalJson` 的路径下钻）要用它，而 core 不得反向依赖 genui。

/** 纯对象判定：数组 / null / 类实例都不算 —— 只认 JSON 容器。 */
function isPlainJsonObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/** 去掉空段与 `.`，统一成以 `/` 开头的绝对路径；`'/a//b/'` → `'/a/b'`。 */
export function normalizePath(path) {
  if (path === null || path === undefined) {
    return '/';
  }

  const text = String(path).trim();
  if (text === '' || text === '.' || text === '/') {
    return '/';
  }

  const segments = text.split('/').filter((segment) => segment !== '' && segment !== '.');
  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

/** 路径 → 段落数组；根路径得到空数组。 */
export function splitPath(path) {
  const normalized = normalizePath(path);
  return normalized === '/' ? [] : normalized.slice(1).split('/');
}

/**
 * 拼接路径：`base` 是当前作用域（列表行），`path` 是相对 / 绝对路径。
 *
 * - `path` 以 `/` 开头 = 数据模型绝对路径（A2UI 的 `path` 就是这套口径）
 * - `path` 为空 / `'.'` = 作用域自身
 * - `../` 回退一层（模板里偶尔要跳出当前行）
 */
export function joinPath(base, path) {
  if (path === null || path === undefined) {
    return normalizePath(base);
  }

  const text = String(path).trim();
  if (text.startsWith('/')) {
    return normalizePath(text);
  }

  if (text === '' || text === '.') {
    return normalizePath(base);
  }

  const segments = splitPath(base);
  for (const part of text.split('/')) {
    if (part === '' || part === '.') {
      continue;
    }

    if (part === '..') {
      segments.pop();
      continue;
    }

    segments.push(part);
  }

  return segments.length === 0 ? '/' : `/${segments.join('/')}`;
}

/** 读路径：段缺失返回 undefined，不抛错（生成数据经常缺字段）。 */
export function readPath(source, path) {
  let current = source;

  for (const segment of splitPath(path)) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }

    current = current[segment];
  }

  return current;
}

/**
 * 写路径：**不可变**逐层复制（父容器的引用会变），
 * 这样 `keyed()` / 读值绑定才能看见变化（数组换引用 = 这一次写入被感知）。
 */
export function writePath(source, path, value) {
  const segments = splitPath(path);
  return setIn(source, segments, value);
}

function setIn(node, segments, value) {
  if (segments.length === 0) {
    return value;
  }

  const [head, ...rest] = segments;
  const current = node === null || node === undefined ? undefined : node[head];

  if (Array.isArray(node)) {
    const index = Number(head);
    const copy = node.slice();
    copy[index] = setIn(node[index], rest, value);
    return copy;
  }

  const copy = isPlainJsonObject(node) ? { ...node } : {};
  copy[head] = setIn(current, rest, value);
  return copy;
}

/** `path` 是否在 `prefix` 之下（含相等）：数据写入后刷新哪些 cell 靠它判定。 */
export function isPathPrefix(prefix, path) {
  const prefixSegments = splitPath(prefix);
  const segments = splitPath(path);

  if (prefixSegments.length > segments.length) {
    return false;
  }

  return prefixSegments.every((segment, index) => segment === segments[index]);
}
