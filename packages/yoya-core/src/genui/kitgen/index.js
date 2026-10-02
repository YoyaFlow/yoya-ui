/**
 * genui-kit 通用生成器（kitgen）——任何 yoya-core 风格的组件库都能用。
 *
 * 单一文档面纪律：组件文档只存在于**源码 JSDoc**（`@genui*` 标签），生成器从源码派生一切：
 * 1. 工厂清单：扫描源码导出（绝不手写）；
 * 2. 选型/用法文档：紧邻导出的 `@genui*` JSDoc 标签；
 * 3. props：解析 PascalCase 工厂函数签名的解构参数（零手写）；
 * 4. HTML/SVG 元素面：模块导出派生 + 安全黑名单；
 * 5. 未标注工厂如实标 `needsDocs`——manifest 与运行时同真。
 *
 * 库作者只维护一份 `kitgen.config.js`（目录→分类映射、工厂发现策略、黑名单扩展），
 * 不再各自手搓生成脚本。CLI 用法见 `kitgen/README.md`。
 */
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

/** 默认 HTML 安全黑名单：生成方不该拿到的标签 / 非元素导出。 */
export const DEFAULT_BLOCKED_HTML = [
  'HtmlElementNode',
  'createHtmlFactories',
  'script',
  'iframe',
  'object',
  'embed',
  'base',
  'link',
  'meta',
  'styleTag',
  'template',
  'title',
  'head',
  'html',
  'body',
  'noscript',
  'slot',
  'canvas'
];

/** 默认 SVG 安全黑名单（非元素导出）。 */
export const DEFAULT_BLOCKED_SVG = ['svgs', 'SvgElementNode', 'SVG_NAMESPACE'];

export const DEFAULT_CONFIG = {
  /** 组件源码目录（相对 config 所在目录） */
  src: 'src',
  /** manifest 输出文件 */
  out: 'genui-kit.json',
  /** 库命名空间（owner/repo），必填 */
  namespace: null,
  /** 版本来源 package.json */
  pkg: 'package.json',
  /** 运行期版本约束（写进 manifest，装库时校验） */
  runtime: { genui: '>=0.2 <0.3' },
  /** generated 元信息（提示库作者勿手改） */
  generated: {
    from: 'source-scan + JSDoc @genui tags',
    notice: '工厂清单勿手改——重跑 kitgen；文档写在组件源码 JSDoc（@genui* 标签）'
  },
  /** 源码目录 → manifest 分类；值为 null 的目录跳过；未列出的目录不扫 */
  categories: {},
  factories: {
    /** PascalCase 完整工厂名前缀（props 从它的签名解构里抽） */
    pascalPrefix: 'V',
    /** v 快捷方式名前缀（manifest 收录的就是这些名字） */
    shortcutPrefix: 'v',
    /** 快捷方式的创建助手（`const vX = helper(VX)` 也算工厂） */
    shortcutHelpers: ['createComponentShortcut'],
    /** 额外工厂模式：[{ regex, flags?, category, nameGroup? }]，只在该 category 的目录里生效 */
    extraPatterns: []
  },
  elements: {
    /** HTML 元素面（false 关闭）；module 从 config 所在目录解析 */
    html: { module: '@yoyaflow/yoya-core/html', blocked: DEFAULT_BLOCKED_HTML },
    svg: { module: '@yoyaflow/yoya-core/svg', blocked: DEFAULT_BLOCKED_SVG }
  },
  /** 文件名排除（正则或子串） */
  exclude: [/\.test\./]
};

/**
 * 文档标签 → manifest 字段。
 *
 * 分三档，按**消费者在读什么**排：
 * 1. 选型面（决定"能不能被准确找到"）：summary / scene / layer / use / notFor
 *    —— 检索权重是 场景4 > 分类3 > 摘要·适用2 > 不适用·契约1，层是**硬过滤主键**
 *    （`genui_catalog({ layer })`），所以 scene 与 layer 必须能写在定义点上；
 * 2. 契约面（决定"写得对不对"）：contract / props / example / pitfall
 *    —— `props` 签名叫得出名字就零手写，叫不出（单参 props 袋的库）用 `@genui.props` 一行 JSON 补；
 * 3. 运行期面（进插件、不进 manifest）：content / text / prop / event / expose —— 见 parseWiringTag。
 */
const DOC_TAG_KEYS = {
  summary: 'summary',
  contract: 'dataContract',
  use: 'whenToUse',
  notFor: 'notFor',
  pitfall: 'pitfalls',
  example: 'example',
  // —— 选型面
  scene: 'scenes',
  layer: 'layer',
  category: 'category',
  // —— 契约面 / 活绑定
  props: 'props',
  live: 'liveProps',
  // 值域是对象 / 数组的活绑定位（"JSON 位"）：只有它能按相对路径下钻（`asSignalJson`）
  json: 'jsonProps',
  // —— 逻辑 / 组合面（"选完还要配什么、状态放哪"）
  pairs: 'pairs',
  state: 'state'
};

/** 列表型文档标签：`；` 分隔（历史口径）；场景 / 活绑定 / 搭配再容一个英文逗号（关键词列表）。 */
const LIST_DOC_KEYS = new Set([
  'whenToUse',
  'notFor',
  'pitfalls',
  'scenes',
  'liveProps',
  'jsonProps',
  'pairs'
]);
const COMMA_LIST_DOC_KEYS = new Set(['scenes', 'liveProps', 'jsonProps', 'pairs']);
/** JSON 型文档标签：`example` 是节点，`props` 是 `{ 名字: "说明" }`。 */
const JSON_DOC_KEYS = new Set(['example', 'props']);

const splitDocList = (value, comma = false) =>
  String(value)
    .split(comma ? /[；,]/ : '；')
    .map((item) => item.trim())
    .filter(Boolean);

/** 保序去重（声明在前、扫描结果在后）。 */
const uniqueList = (items) => [...new Set(items.filter(Boolean))];

