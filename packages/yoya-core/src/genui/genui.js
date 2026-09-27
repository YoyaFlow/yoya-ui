import { PROTOCOL_ID, PROTOCOL_VERSION } from './protocol/constants.js';
import { ERROR_CODES, GenUIError } from './protocol/errors.js';
import { isYoyaGenUISchema, validateSchema } from './protocol/validate.js';
import { a2uiDialect, createDialectRegistry } from './dialects/index.js';
import { createDefaultRegistry } from './runtime/default-registry.js';
import { createCustodianRegistry } from './runtime/custodians.js';
import { createFunctionTable } from './runtime/functions.js';
import { GenUISurface } from './runtime/surface.js';

/**
 * GenUI 门面：把「方言 / 协议 → surface」这一条链收成一个入口。
 *
 * ```js
 * import { GenUI } from '@yoyaflow/yoya-genui';
 *
 * GenUI.fromJson('A2UI', a2uiMessages).bindTo('#app');
 * GenUI.fromJson(yoyaSchema).bindTo('#app');
 * ```
 */
export function createGenUI(options = {}) {
  const registry = options.registry ?? createDefaultRegistry();
  const dialectRegistry =
    options.dialects ?? createDialectRegistry([a2uiDialect, ...(options.extraDialects ?? [])]);
  const defaultActions = { ...(options.actions ?? {}) };
  const functions = createFunctionTable(options.functions ?? null);
  const custodians = createCustodianRegistry(options.custodians);
  const installedPlugins = new Map();

  const resolveDialect = (name) => {
    const dialect = dialectRegistry.resolve(name);

    if (!dialect) {
      const known = dialectRegistry.names().join(', ') || '（无）';
      throw new GenUIError(`未注册的方言 "${name}"；已注册：${known}`, {
        code: ERROR_CODES.dialect
      });
    }

    return dialect;
  };

  const surfaceOptions = (given = {}) => ({
    ...given,
    custodians: given.custodians ?? custodians,
    actions: { ...defaultActions, ...(given.actions ?? {}) },
    // 库带来的函数（全名 + 唯一短名）+ 宿主当场给的（当场给的优先，可覆盖）
    functions: {
      ...Object.fromEntries(functions.names().map((name) => [name, functions.resolve(name)])),
      ...(given.functions ?? {})
    },
    registry: given.registry ?? registry
  });

  const genui = {
    dialectRegistry,
    protocol: PROTOCOL_ID,
    registry,
    version: PROTOCOL_VERSION,

    /** 方言名清单（`fromJson('A2UI', …)` 的第一个参数）。 */
    dialects: () => dialectRegistry.list(),

    /** 已注册的组件类型清单。 */
    components: () => registry.names(),

    /** 已装组件库清单（诊断 / 依赖声明校验用）。 */
    libraries: () => registry.libraries(),

    /** 已登记的函数名清单（含 `库#函数` 全名）。 */
    functions: () => functions.names(),

    /** 已装插件 id 清单。 */
    plugins: () => registry.installedPlugins(),

    /**
     * 装插件（**组件仓库**就是这么进来的）：组件库 / 方言 / 动作 / 函数都能打包进来，
     * 返回 dispose（可卸载）。同 id 重复安装幂等。
     *
     * ```js
     * const { shopKit } = await import('./libs/shop-kit.js'); // 装一个仓库 = 一次显式的 import
     * GenUI.use(shopKit);
     * ```
     *
     * 注意：装仓库等于装**可执行代码**（跟 npm 包一样），要不要装由宿主决定；
     * agent / JSON 只能引用**已装仓库**里的名字，装不了东西。
     */
    use(plugin, extra = {}) {
      const definition = typeof plugin === 'function' ? plugin() : plugin;
      const id = definition?.id ?? definition?.namespace ?? null;

      // 同 id 重复安装幂等（返回同一个 dispose，和注册表口径一致）
      if (id !== null && installedPlugins.has(id)) {
        return installedPlugins.get(id);
      }

      // 插件带的动作 / 函数也一起装：卸载时用这两份快照收干净
      const snapshot = { actions: { ...defaultActions }, functions: functions.snapshot() };
      const dispose = registry.install(definition, {
        actions: (handlers) => Object.assign(defaultActions, handlers),
        dialect: (definition) => dialectRegistry.register(definition),
        functions: (handlers, meta) => functions.registerAll(handlers, meta),
        ...extra
      });

      const wrapped = () => {
        if (id !== null) {
          installedPlugins.delete(id);
        }

        dispose();
        Object.keys(defaultActions).forEach((name) => delete defaultActions[name]);
        Object.assign(defaultActions, snapshot.actions);
        functions.restore(snapshot.functions);
      };

      if (id !== null) {
        installedPlugins.set(id, wrapped);
      }

      return wrapped;
    },

    /** 直接登记组件库（等价于 `use({ id, install })` 的轻量写法）。 */
    registerLibrary(libraryOptions) {
      registry.registerLibrary(libraryOptions);
      return genui;
    },

    registerComponent(name, definition) {
      registry.register(name, definition);
      return genui;
    },

    /** `registerComponent` 的短别名（`local` 命名空间）。 */
    register(name, definition) {
      return genui.registerComponent(name, definition);
    },

    registerComponents(entries) {
      registry.registerAll(entries);
      return genui;
    },

    registerDialect(definition) {
      dialectRegistry.register(definition);
      return genui;
    },

    /**
     * 能力清单：生成方（模型 / 网关）据此生成合法 JSON。
     * `{ library }` 可按库过滤；不传则返回全部。
     */
    describe({ library } = {}) {
      const components = [];

      registry.names().forEach((name) => {
        let entry;

        try {
          entry = registry.resolve(name);
        } catch {
          entry = null;
        }

        if (!entry) {
          return;
        }

        if (library) {
          const record = registry.libraryOf(name);

          if (!record || !matchesLibrary(record, library)) {
            return;
          }
        }

        components.push(describeEntry(entry));
      });

      return {
        components,
        // 能力清单：库提供什么（组件在 components 里，动作 / 函数在这里）
        functions: functions.names(),
        libraries: registry
          .libraries()
          .filter((record) => !library || matchesLibrary(record, library))
          .map((record) => ({ ...record, functions: functions.libraryFunctions(record.key) })),
        protocol: PROTOCOL_ID,
        version: PROTOCOL_VERSION
      };
    },

    /** 只做转换，不建 surface（调试 / 落盘 JSON 时用）。 */
    convert(dialectName, input, convertOptions = {}) {
      return resolveDialect(dialectName).convert(input, convertOptions);
    },

    /** 先校验再建 surface（默认宽松：警告不拦）。 */
    validate(schema, validateOptions) {
      return validateSchema(schema, validateOptions);
    },

    surface(schema, options) {
      return new GenUISurface(schema, surfaceOptions(options));
    },

    /**
     * 三种用法：
     * - `fromJson('A2UI', messages, options?)` — 指定方言
     * - `fromJson(schema, options?)` — 原生 yoya-genui 协议
     * - `fromJson(messages, options?)` — 自动识别（方言自己 `detect`）
     */
    fromJson(dialectOrSchema, payload, options = {}) {
      if (typeof dialectOrSchema === 'string') {
        const dialect = resolveDialect(dialectOrSchema);
        return this._fromDialect(dialect, payload, options);
      }

      if (isYoyaGenUISchema(dialectOrSchema)) {
        return new GenUISurface(dialectOrSchema, surfaceOptions(payload ?? options));
      }

      const dialect = dialectRegistry.detect(dialectOrSchema);

      if (dialect) {
        const surfaceOptionsInput = payload ?? options;
        return this._fromDialect(dialect, dialectOrSchema, surfaceOptionsInput);
      }

      throw new GenUIError(
        '无法识别输入：既不是 yoya-genui schema，也没有方言认领（可显式写 GenUI.fromJson("A2UI", json)）',
        { code: ERROR_CODES.protocol }
      );
    },

    /** 方言 → surface：有 `createSession` 的方言顺带把会话挂上，之后可以 `ingest(messages)`。 */
    _fromDialect(dialect, payload, options = {}) {
      // 一次性用法默认要求 root 齐备（缺 beginRendering 直接报错）；
      // 流式用法传 `allowPartial: true`：先给空面，之后靠 `surface.ingest(messages)` 补
      const convertOptions = {
        ...(options.dialect ?? options),
        requireRoot: options.allowPartial !== true
      };
      const session =
        typeof dialect.createSession === 'function'
          ? dialect.createSession(payload, convertOptions)
          : null;
      const schema = session ? session.schema : dialect.convert(payload, convertOptions);
      const surfaceOptionsInput = { ...options, session };

      return new GenUISurface(schema, surfaceOptions(surfaceOptionsInput));
    }
  };

  return genui;
}

