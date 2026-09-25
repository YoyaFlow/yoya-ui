/**
 * 构建期编译器的命令行入口。
 *
 *   node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --file src/row.js --out src/row.generated.js
 *   node node_modules/@yoyaflow/yoya-ui/dist/yoya.compiler.js --report src --json
 *
 * 退出码：0 = 成功；1 = 用法错误；2 = 该形状回落通用路径（不是错误，但构建脚本要能分辨）。
 */
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { compileFile, summarizeCompile } from './compile.js';
import { buildComponentRegistry } from './registry.js';
import { formatCoverage, reportCoverage } from './report.js';

const VALUE_OPTIONS = new Set([
  'component',
  'file',
  'fn', // 兼容旧写法
  'mode',
  'out',
  'core',
  'runtime',
  'fragments',
  'report',
  'extensions',
  'registry',
  'entries',
  'components',
  'components-specifier'
]);

const HELP = `yoya-ui 编译器（构建期）

用法：
  yoya-compiler --file <源文件> --component <组件名> [--mode element|node] [--out <产物>]
  yoya-compiler --registry <目录> --entries <组件清单.json>
  yoya-compiler --report <目录> [--json]

选项：
  --file <路径>        要编译的源文件（必须）
  --component <名字>   目标组件名（低层工具：一个组件一个产物；常规用法是挂构建期插件，按组件边界自动发现）
  --mode <通道>        element（默认，组件 = 原生元素）| node（组件 = ViewNode）
  --thin               节点模式下只给直接带活内容的节点建包装对象
  --out <路径>         生成模块的落盘位置；省略时打印到标准输出
  --fragments <路径>   同时写出页面模板块（template data-yoya-fragment，票 45）
  --core <模块>        提供工厂与 htmls / svgs 的核心入口（默认库自身 core）
  --runtime <模块>     生成代码里 import 运行期钩子的路径
  --report <目录>      覆盖率扫描（不需要组件名：按组件边界发现）：可编 / 回落占比与 bail 原因直方图
  --registry <目录>    构建组件注册表（编译清单里的叶子组件 + 写实例化模块）
  --entries <清单>     组件清单 JSON：[{ "file": "src/components/x.js", "export": "StatusDot" }]
  --components <JSON>  调用点链接用的注册表数据（buildComponentRegistry 产出的 *.json）
  --components-specifier <模块>  生成代码里 import 注册表模块的写法（默认 ./components.registry.js）
  --extensions <.js,.mjs>  扫描的扩展名（逗号分隔）
  --json               以 JSON 输出摘要（脚本消费）
  --help               这份帮助

说明：任何 bail 都会让该形状整体回落通用路径（退出码 2），不会产出半成品片段。
`;

function parseArgs(argv) {
  const flags = new Set();
  const values = new Map();

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) {
      continue;
    }

    const [name, inline] = item.slice(2).split('=');
    if (inline !== undefined) {
      values.set(name, inline);
      continue;
    }

    const next = argv[index + 1];
    if (VALUE_OPTIONS.has(name) && next !== undefined && !next.startsWith('--')) {
      values.set(name, next);
      index += 1;
      continue;
    }
    flags.add(name);
  }

  return { flags, values };
}

/** 核心入口：程序化调用直接给命名空间；`--core` 支持包名或文件路径。 */
async function resolveCore(options, provided) {
  const specifier = options.values.get('core');
  if (!specifier) {
    return provided ?? null;
  }
  if (specifier.startsWith('.') || specifier.startsWith('/') || /^[A-Za-z]:[\\/]/.test(specifier)) {
    return import(pathToFileURL(resolve(specifier)).href);
  }
  return import(specifier);
}

