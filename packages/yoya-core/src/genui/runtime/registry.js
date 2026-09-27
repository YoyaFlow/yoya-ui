import { ERROR_CODES, GenUIError } from '../protocol/errors.js';

/** 保留命名空间：`core` = 裸 HTML 标签与布局工厂；`local` = 宿主程序化注册。 */
export const CORE_NAMESPACE = 'core';
export const LOCAL_NAMESPACE = 'local';

const HOST_LIKE = /^(?:[a-z0-9-]+\.)+[a-z]{2,}$|^localhost$/i;

/**
 * 解析组件引用（host 可省，注册表键必带 host）：
 *
 * ```
 * [ <host> '/' ] <owner> '/' <repo> [ '@' <version> ] '#' <name>
 * | <alias> '#' <name>          // schema 里声明过的库短名
 * | <name>                      // 裸名：local → core → 默认库 → 已装库唯一命中
 * ```
 */
export function parseComponentRef(ref) {
  if (typeof ref !== 'string' || ref.trim() === '') {
    return null;
  }

  const text = ref.trim();
  const hash = text.indexOf('#');

  if (hash === -1) {
    return { library: null, name: text, ref: text, version: null };
  }

  const { path, version } = splitLibraryVersion(text.slice(0, hash));

  return {
    library: path === '' ? null : path,
    name: text.slice(hash + 1),
    ref: text,
    version
  };
}

/** 归一库引用：去协议头 / `.git` / 末尾斜杠，小写；返回 host 与 path 两段。 */
export function normalizeLibraryRef(ref) {
  const raw = String(ref ?? '')
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/, '');
  const segments = raw.split('/').filter((segment) => segment !== '');
  const host = segments.length >= 3 && HOST_LIKE.test(segments[0]) ? segments[0] : null;
  const path = (host === null ? segments : segments.slice(1)).join('/');

  return {
    host,
    key: (host === null ? path : `${host}/${path}`).toLowerCase(),
    path
  };
}

function splitLibraryVersion(ref) {
  const text = String(ref ?? '').trim();
  const lastSlash = text.lastIndexOf('/');
  const at = text.indexOf('@', lastSlash + 1);

  if (at === -1) {
    return { path: text, version: null };
  }

  return { path: text.slice(0, at), version: text.slice(at + 1) };
}

/**
 * 组件注册表：**组件库 → 组件**两级。
 *
 * - 一个运行时里同一个库只能有一个版本（装第二个版本抛错并列出双方来源）；
 * - 库内同名才是冲突（跨库同名由命名空间消歧）；
 * - 解析顺序：显式命名空间 → `local` → `core` → 默认库 → 已装库唯一命中；
 * - 多候选命中时报错并列出候选，不做隐式选择。
 */
export class ComponentRegistry {
  constructor(entries = null) {
    this._libraries = new Map();
    this._aliases = new Map();
    this._core = new Map();
    this._local = new Map();
    this._defaultKey = null;
    this._installed = new Map();

    if (entries) {
      this.registerAll(entries);
    }
  }

  /**
   * 装一个插件（组件库、方言、适配补丁、动作、主题都可以打包进来）。
   *
   * - 同一个 `id` 重复安装是幂等的（不叠加、不重复注册）；
   * - 返回 dispose（卸载：注册表回到安装前的快照）；
   * - `extra` 是宿主给插件 API 面补的通道（方言 / 动作 / 主题由上层注入）。
   */
  install(plugin, extra = {}) {
    const definition = typeof plugin === 'function' ? plugin() : plugin;
    const id = definition?.id ?? definition?.namespace ?? `plugin#${this._installed.size + 1}`;

    if (this._installed.has(id)) {
      return this._installed.get(id).dispose;
    }

    const snapshot = this._snapshot();
    const addedLibraries = [];
    const api = {
      ...extra,
      component: (name, componentDefinition) => this.register(name, componentDefinition),
      core: (entries) => this.registerCore(entries),
      library: (options) => {
        const record = this.registerLibrary(options);
        addedLibraries.push(record.key);
        return record;
      }
    };
    const dispose = () => {
      this._restore(snapshot);
      addedLibraries.length = 0;
      this._installed.delete(id);
    };

    this._installed.set(id, { dispose, id });

    try {
      definition.install(api);
    } catch (error) {
      dispose();
      throw error;
    }

    return dispose;
  }