/** 默认门面：内置组件表 + A2UI 方言。 */
export const GenUI = createGenUI();

function matchesLibrary(record, library) {
  const wanted = String(library).trim().toLowerCase();
  return (
    record.key === wanted ||
    record.namespace.toLowerCase() === wanted ||
    record.aliases.some((alias) => alias.toLowerCase() === wanted)
  );
}

/** 单个组件的能力描述（生成方据此写 schema）。 */
function describeEntry(entry) {
  return {
    aliases: entry.aliases,
    content: describeContent(entry.content),
    events: entry.events ? Object.keys(entry.events) : [],
    kind: entry.kind,
    library: entry.library,
    name: entry.name,
    props: entry.props ? Object.keys(entry.props) : [],
    source: entry.source,
    text: entry.textProp
  };
}

/** 部件映射里是工厂函数，序列化成名字清单（能力清单要能被 JSON 化）。 */
function describeContent(content) {
  if (!content || content.mode !== 'parts') {
    return content;
  }

  return {
    default: content.default ?? null,
    mode: 'parts',
    slots: Object.keys(content.map ?? {})
  };
}

/** 语法糖：`fromJson('A2UI', json).bindTo('#app')`。 */
export function fromJson(dialectOrSchema, payload, options) {
  return GenUI.fromJson(dialectOrSchema, payload, options);
}

/** 语法糖：`convert('A2UI', json)` 得到 yoya-genui schema。 */
export function convert(dialectName, input, options) {
  return GenUI.convert(dialectName, input, options);
}