const parseJsonDocTag = (tag, value, { object = false } = {}) => {
  let parsed;

  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`@genui.${tag} 必须是合法 JSON（${error.message}）：${value}`, {
      cause: error
    });
  }

  if (object && (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))) {
    throw new Error(`@genui.${tag} 必须是 JSON 对象（{ "prop": "说明" }）：${value}`);
  }

  return parsed;
};

/**
 * 层是 `genui_catalog({ layer })` 的**硬过滤主键**——写错一个字母，这个组件就从那一刀切片里
 * 静默消失（组装期只查 L2 的人再也看不见它）。所以这里**当场报错**，不猜。
 */
const parseLayerTag = (tag, value) => {
  const text = String(value).trim().toUpperCase();

  if (!/^L[1-7]$/.test(text)) {
    throw new Error(`@genui.${tag} 只认 L1–L7（收到 "${value}"）`);
  }

  return text;
};

/**
 * 每条目录信息的**体积预算**——目录是"给模型看的"，写长了就是烧上下文。
 *
 * 默认值比现有库的实际水平**留了余量**（yoya-ui 现状：summary 最长 42 字、pitfalls 最长一条
 * 44 字、example 最大 178 B、单条最大 777 B），所以它是"别写成小作文"的护栏，不是苛刻门禁。
 * 库可以用 config.budgets 覆盖。
 *
 * 配套的**切片纪律**（见 manifest.tiers）：选型面字段进"每步都调"的瘦条目，契约/逻辑面只在
 * "选定一个组件后按需取"的全量卡里；接线面（content/prop/event）根本不进 manifest。
 */
export const DEFAULT_BUDGETS = {
  summary: 60,
  scenes: { count: 4, item: 20 },
  whenToUse: { count: 6, item: 80 },
  notFor: { count: 6, item: 80 },
  pitfalls: { count: 6, item: 80 },
  pairs: { count: 6, item: 80 },
  state: 80,
  props: { count: 24, value: 60 },
  exampleBytes: 800,
  entryBytes: 6144
};

/**
 * 超预算**当场报错**（不是警告）：这些字段是模型选型/填参的依据，写成小作文不会更准，
 * 只会把每步调用都撑肥。报错时把"哪一条、多长、上限多少"一次说清。
 */
function checkBudgets(entry, budgets) {
  const problems = [];
  const text = (label, value, limit) => {
    const length = String(value ?? '').length;

    if (length > limit) {
      problems.push(`${label} 太长（${length} > ${limit} 字）：${String(value).slice(0, 40)}…`);
    }
  };
  const list = (key, label) => {
    const items = entry[key] ?? [];
    const limit = budgets[key];

    if (items.length > limit.count) {
      problems.push(`${label} 条数太多（${items.length} > ${limit.count}）——挑最常踩的几条`);
    }
    items.forEach((item, index) => text(`${label}[${index}]`, item, limit.item));
  };

  text('summary', entry.summary, budgets.summary);
  list('scenes', 'scenes');
  list('whenToUse', 'whenToUse');
  list('notFor', 'notFor');
  list('pitfalls', 'pitfalls');
  list('pairs', 'pairs');
  text('state', entry.state, budgets.state);

  const props = entry.props ?? {};
  const propNames = Object.keys(props);

  if (propNames.length > budgets.props.count) {
    problems.push(
      `props 个数太多（${propNames.length} > ${budgets.props.count}）——只留要让 agent 填的`
    );
  }
  propNames.forEach((name) => text(`props.${name}`, props[name], budgets.props.value));

  const exampleBytes =
    entry.example === undefined ? 0 : Buffer.byteLength(JSON.stringify(entry.example));

  if (exampleBytes > budgets.exampleBytes) {
    problems.push(
      `example 太大（${exampleBytes} B > ${budgets.exampleBytes} B）——example 是"最小可落页"，别抄整页`
    );
  }

  const entryBytes = Buffer.byteLength(JSON.stringify(entry));

  if (entryBytes > budgets.entryBytes) {
    problems.push(
      `整条目录太大（${entryBytes} B > ${budgets.entryBytes} B）——把长文挪进 docs / 示例页，目录只留选型与填参要点`
    );
  }

  if (problems.length > 0) {
    throw new Error(`${entry.name}：目录信息超预算——\n  - ${problems.join('\n  - ')}`);
  }
}

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 找到紧邻某位置之前的 @genui JSDoc 块文本（纯文本，零耦合）。 */
function findGenuiBlock(source, index) {
  const before = source.slice(0, index).trimEnd();

  if (!before.endsWith('*/')) {
    return null;
  }

  const start = before.lastIndexOf('/**');

  if (start < 0) {
    return null;
  }

  const block = before.slice(start);

  // 裸标签（@genui 摘要）或点标签（@genui.content 等）都算本块的标签
  return /@genui(\.|\s)/.test(block) ? block : null;
}

/** `name key=value key2=value2` → { name, pairs }（事件 / 属性标签的参数形态）。 */
function splitTagArgs(value) {
  const tokens = value.split(/\s+/).filter(Boolean);
  const [name = '', ...rest] = tokens;
  const pairs = {};

  for (const token of rest) {
    const eq = token.indexOf('=');

    if (eq > 0) {
      pairs[token.slice(0, eq)] = token.slice(eq + 1);
    }
  }

  return { name, pairs };
}