  installedPlugins() {
    return [...this._installed.keys()];
  }

  _snapshot() {
    return {
      aliases: new Map(this._aliases),
      core: new Map(this._core),
      defaultKey: this._defaultKey,
      libraries: new Map(
        [...this._libraries].map(([key, record]) => [
          key,
          { ...record, aliases: [...record.aliases], components: new Map(record.components) }
        ])
      ),
      local: new Map(this._local)
    };
  }

  _restore(snapshot) {
    this._aliases = new Map(snapshot.aliases);
    this._core = new Map(snapshot.core);
    this._defaultKey = snapshot.defaultKey;
    this._libraries = new Map(
      [...snapshot.libraries].map(([key, record]) => [
        key,
        { ...record, aliases: [...record.aliases], components: new Map(record.components) }
      ])
    );
    this._local = new Map(snapshot.local);
  }

  /** 注册一个组件库（官方库、第三方库、本地库都走这条）。 */
  registerLibrary(options = {}) {
    const namespace = options.namespace ?? options.key;
    const normalized = normalizeLibraryRef(namespace);
    // 引用里 host 可省，但注册表键带上 host（跨托管平台的同名仓库才不撞）：
    // namespace 没写 host 时，从 repo 地址推导。
    const fromRepo = typeof options.repo === 'string' ? normalizeLibraryRef(options.repo) : null;
    const key = normalized.host === null && fromRepo?.host ? fromRepo.key : normalized.key;

    if (key === '') {
      throw new GenUIError('注册组件库需要 namespace（owner/repo）', {
        code: ERROR_CODES.component
      });
    }

    const version = options.version ?? null;
    const existing = this._libraries.get(key);

    if (existing && options.replace !== true && existing.version !== version) {
      throw new GenUIError(
        `组件库版本冲突：${key} 已装 ${existing.version ?? '（无版本）'}` +
          `（来自 ${existing.source}），不能再装 ${version ?? '（无版本）'}` +
          `（来自 ${options.source ?? '未知来源'}）。同一个库在一个运行时里只能有一个版本。`,
        { code: ERROR_CODES.component }
      );
    }

    const record =
      existing && options.replace !== true
        ? existing
        : {
            aliases: [],
            components: new Map(),
            default: false,
            host: normalized.host ?? fromRepo?.host ?? null,
            key,
            namespace: String(namespace),
            path: normalized.path,
            priority: 0,
            repo: options.repo ?? null,
            source: options.source ?? `${key}${version ? `@${version}` : ''}`,
            version
          };

    if (options.default === true) {
      record.default = true;
      this._defaultKey = key;
    }

    if (typeof options.priority === 'number') {
      record.priority = options.priority;
    }

    [record.namespace, normalized.path, ...(options.aliases ?? [])]
      .filter((alias) => typeof alias === 'string' && alias.trim() !== '')
      .forEach((alias) => {
        if (!record.aliases.includes(alias)) {
          record.aliases.push(alias);
        }

        this._aliases.set(alias.toLowerCase(), key);
      });

    this._libraries.set(key, record);

    Object.entries(options.components ?? {}).forEach(([name, definition]) => {
      this._registerComponent(record.key, record.components, name, definition, {
        replace: options.replace === true || definition?.replace === true,
        source: record.source
      });
    });

    return record;
  }

  /** 宿主内联注册（`local` 命名空间）：`register('pageHero', { factory })`。 */
  register(name, definition = {}) {
    this._registerComponent(LOCAL_NAMESPACE, this._local, name, definition, {
      replace: definition?.replace === true,
      source: LOCAL_NAMESPACE
    });
    return this;
  }