export async function runCli(argv = process.argv.slice(2), io = {}) {
  const log = io.log ?? ((line) => console.log(line));
  const error = io.error ?? ((line) => console.error(line));
  const options = parseArgs(argv);
  const knownFlags = new Set(['help', 'json', 'thin', 'templates-only']);
  const unknown = [
    ...[...options.flags].filter((name) => !knownFlags.has(name)),
    ...[...options.values.keys()].filter((name) => !VALUE_OPTIONS.has(name))
  ];

  if (options.flags.has('help') || argv.length === 0) {
    log(HELP);
    return 0;
  }
  if (unknown.length > 0) {
    error(`未知参数：${unknown.map((name) => `--${name}`).join('、')}`);
    return 1;
  }

  const core = await resolveCore(options, io.core);
  if (!core) {
    error('缺少 core：程序化调用请传 io.core，命令行请用 --core <模块>');
    return 1;
  }

  const asJson = options.flags.has('json');
  // 低层工具口：组件名由调用方显式给出（`--fn` 是旧写法，保留兼容）；不设任何业务默认名。
  const component = options.values.get('component') ?? options.values.get('fn') ?? null;
  const mode = options.values.get('mode') ?? 'element';

  const registryDir = options.values.get('registry');
  if (registryDir) {
    const entriesFile = options.values.get('entries');
    if (!entriesFile) {
      error('--registry 需要 --entries <清单 JSON>（[{ "file": …, "export": … }]）');
      return 1;
    }
    const entries = JSON.parse(readFileSync(entriesFile, 'utf8'));
    const built = buildComponentRegistry({
      entries,
      dir: registryDir,
      core,
      runtime: options.values.get('runtime')
    });
    const keys = Object.keys(built.registry.components);
    log(
      asJson
        ? JSON.stringify({ dir: registryDir, keys, skipped: built.skipped }, null, 2)
        : `组件注册表已生成：${keys.length} 个组件，跳过 ${built.skipped.length} 个 → ${registryDir}`
    );
    return 0;
  }

  const reportDir = options.values.get('report');
  if (reportDir) {
    const extensions = options.values.get('extensions');
    const report = reportCoverage({
      root: reportDir,
      component,
      mode,
      thin: options.flags.has('thin'),
      core,
      extensions: extensions ? extensions.split(',').map((item) => item.trim()) : undefined
    });
    log(asJson ? JSON.stringify(report, null, 2) : formatCoverage(report));
    return 0;
  }

  const file = options.values.get('file');
  if (!file) {
    error('缺少 --file <源文件>（或用 --report <目录> 做覆盖率扫描）');
    return 1;
  }

  const out = options.values.get('out');
  const componentsFile = options.values.get('components');
  // `--core` 是包名时，产物就用它 import 元素工厂（票 13 / R4：产物自带工厂，不塞 scope）；
  // 传的是文件路径 / 默认库自身 core 时，产物 import 包里的 core 入口。
  const coreOption = options.values.get('core');
  const coreSpecifier =
    coreOption &&
    !coreOption.startsWith('.') &&
    !coreOption.startsWith('/') &&
    !/^[A-Za-z]:[\\/]/.test(coreOption)
      ? coreOption
      : undefined;
  const result = compileFile({
    file,
    out,
    fn: component,
    mode,
    thin: options.flags.has('thin'),
    core,
    coreSpecifier,
    runtime: options.values.get('runtime'),
    fragmentsOut: options.values.get('fragments'),
    templatesOnly: options.flags.has('templates-only'),
    components: componentsFile ? JSON.parse(readFileSync(componentsFile, 'utf8')) : null,
    componentsSpecifier: options.values.get('components-specifier')
  });
  const summary = summarizeCompile(result);

  if (!result.compiled) {
    log(asJson ? JSON.stringify(summary, null, 2) : `回落通用路径：${file}`);
    return 2;
  }

  if (asJson) {
    log(JSON.stringify(summary, null, 2));
  } else if (!out) {
    log(result.module);
  } else {
    log(`已生成 ${out}（活结点 ${summary.liveNodes}，片段 ${summary.htmlBytes} B）`);
  }
  return 0;
}

/**
 * 以 CLI 方式被直接运行时才执行（`node dist/yoya.compiler.js …`）；被 import 时静默返回 null。
 * 入口 shim 因此只剩「导出 + 调这一句」，编译逻辑全部留在本目录。
 */
export async function runCliIfMain(core, argv = process.argv.slice(2)) {
  const entry = process.argv[1];
  if (!entry) {
    return null;
  }

  let isMain;
  try {
    isMain = pathToFileURL(entry).href === import.meta.url;
  } catch {
    isMain = false;
  }
  if (!isMain) {
    return null;
  }

  const code = await runCli(argv, { core });
  process.exitCode = code;
  return code;
}