/** 运行时标签（接线）解析：content / text / prop / event —— 进插件，不进 manifest。 */
function parseWiringTag(tag, value, wiring) {
  if (tag === 'content') {
    // content 标签没有"名字"参数：全部 token 都是 key=value（bridge= / command= / content=）
    const pairs = {};

    value.split(/\s+/).forEach((token) => {
      const eq = token.indexOf('=');

      if (eq > 0) {
        pairs[token.slice(0, eq)] = token.slice(eq + 1);
      }
    });

    if (pairs.bridge !== undefined) {
      wiring.itemBridge = {
        command: pairs.bridge,
        contentProp: pairs.content !== undefined ? pairs.content : null,
        itemType: pairs.bridge
      };
    } else if (pairs.command !== undefined) {
      wiring.childCommand = pairs.command;
    } else {
      wiring.childrenProp = value.split(/\s+/)[0];
    }

    return;
  }

  if (tag === 'expose') {
    const { name, pairs } = splitTagArgs(value);
    const command = pairs.command ?? pairs.read ?? name;

    wiring.expose ??= {};
    wiring.expose[name] = command.startsWith('command:')
      ? command.slice('command:'.length)
      : command;
    return;
  }

  if (tag === 'text') {
    wiring.textProp = value.split(/\s+/)[0];
    return;
  }

  if (tag === 'prop') {
    const { name, pairs } = splitTagArgs(value);
    const hasPairs = Object.keys(pairs).length > 0;

    wiring.props[name] = hasPairs
      ? {
          ...(pairs.to !== undefined ? { to: pairs.to } : null),
          ...(pairs.read !== undefined ? { read: pairs.read } : null),
          ...(pairs.live !== undefined ? { live: pairs.live === 'true' } : null)
        }
      : name;
    return;
  }

  if (tag === 'event') {
    // 通道关键字可裸写（`@genui.event click dom`）也可带值（`dom=tap` / `callback=onChange payload=0`）
    const tokens = value.split(/\s+/).filter(Boolean);
    const [name = '', ...rest] = tokens;
    const pairs = {};
    const bare = [];

    for (const token of rest) {
      const eq = token.indexOf('=');

      if (eq > 0) {
        pairs[token.slice(0, eq)] = token.slice(eq + 1);
      } else {
        bare.push(token);
      }
    }

    if (pairs.dom !== undefined || bare.includes('dom')) {
      wiring.events[name] = { channel: 'dom', event: pairs.dom || name };
    } else if (pairs.callback !== undefined || bare.includes('callback')) {
      wiring.events[name] = {
        channel: 'callback',
        prop: pairs.callback || name,
        ...(pairs.payload !== undefined ? { payload: pairs.payload } : null)
      };
    }
  }
}

/**
 * 从源码提取紧邻某位置之前的 @genui JSDoc 块，拆成两袋：
 * - `doc`：文档标签（summary / contract / use / notFor / pitfall / example）→ manifest；
 * - `wiring`：运行时标签（content / text / prop / event）→ 插件。
 */
function parseGenuiBlock(source, index) {
  const block = findGenuiBlock(source, index);

  if (!block) {
    return null;
  }

  const doc = {};
  const wiring = { props: {}, events: {} };

  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^\s*\*\s*@genui(?:\.(\w+))?\s+(.*)$/);

    if (!match) {
      continue;
    }

    const [, tag = 'summary', value] = match;

    if (
      tag === 'content' ||
      tag === 'text' ||
      tag === 'prop' ||
      tag === 'event' ||
      tag === 'expose'
    ) {
      parseWiringTag(tag, value, wiring);
      continue;
    }

    const key = DOC_TAG_KEYS[tag];

    if (!key) {
      continue;
    }

    if (LIST_DOC_KEYS.has(key)) {
      doc[key] = splitDocList(value, COMMA_LIST_DOC_KEYS.has(key));
    } else if (JSON_DOC_KEYS.has(key)) {
      doc[key] = parseJsonDocTag(tag, value, { object: key === 'props' });
    } else if (key === 'layer') {
      doc[key] = parseLayerTag(tag, value);
    } else {
      doc[key] = value;
    }
  }

  const hasDoc = Object.keys(doc).length > 0;
  const hasWiring =
    Object.keys(wiring.props).length > 0 ||
    Object.keys(wiring.events).length > 0 ||
    Object.keys(wiring.expose ?? {}).length > 0 ||
    ['childrenProp', 'childCommand', 'itemBridge', 'textProp'].some(
      (key) => wiring[key] !== undefined
    );

  if (!hasDoc && !hasWiring) {
    return null;
  }

  return {
    doc: hasDoc ? doc : null,
    wiring: hasWiring ? wiring : null
  };
}

/** 文档标签（manifest 面）。 */
export function extractGenuiDoc(source, index) {
  return parseGenuiBlock(source, index)?.doc ?? null;
}

/** 运行时标签（插件面）。 */
export function extractGenuiWiring(source, index) {
  return parseGenuiBlock(source, index)?.wiring ?? null;
}

/** 解析 PascalCase 工厂签名解构参数 → props 名表（零手写 props）。 */
export function extractProps(source, factoryName) {
  const match = source.match(
    new RegExp(`export function ${escapeRegExp(factoryName)}\\(\\{([^}]*)\\}`)
  );

  if (!match) {
    return null;
  }

  return match[1]
    .split(',')
    .map((part) => part.split('=')[0].split(':')[0].trim())
    .filter((name) => /^[a-zA-Z_$][\w$]*$/.test(name))
    .reduce((acc, name) => ({ ...acc, [name]: '' }), {});
}

/**
 * 剥掉注释与字符串 / 模板字面量：扫描归一调用点时"只认代码"——
 * 文档注释里举例写的 `asSignal(rows)`、字符串里出现的同名标识符都不算调用点。
 * 只做长度持平的等价替换，不改变外部坐标。
 */
export function stripCodeNoise(source) {
  let out = '';
  let index = 0;

  while (index < source.length) {
    const char = source[index];
    const next = source[index + 1];

    if (char === '/' && next === '/') {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      out += ' '.repeat(stop - index) + (end === -1 ? '' : '\n');
      index = end === -1 ? source.length : end + 1;
      continue;
    }

    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(index, stop).replace(/[^\n]/g, ' ');
      index = stop;
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      let cursor = index + 1;
      while (cursor < source.length) {
        if (source[cursor] === '\\') {
          cursor += 2;
          continue;
        }
        if (source[cursor] === quote) {
          cursor += 1;
          break;
        }
        cursor += 1;
      }
      out += source.slice(index, cursor).replace(/[^\n]/g, ' ');
      index = cursor;
      continue;
    }

    out += char;
    index += 1;
  }

  return out;
}