  registerAll(entries) {
    Object.entries(entries ?? {}).forEach(([name, definition]) => this.register(name, definition));
    return this;
  }

  /** 注册 `core` 保留命名空间（裸 HTML 标签 / 布局工厂）——只允许本库内部调用。 */
  registerCore(entries) {
    Object.entries(entries ?? {}).forEach(([name, definition]) => {
      this._registerComponent(CORE_NAMESPACE, this._core, name, definition, {
        replace: false,
        source: CORE_NAMESPACE
      });
    });
    return this;
  }

  /**
   * 解析 `type` → 组件条目。未命中返回 null（交给渲染器的 `onUnknown`）；
   * **多候选**（裸名在多个库里都有）直接抛错并列出候选。
   */
  resolve(ref) {
    const parsed = parseComponentRef(ref);

    if (parsed === null) {
      return null;
    }

    if (parsed.library !== null) {
      return this._resolveInLibrary(parsed.library, parsed.name, parsed.ref);
    }

    const raw = parsed.name;
    // core 只认**精确小写名**：HTML 标签就是这么写的（`div` / `button` / `input`），
    // 于是 PascalCase 组件（`Button` / `Input`）不会被裸标签抢走，两者可以并存。
    const core = this._core.get(raw);

    if (core) {
      return core;
    }

    const name = raw.toLowerCase();
    const local = this._local.get(name);

    if (local) {
      return local;
    }

    const fromDefault = this._resolveFromDefault(name);

    if (fromDefault) {
      return fromDefault;
    }

    const candidates = this._candidateLibraries(name);

    if (candidates.length === 1) {
      return candidates[0].components.get(name);
    }

    if (candidates.length > 1) {
      throw new GenUIError(
        `组件 "${parsed.name}" 在多个库里都存在，需要显式命名空间：` +
          candidates.map((record) => `${record.namespace}#${parsed.name}`).join(' / '),
        { code: ERROR_CODES.component }
      );
    }

    return null;
  }

  has(ref) {
    try {
      return this.resolve(ref) !== null;
    } catch {
      return true;
    }
  }

  /** 可解析的名字清单（去重、按字母序）。 */
  names() {
    const names = new Set();

    [
      this._core,
      this._local,
      ...[...this._libraries.values()].map((lib) => lib.components)
    ].forEach((bucket) => bucket.forEach((entry) => names.add(entry.name)));

    return [...names].sort();
  }

  /** 已装库清单（诊断 / 能力清单用）。 */
  libraries() {
    return [...this._libraries.values()].map((record) => ({
      aliases: [...record.aliases],
      componentCount: new Set([...record.components.values()].map((entry) => entry.name)).size,
      default: record.default,
      host: record.host,
      key: record.key,
      namespace: record.namespace,
      path: record.path,
      priority: record.priority,
      repo: record.repo,
      source: record.source,
      version: record.version
    }));
  }

  libraryOf(ref) {
    const entry = this.resolve(ref);

    if (!entry || entry.library === CORE_NAMESPACE || entry.library === LOCAL_NAMESPACE) {
      return null;
    }

    return this._libraries.get(entry.library) ?? null;
  }

  get size() {
    return this.names().length;
  }

  _registerComponent(library, bucket, name, definition, { replace, source }) {
    const entry = normalizeComponentDefinition(name, definition, { library, source });

    if (bucket.has(entry.name.toLowerCase()) && replace !== true) {
      throw new GenUIError(
        `组件名冲突：${library}#${entry.name} 已经注册过（同名只有显式 replace 才允许覆盖）`,
        { code: ERROR_CODES.component }
      );
    }

    // 索引统一小写（解析大小写不敏感）；条目里保留原始名字，给诊断与能力清单用。
    bucket.set(entry.name.toLowerCase(), entry);
    entry.aliases.forEach((alias) => bucket.set(alias.toLowerCase(), entry));
    return entry;
  }