/** 从 `openIndex`（开括号位置）找到配对闭括号的下标；找不到返回 -1。 */
function matchingIndex(source, openIndex, open, close) {
  let depth = 0;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (char === open) {
      depth += 1;
    } else if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return -1;
}

/**
 * `export function NAME({...} = {})` 的函数体文本；找不到返回 null。
 *
 * 注意先跳过**参数表**（解构本身就带一对花括号）再找函数体，否则会把 `{ a, b }` 当函数体。
 */
function findFactoryBody(source, factoryName) {
  const resolved = resolveFactoryName(source, factoryName);
  const match = source.match(new RegExp(`export function ${escapeRegExp(resolved)}\\s*\\(`));

  if (!match) {
    return null;
  }

  const paramsStart = source.indexOf('(', match.index);
  const paramsEnd = matchingIndex(source, paramsStart, '(', ')');

  if (paramsEnd < 0) {
    return null;
  }

  const bodyStart = source.indexOf('{', paramsEnd);

  if (bodyStart < 0) {
    return null;
  }

  const bodyEnd = matchingIndex(source, bodyStart, '{', '}');

  return bodyEnd < 0 ? source.slice(bodyStart) : source.slice(bodyStart, bodyEnd + 1);
}

/**
 * 工厂的**真实名字**：快捷名派生的 PascalCase 与源码里的函数名可能只有大小写之差
 * （`vEchart` → 派生出 `VEchart`，而函数叫 `VEChart`）。导出别名
 * `export { VEChart as VEchart }` 是权威写法，先认它，认不出再回落派生名。
 */
export function resolveFactoryName(source, factoryName) {
  if (source.includes(`export function ${factoryName}(`)) {
    return factoryName;
  }

  const alias = source.match(
    new RegExp(`export\\s*\\{\\s*([A-Za-z_$][\\w$]*)\\s+as\\s+${escapeRegExp(factoryName)}\\s*\\}`)
  );

  if (alias) {
    return alias[1];
  }

  const loose = source.match(
    new RegExp(`export function ([A-Za-z_$][\\w$]*)\\s*\\([^)]*\\)\\s*\\{`, 'i')
  );

  return loose && loose[1].toLowerCase() === factoryName.toLowerCase() ? loose[1] : factoryName;
}

/** 从 `(` 起取到配对的 `)`，返回括号内的实参文本。 */
function readCallArguments(source, openIndex) {
  const end = matchingIndex(source, openIndex, '(', ')');

  return end < 0 ? source.slice(openIndex + 1) : source.slice(openIndex + 1, end);
}

/** 模块 / 函数里出现过的绑定名（`const` / `let` / `var` / 函数声明 / 参数）——用来把
 * "代码面注入的实例"与"没声明的位"分开。 */
function collectBindingNames(source) {
  const names = new Set();

  for (const match of source.matchAll(/\b(?:const|let|var)\s+([^=;]+?)=/g)) {
    for (const name of match[1].match(/[A-Za-z_$][\w$]*/g) ?? []) {
      names.add(name);
    }
  }

  for (const match of source.matchAll(/\bfunction\s+([A-Za-z_$][\w$]*)?\s*\(([^)]*)\)/g)) {
    for (const name of `${match[1] ?? ''} ${match[2]}`.match(/[A-Za-z_$][\w$]*/g) ?? []) {
      names.add(name);
    }
  }

  return names;
}

/**
 * 归一调用点扫描（票 02 的"代码面"）：组件源码里每一处 `asSignal(…)` / `asSignalJson(…)`
 * 就是一条活绑定位的声明——值域是对象 / 数组的位必须走 `asSignalJson`（只有它能下钻）。
 *
 * 归属规则：实参里出现的标识符**落在该工厂的 props 名单里**才算这位 prop 的归一；
 * 落不进去的（`contentNode === null ? initial : null` 里的局部量、`asSignal('loading')`
 * 这种字面量）是**代码面注入的实例 / 内容位**，不进表。
 *
 * @returns {{ props: {name: string, kind: 'value'|'json'|'mixed'}[], injected: string[], undeclared: string[] }}
 */
const IDENTIFIER_NOISE = new Set([
  'null',
  'undefined',
  'true',
  'false',
  'typeof',
  'void',
  'new',
  'this',
  'Boolean',
  'Number',
  'String',
  'Math',
  'Array',
  'Object',
  'JSON'
]);

export function scanNormalizedProps(source, factoryName, { declared = null } = {}) {
  const names = new Set(declared ?? Object.keys(extractProps(source, factoryName) ?? {}));
  const code = stripCodeNoise(source);
  const body = findFactoryBody(code, factoryName);

  if (!body) {
    return { props: [], injected: [], undeclared: [] };
  }

  const found = new Map();
  const foreign = new Set();
  const callPattern = /\basSignalJson\s*\(|\basSignal\s*\(/g;
  let match;

  while ((match = callPattern.exec(body)) !== null) {
    const kind = match[0].startsWith('asSignalJson') ? 'json' : 'value';
    // 属性访问（`positionPresets.has(…)` / `offset?.x`）里的名字是成员名，不是标识符引用
    const args = readCallArguments(body, callPattern.lastIndex - 1).replace(
      /\??\.[A-Za-z_$][\w$]*/g,
      ''
    );
    const identifiers = [...new Set(args.match(/[A-Za-z_$][\w$]*/g) ?? [])].filter(
      (name) => !IDENTIFIER_NOISE.has(name)
    );
    const hits = identifiers.filter((name) => names.has(name));

    identifiers.filter((name) => !names.has(name)).forEach((name) => foreign.add(name));

    for (const name of hits) {
      const previous = found.get(name);

      found.set(name, previous && previous !== kind ? 'mixed' : kind);
    }
  }

  // 外来标识符分两类：模块 / 函数里**绑过的**是代码面注入的实例（内容节点、局部量…），
  // 没绑过的只能是"归一了却没声明的位"——那是门禁要红的那一种。
  const bound = collectBindingNames(code);
  const injected = [];
  const undeclared = [];

  for (const name of foreign) {
    (bound.has(name) ? injected : undeclared).push(name);
  }

  return {
    props: [...found.entries()].map(([name, kind]) => ({ name, kind })),
    injected,
    undeclared
  };
}

function resolveFromBase(path, base) {
  return isAbsolute(path) ? path : resolve(base, path);
}

/** 合并默认值（深一层——factories / elements / generated 允许局部覆盖）。 */
export function normalizeConfig(userConfig = {}, { resolveFrom = process.cwd() } = {}) {
  const config = {
    ...DEFAULT_CONFIG,
    ...userConfig,
    factories: { ...DEFAULT_CONFIG.factories, ...(userConfig.factories ?? {}) },
    generated: { ...DEFAULT_CONFIG.generated, ...(userConfig.generated ?? {}) },
    elements: { ...DEFAULT_CONFIG.elements, ...(userConfig.elements ?? {}) },
    budgets: { ...DEFAULT_BUDGETS, ...(userConfig.budgets ?? {}) },
    categories: userConfig.categories ?? DEFAULT_CONFIG.categories,
    exclude: userConfig.exclude ?? DEFAULT_CONFIG.exclude
  };

  if (!config.namespace) {
    throw new Error('kitgen 配置缺 namespace（owner/repo）');
  }

  config.plugin = {
    out: 'genui-plugin.js',
    runtimeImport: '@yoyaflow/yoya-core/genui',
    factoryImport: null,
    factoryImports: null,
    exclude: [],
    coreFactories: [],
    functions: [],
    kinds: {},
    ...(userConfig.plugin ?? {})
  };
  // 单 factoryImport 是一个模块的简写；factoryImports 列表支持工厂分布在多个入口的库
  config.plugin.factoryImports =
    config.plugin.factoryImports ??
    (config.plugin.factoryImport ? [{ module: config.plugin.factoryImport }] : null);
  config.plugin.out = resolveFromBase(config.plugin.out, resolveFrom);

  config.src = resolveFromBase(config.src, resolveFrom);
  config.out = resolveFromBase(config.out, resolveFrom);
  config.pkg = resolveFromBase(config.pkg, resolveFrom);
  config.resolveFrom = resolveFrom;

  return config;
}

async function scanFactories(config) {
  const found = new Map();
  const propSignatures = new Map();
  const { pascalPrefix, shortcutPrefix, shortcutHelpers, extraPatterns } = config.factories;
  const pascalPattern = `${escapeRegExp(pascalPrefix)}[A-Z]\\w*`;
  const shortcutPattern = `${escapeRegExp(shortcutPrefix)}[A-Z]\\w*`;
  const helpers = shortcutHelpers.map(escapeRegExp).join('|');
  const factoryRegex = new RegExp(
    `export (function (${shortcutPattern})\\(|const (${shortcutPattern}) = (?:${helpers}))`,
    'g'
  );
  const pascalRegex = new RegExp(`export function (${pascalPattern})\\(\\{([^}]*)\\}`, 'g');
  const categories = Object.entries(config.categories).filter(([, value]) => value !== null);

  for (const [directory, category] of categories) {
    const dir = join(config.src, directory);
    const entries = await readdir(dir, { withFileTypes: true, recursive: true }).catch(() => []);

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.js')) {
        continue;
      }

      if (
        config.exclude.some((rule) =>
          rule instanceof RegExp ? rule.test(entry.name) : entry.name.includes(rule)
        )
      ) {
        continue;
      }

      const source = await readFile(join(entry.path, entry.name), 'utf8');

      for (const match of source.matchAll(pascalRegex)) {
        const props = extractProps(source, match[1]);

        if (props) {
          propSignatures.set(match[1], props);
        }
      }

      for (const match of source.matchAll(factoryRegex)) {
        found.set(match[2] ?? match[3], { category, source, index: match.index });
      }

      for (const pattern of extraPatterns) {
        if (pattern.category !== category) {
          continue;
        }

        const regex = new RegExp(pattern.regex, pattern.flags ?? 'g');

        for (const match of source.matchAll(regex)) {
          found.set(match[pattern.nameGroup ?? 1], { category, source, index: match.index });
        }
      }
    }
  }

  return { found, propSignatures };
}

function deriveElementNames(module, blocked) {
  return Object.entries(module)
    .filter(([name, value]) => typeof value === 'function' && !blocked.has(name))
    .map(([name]) => name)
    .sort();
}

async function importElementModule(specifier, base) {
  // 裸包名用 ESM 解析（exports 常只声明 import 条件，CJS 的 require.resolve 匹配不上）；
  // 解析基准是 config 所在目录——元素面跟着**组件库自己的依赖版本**走。
  // 相对路径 / 绝对路径 / file:// 直接用（私有元素面也可以指本地模块）。
  const parent = pathToFileURL(join(base, 'package.json')).href;
  const isPath =
    specifier.startsWith('.') ||
    specifier.startsWith('file://') ||
    /^[a-zA-Z]:[\\/]/.test(specifier) || // Windows 绝对路径
    specifier.startsWith('/');
  const resolved = isPath
    ? pathToFileURL(resolveFromBase(specifier, base)).href
    : import.meta.resolve(specifier, parent);

  return import(resolved);
}

/**
 * 生成 manifest（读源码与 package.json，不写盘）。
 *
 * @param {object} userConfig 覆盖默认配置（见 DEFAULT_CONFIG）
 * @param {{resolveFrom?: string}} options 相对路径基准（CLI 里是 config 文件所在目录）
 * @returns {Promise<object>} manifest 对象
 */
export async function generateKit(userConfig = {}, options = {}) {
  return (await generateKitArtifacts(userConfig, options)).manifest;
}