  _resolveInLibrary(libraryRef, name, ref) {
    const normalized = normalizeLibraryRef(libraryRef);
    const key = this._aliases.get(String(libraryRef).toLowerCase()) ?? normalized.key;
    const record = this._libraries.get(key);

    if (!record) {
      const known = this.libraries()
        .map((library) => library.namespace)
        .join(' / ');
      throw new GenUIError(`未安装的组件库 "${libraryRef}"（已装：${known || '（无）'}）`, {
        code: ERROR_CODES.component,
        componentId: ref
      });
    }

    const entry = record.components.get(String(name).toLowerCase());

    if (!entry) {
      const available = [...new Set([...record.components.values()].map((item) => item.name))]
        .sort()
        .slice(0, 12)
        .join(', ');
      throw new GenUIError(
        `${record.namespace} 里没有组件 "${name}"（可用：${available}${record.components.size > 12 ? ' …' : ''}）`,
        { code: ERROR_CODES.component, componentId: ref }
      );
    }

    return entry;
  }

  _resolveFromDefault(lowerName) {
    if (this._defaultKey === null) {
      return null;
    }

    return this._libraries.get(this._defaultKey)?.components.get(lowerName) ?? null;
  }

  _candidateLibraries(lowerName) {
    return [...this._libraries.values()].filter((record) => record.components.has(lowerName));
  }
}

export function createComponentRegistry(entries = null) {
  return new ComponentRegistry(entries);
}

/**
 * 描述符归一：接函数（只给工厂）、完整描述符，以及 `childCommand` / `childrenProp` / `itemBridge`
 * 这些**组件自己的内容入口**。
 *
 * `content` 是这几条通道的统一字段。注意**没有"默认部件"这条路**：位置只有协议的统一机制
 * （骨架 `vn_slot` 声明 + 内容 `to_slot` 投递），组件库不替作者决定"内容再包一层什么"。
 */
export function normalizeComponentDefinition(name, definition, meta = {}) {
  const isFactory = typeof definition === 'function';
  const config = isFactory ? { factory: definition } : (definition ?? {});
  const factory = config.factory;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new GenUIError('组件名必须是非空字符串', { code: ERROR_CODES.component });
  }

  if (typeof factory !== 'function') {
    throw new GenUIError(`组件 "${name}" 缺少 factory 函数`, { code: ERROR_CODES.component });
  }

  const content = normalizeContent(config);
  const aliases = (Array.isArray(config.aliases) ? config.aliases : [])
    .map(String)
    .filter((alias) => alias !== '' && alias !== name);

  return {
    aliases,
    childCommand: content.mode === 'command' ? content.command : null,
    childrenProp: content.mode === 'prop' ? content.prop : null,
    commands: config.commands ?? null,
    content,
    description: config.description ?? '',
    events: config.events ?? null,
    expose: config.expose ?? null,
    factory,
    hooks: config.hooks ?? null,
    identity: config.identity ?? null,
    itemBridge: content.mode === 'items' ? content.bridge : null,
    kind: config.kind ?? 'component',
    library: meta.library ?? LOCAL_NAMESPACE,
    name,
    props: config.props ?? null,
    source: meta.source ?? LOCAL_NAMESPACE,
    textProp: config.textProp ?? (config.text ? config.text.to : null),
    value: config.value ?? null
  };
}

function normalizeContent(config) {
  if (config.content) {
    if (config.content.mode === 'items') {
      return {
        bridge: config.content.bridge ?? config.content.itemBridge ?? config.itemBridge ?? null,
        mode: 'items'
      };
    }

    return { ...config.content };
  }

  if (config.childCommand) {
    return { command: config.childCommand, mode: 'command' };
  }

  if (config.childrenProp) {
    return { mode: 'prop', prop: config.childrenProp };
  }

  if (config.itemBridge) {
    return { bridge: config.itemBridge, mode: 'items' };
  }

  return { mode: 'child' };
}