/** 一次扫描产出两份原料：manifest（给模型）与 wiring（给插件）。 */
export async function generateKitArtifacts(userConfig = {}, options = {}) {
  const config = normalizeConfig(userConfig, options);
  const srcStat = await stat(config.src).catch(() => null);

  if (!srcStat?.isDirectory()) {
    throw new Error(`kitgen 找不到源码目录：${config.src}`);
  }

  const pkg = JSON.parse(await readFile(config.pkg, 'utf8'));
  const { found, propSignatures } = await scanFactories(config);
  const { pascalPrefix, shortcutPrefix } = config.factories;
  const wiring = {};

  const components = [...found.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, meta]) => {
      const pascal = pascalPrefix + name.slice(shortcutPrefix.length);
      // JSDoc 贴在快捷方式或 PascalCase 完整工厂上都算；**doc 与 wiring 独立回退**——
      // 两个块各写各的也算（文档块贴快捷方式、接线块贴完整工厂，是常见排法）。
      const direct = parseGenuiBlock(meta.source, meta.index);
      const pascalIndex = meta.source.indexOf(`export function ${pascal}(`);
      const pascalBlock = pascalIndex >= 0 ? parseGenuiBlock(meta.source, pascalIndex) : null;
      const doc = direct?.doc ?? pascalBlock?.doc ?? null;
      const componentWiring = direct?.wiring ?? pascalBlock?.wiring ?? null;

      /**
       * props 的**两份来源合并**（不是二选一）：
       * - 签名解构给名字（yoya-ui 那种写法，零手写）；
       * - `@genui.props` 给说明（单参 props 袋的库只能靠它，如布局/图表 kit）。
       * 同名时 JSDoc 的说明优先——签名那份的值只是空串，拿它盖掉说明就是丢内容。
       */
      // 工厂真实名可能只有大小写之差（`vEchart` → `VEChart`）：别名导出是权威写法
      const factoryName = resolveFactoryName(meta.source, pascal);
      const signatureProps = propSignatures.get(factoryName) ?? null;
      const docProps = doc?.props ?? null;
      const props = signatureProps || docProps ? { ...signatureProps, ...docProps } : null;

      /**
       * **活绑定面从代码派生**（票 02）：扫描这一支工厂里的 `asSignal` / `asSignalJson`
       * 调用点，得到"哪些位吃句柄"（liveProps）与"哪些位是 JSON 位"（jsonProps）。
       * `@genui.live` / `@genui.json` 是作者写的声明，与扫描结果取并集——
       * manifest 描述**实际能接线的方式**，声明与代码是否对得上由门禁（票 02）对账。
       */
      const scanned = scanNormalizedProps(meta.source, factoryName, {
        declared: props ? Object.keys(props) : null
      });
      const liveProps = uniqueList([
        ...(doc?.liveProps ?? []),
        ...scanned.props.map((entry) => entry.name)
      ]);
      const jsonProps = uniqueList([
        ...(doc?.jsonProps ?? []),
        ...scanned.props.filter((entry) => entry.kind === 'json').map((entry) => entry.name)
      ]);

      /**
       * **值通道声明**（票 03）：归一调用点扫出来的位写进插件的 `valueProps`，
       * 运行期据此跳过"同名命令重放"——同一份值不再同时走两条通道。
       */
      const valueProps = scanned.props.map((entry) => entry.name);

      if (componentWiring || valueProps.length > 0) {
        wiring[name] = {
          props: {},
          events: {},
          ...(componentWiring ?? {}),
          valueProps
        };
      }

      const entry = {
        name,
        factory: true,
        category: doc?.category ?? meta.category ?? 'basic',
        scenes: doc?.scenes ?? [],
        ...(doc
          ? { ...doc, ...(props ? { props } : {}), needsDocs: false }
          : { summary: '', ...(props ? { props } : {}), needsDocs: true })
      };

      if (liveProps.length > 0) {
        entry.liveProps = liveProps;
      }

      if (jsonProps.length > 0) {
        entry.jsonProps = jsonProps;
      }

      return entry;
    });

  // 目录是"给模型看的"：每条都卡体积预算（超了当场报，别把选型信息写成小作文）。
  components.forEach((component) => checkBudgets(component, config.budgets));

  const html = config.elements.html
    ? await importElementModule(config.elements.html.module, config.resolveFrom).then((module) =>
        deriveElementNames(module, new Set(config.elements.html.blocked))
      )
    : [];
  const svg = config.elements.svg
    ? await importElementModule(config.elements.svg.module, config.resolveFrom).then((module) =>
        deriveElementNames(module, new Set(config.elements.svg.blocked))
      )
    : [];

  return {
    manifest: {
      $schema: 'genui-kit/1',
      namespace: config.namespace,
      version: pkg.version,
      runtime: config.runtime,
      generated: config.generated,
      /**
       * **切片纪律**（给消费者看的合同）：哪些字段进"每步都调"的瘦条目、哪些只在
       * "选定一个组件后按需取"的全量卡里。加新字段时先问它是不是选型判据：
       * 是 → thin；不是 → full。接线细节（content/prop/event）根本不进 manifest（进插件）。
       */
      tiers: {
        thin: ['name', 'summary', 'category', 'layer', 'scenes'],
        full: [
          'dataContract',
          'whenToUse',
          'notFor',
          'pitfalls',
          'props',
          'pairs',
          'state',
          'liveProps',
          'jsonProps',
          'example'
        ]
      },
      components,
      htmlElements: html,
      svgFactories: svg
    },
    wiring
  };
}

/**
 * 生成并写盘，返回 manifest 与统计（CLI / npm script 用这个）。
 *
 * @param {object} userConfig
 * @param {{resolveFrom?: string, out?: string, check?: boolean}} options `out` 覆盖输出位；`check` 只比对不写
 */
const isIdentifier = (key) => /^[a-zA-Z_$][\w$]*$/.test(key);
const quote = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** JSON 生成物也使用 Prettier 兼容格式：短数组折一行、长结构展开、LF、无尾逗号。 */
function textWidth(text) {
  return [...String(text)].reduce((width, char) => {
    const code = char.codePointAt(0);

    return (
      width +
      (code >= 0x1100 &&
      (code <= 0x115f ||
        (code >= 0x2e80 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe30 && code <= 0xfe6f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6) ||
        (code >= 0x20000 && code <= 0x3fffd))
        ? 2
        : 1)
    );
  }, 0);
}

function compactJson(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(compactJson).join(', ')}]`;
  }

  const entries = Object.entries(value);

  if (entries.length === 0) {
    return '{}';
  }

  return `{ ${entries.map(([key, item]) => `${JSON.stringify(key)}: ${compactJson(item)}`).join(', ')} }`;
}

function serializeJson(value, indent, column = indent) {
  const compact = compactJson(value);

  // 字符串没有"展开成多行"这回事：超宽也只保持单行。
  // （以前长字符串会落到下面的 Object.entries 分支，被逐字符拆成 { "0": "p", … }——
  //   agent 读到的 dataContract / summary 直接变垃圾。）
  if (typeof value === 'string') {
    return compact;
  }

  const limit = Array.isArray(value) ? 100 : 96;

  if (compact === '[]' || compact === '{}' || column + textWidth(compact) <= limit) {
    return compact;
  }

  if (Array.isArray(value)) {
    const pad = ' '.repeat(indent);

    return `[\n${value
      .map((item) => `${' '.repeat(indent + 2)}${serializeJson(item, indent + 2)}`)
      .join(',\n')}\n${pad}]`;
  }

  const pad = ' '.repeat(indent);
  const entries = Object.entries(value);

  return `{\n${entries
    .map(
      ([key, item]) =>
        `${pad}  ${JSON.stringify(key)}: ${serializeJson(item, indent + 2, indent + 2 + key.length + 4)}`
    )
    .join(',\n')}\n${pad}}`;
}

/** 值的紧凑形式：用于判断短数组 / 短对象能否放进一行。 */
function compactValue(value) {
  if (value === null || typeof value !== 'object') {
    return typeof value === 'string' ? quote(value) : String(value);
  }

  if (Array.isArray(value)) {
    return `[${value
      .filter((item) => item !== undefined)
      .map(compactValue)
      .join(', ')}]`;
  }

  const entries = Object.entries(value).filter(([, item]) => item !== undefined);

  return `{ ${entries
    .map(([key, item]) => `${isIdentifier(key) ? key : quote(key)}: ${compactValue(item)}`)
    .join(', ')} }`;
}

/** 值序列化（Prettier 兼容：短值折一行，长值展开，且不产生尾逗号）。 */
function serializeValue(value, indent, column = indent) {
  const pad = ' '.repeat(indent);
  const compact = compactValue(value);

  if (compact === '[]' || compact === '{}' || column + textWidth(compact) <= 96) {
    return compact;
  }

  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== undefined);

    return `[\n${items
      .map((item) => `${' '.repeat(indent + 2)}${serializeValue(item, indent + 2)}`)
      .join(',\n')}\n${pad}]`;
  }

  const entries = Object.entries(value).filter(([, item]) => item !== undefined);

  return `{\n${entries
    .map(
      ([key, item]) =>
        `${pad}  ${isIdentifier(key) ? key : quote(key)}: ${serializeValue(
          item,
          indent + 2,
          indent + 2 + key.length + 2
        )}`
    )
    .join(',\n')}\n${pad}}`;
}

/** 协议侧名字归一：`vCard` → canonical `Card`，并登记 `vCard` / `VCard` 别名（大小写不敏感解析）。 */
function protocolNames(name) {
  if (!/^v[A-Z]/.test(name)) {
    return { aliases: [], canonical: name };
  }

  const canonical = name.slice(1);

  return {
    aliases: [...new Set([name, `V${canonical}`])].filter((alias) => alias !== canonical),
    canonical
  };
}

/** 组件描述符 → JS 字面量（固定字段序，保证确定性）。 */
function serializeComponent(name, wiring, kind) {
  const { aliases, canonical } = protocolNames(name);
  const fields = [`factory: ${name}`];

  if (aliases.length > 0) {
    fields.push(`aliases: ${serializeValue(aliases, 4, 15)}`);
  }

  if (kind) {
    fields.push(`kind: ${quote(kind)}`);
  }

  if (wiring?.childrenProp !== undefined) {
    fields.push(`childrenProp: ${quote(wiring.childrenProp)}`);
  }

  if (wiring?.childCommand !== undefined) {
    fields.push(`childCommand: ${quote(wiring.childCommand)}`);
  }

  if (wiring?.itemBridge !== undefined) {
    fields.push(`itemBridge: ${serializeValue(wiring.itemBridge, 4, 19)}`);
  }

  if (wiring && Object.keys(wiring.props).length > 0) {
    fields.push(`props: ${serializeValue(wiring.props, 4, 13)}`);
  }

  if (wiring?.valueProps?.length > 0) {
    fields.push(`valueProps: ${serializeValue(wiring.valueProps, 4, 17)}`);
  }

  if (wiring && Object.keys(wiring.events).length > 0) {
    fields.push(`events: ${serializeValue(wiring.events, 4, 14)}`);
  }

  if (wiring?.textProp !== undefined) {
    fields.push(`textProp: ${quote(wiring.textProp)}`);
  }

  if (wiring && Object.keys(wiring.expose ?? {}).length > 0) {
    fields.push(`expose: ${serializeValue(wiring.expose, 4, 14)}`);
  }

  return `  ${canonical}: {\n${fields.map((field) => `    ${field}`).join(',\n')}\n  }`;
}

/** import 也按 Prettier 规则折叠：短列表一行，长列表展开且无尾逗号。 */
function serializeImport(names, module) {
  const imports = names.join(', ');
  const oneLine = `import { ${imports} } from '${module}';`;

  if (oneLine.length <= 100) {
    return oneLine;
  }

  return `import {\n${names.map((name) => `  ${name}`).join(',\n')}\n} from '${module}';`;
}

/**
 * 生成插件源码（确定性输出：组件名排序、字段序固定、import 序固定）。
 *
 * 需要开启插件生成，config 里给 `plugin.factoryImport`（工厂来源模块）。
 */
export async function generatePluginSource(config, manifest, wiring) {
  if (!config.plugin?.factoryImports) {
    return null;
  }

  const coreFactories = config.plugin.coreFactories ?? [];
  const functions = config.plugin.functions ?? [];
  const excluded = new Set([...(config.plugin.exclude ?? []), ...coreFactories]);
  const names = manifest.components
    .map((component) => component.name)
    .filter((name) => !excluded.has(name));

  // 工厂分布在多个入口的库（如主入口 + echart/three/router 可选入口）：
  // 逐模块探测导出，确定每个名字从哪 import；哪里都没有的名字报错（防静默漏注册）。
  const moduleByName = new Map();

  for (const source of config.plugin.factoryImports) {
    const module = await importElementModule(source.module, config.resolveFrom);
    const wanted = [...names, ...coreFactories, ...functions].filter(
      (name) => !moduleByName.has(name) && typeof module[name] === 'function'
    );

    wanted.forEach((name) => moduleByName.set(name, source.module));
  }

  const unresolved = [...names, ...coreFactories, ...functions].filter(
    (name) => !moduleByName.has(name)
  );

  if (unresolved.length > 0) {
    throw new Error(
      `这些名字在 factoryImports 的任何入口里都不是导出工厂：${unresolved.join(', ')}（公开入口未导出的部件用 plugin.exclude 排除，或补上所在入口）`
    );
  }

  const imports = [...moduleByName.keys()].sort((a, b) => a.localeCompare(b));
  const importStatements = config.plugin.factoryImports
    .map((source) => {
      const namesInModule = imports.filter((name) => moduleByName.get(name) === source.module);

      return namesInModule.length > 0 ? serializeImport(namesInModule, source.module) : null;
    })
    .filter(Boolean)
    .join('\n');
  const id = `${manifest.namespace}@${manifest.version}`;

  const componentBlocks = names
    .map((name) => serializeComponent(name, wiring[name], config.plugin.kinds?.[name]))
    .join(',\n');

  const coreBlock =
    coreFactories.length > 0
      ? coreFactories
          .map(
            (name) =>
              `  ${name}: { factory: ${name}, kind: ${quote(config.plugin.kinds?.[name] ?? 'element')} }`
          )
          .join(',\n')
      : null;
  const functionsBlock =
    functions.length > 0 ? functions.map((name) => `  ${name}`).join(',\n') : null;

  const topLevels = [];
  const pluginFields = [`  id: ${quote(id)}`];

  if (config.plugin.default) {
    pluginFields.push('  default: true');
  }

  if (config.plugin.repo) {
    topLevels.push(`export const repo = ${quote(config.plugin.repo)};`);
    pluginFields.push(`  repo: ${quote(config.plugin.repo)}`);
  }

  if ((config.plugin.aliases ?? []).length > 0) {
    const aliases = serializeValue(config.plugin.aliases, 0);

    topLevels.push(`export const aliases = ${aliases};`);
    pluginFields.push(`  aliases: ${serializeValue(config.plugin.aliases, 2)}`);
  }

  pluginFields.push('  components');
  if (coreBlock) {
    pluginFields.push('  core');
  }
  if (functionsBlock) {
    pluginFields.push('  functions');
  }

  const sections = [
    `/**\n * 由 yoya-kitgen 生成——勿手改。接线写在组件源码 JSDoc 的 @genui* 运行时标签里，重跑生成。\n * manifest：与本文件同一次扫描产出（版本一致），给模型看的目录在那边。\n */\nimport { createPlugin } from '${config.plugin.runtimeImport}';\n${importStatements}`,
    `export const namespace = ${quote(manifest.namespace)};\nexport const version = ${quote(manifest.version)};\n\nexport const components = {\n${componentBlocks}\n};`
  ];

  if (coreBlock) {
    sections.push(`export const core = {\n${coreBlock}\n};`);
  }

  if (functionsBlock) {
    sections.push(`export const functions = {\n${functionsBlock}\n};`);
  }

  if (topLevels.length > 0) {
    sections.push(topLevels.join('\n'));
  }

  sections.push(`export const plugin = createPlugin({\n${pluginFields.join(',\n')}\n});`);
  sections.push('export default plugin;');

  return `${sections.join('\n\n')}\n`;
}

export async function writeKit(userConfig = {}, options = {}) {
  const config = normalizeConfig(userConfig, options);
  const { manifest, wiring } = await generateKitArtifacts(userConfig, options);
  const out = options.out ? resolveFromBase(options.out, config.resolveFrom) : config.out;
  const text = serializeJson(manifest, 0) + '\n';
  const pluginSource = await generatePluginSource(config, manifest, wiring);
  const outputs = [{ out, text, changed: !options.check }];
  let changed = !options.check;

  if (pluginSource !== null) {
    const pluginOut = config.plugin.out;
    outputs.push({ out: pluginOut, text: pluginSource, changed: !options.check });
  }

  if (options.check) {
    for (const output of outputs) {
      const existing = await readFile(output.out, 'utf8').catch(() => null);

      output.changed = existing !== output.text;
    }

    changed = outputs.some((output) => output.changed);
  } else {
    for (const output of outputs) {
      await writeFile(output.out, output.text);
    }
  }

  return {
    changed,
    checked: Boolean(options.check),
    manifest,
    out,
    outputs: outputs.map(({ changed: fileChanged, out: path }) => ({
      changed: fileChanged,
      out: path
    })),
    summary: {
      components: manifest.components.length,
      documented: manifest.components.filter((c) => !c.needsDocs && c.summary).length,
      htmlElements: manifest.htmlElements.length,
      pluginGenerated: pluginSource !== null,
      svgFactories: manifest.svgFactories.length,
      version: manifest.version
    }
  };
}

/** 加载 config 文件（.js / .mjs 动态 import，.json 解析）。 */
export async function loadConfigFile(file) {
  const resolved = resolve(file);

  if (resolved.endsWith('.json')) {
    return { config: JSON.parse(await readFile(resolved, 'utf8')), file: resolved };
  }

  const loaded = await import(pathToFileURL(resolved).href);

  return { config: loaded.default ?? loaded, file: resolved };
}
