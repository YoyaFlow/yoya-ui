import { describe, expect, it } from 'vitest';
import { renderToString } from '../core/ssr.js';
import * as yoya from '../index.js';
import { docsRouteLoaders } from './index.router.js';

/**
 * 源码面板契约（票 08）：面板里展示的每个演示都必须是「复制即可运行」的。
 * 这里逐页渲染全部文档页，直接检查面板文本本身，因此不管演示定义在
 * demos/ 还是页面文件里，都受同一套规则约束。
 */
const MAX_LINE_LENGTH = 100;
const MAX_CHAIN_CALLS_PER_LINE = 3;
const MAX_DEMO_LINES = 60;

const LIBRARY_NAMES = new Set(Object.keys(yoya));

/**
 * 演示函数行数预算：AGENTS.md 约定单函数建议 60 行以内（不作为编译检查），
 * 因此存量长演示登记上限冻结，只能变短不能变长；新增演示必须 ≤ 60 行。
 * 演示拆小后请把这里的数字同步下调，否则会按「登记过期」报错。
 */
const LONG_DEMO_BUDGET = Object.freeze({
  'async:dynamic-loader :: DynamicLoaderExample1': 110,
  'data-display:avatar :: AvatarInteractiveExample1': 65,
  'data-display:carousel :: CarouselLoopExample1': 65,
  'data-display:scroll :: ScrollLoopBlockExample1': 67,
  'data-display:tree :: TreeBasicExample1': 77,
  'data-display:tree :: TreeBuilderExample1': 99,
  'data-display:tree :: TreeCheckableExample1': 70,
  'data-display:tree :: TreeFileManagerExample1': 147,
  'data-display:tree-ranger :: TreeRangerActionsExample': 70,
  'form:field :: FieldSaveExample1': 67,
  'form:field :: FieldValidationExample1': 64,
  'form:form :: FormExample1': 75,
  'form:form :: FormExample3': 67,
  'general:svg :: SvgProgressRingExample1': 89,
  'guides:component :: InteractiveComposeExample1': 100,
  'guides:devtools :: DevtoolsInspectorDemo': 552,
  'guides:i18n :: I18nExtendExample1': 77,
  'guides:i18n :: I18nParamsExample1': 75,
  'guides:lifecycle :: RegionGateExample': 61,
  'guides:state-node :: StateDynamicAttrsExample1': 64,
  'guides:state-node :: StateEventOverwriteExample1': 61,
  'layout:body :: BodyShellExample1': 126,
  'layout:dialog :: PopupFormExample1': 79,
  'layout:dialog :: PopupLaunchExample1': 70,
  'layout:dialog :: PopupStateExample1': 63,
  'layout:grid :: GridResponsiveExample1': 74,
  'layout:mobile :: MobileLayoutExample1': 63,
  'layout:templates :: AdminTemplateExample1': 65,
  'layout:templates :: CloudWorkspaceTemplateExample1': 75,
  'layout:templates :: DocsTemplateExample1': 71,
  'layout:templates :: ProfileTemplateExample1': 71,
  'navigation:anchor :: AnchorStandaloneDemo': 85,
  'navigation:menu :: AdminSidebarCard': 90,
  'navigation:navbar :: NavbarShellExample1': 63,
  'third-party:ag-grid :: AgGridFinanceExample': 273,
  'third-party:ag-grid :: AgGridHrExample': 248,
  'third-party:ag-grid :: AgGridInventoryExample': 309,
  'third-party:ag-grid :: AgGridPerformanceExample': 70
});

/** 收集一个面板文本里 import 的符号（支持多行 import）。 */
function importsOf(text) {
  const names = [];

  for (const match of text.matchAll(/^import \{([\s\S]*?)\} from '[^']+';$/gm)) {
    match[1].split(',').forEach((entry) => {
      const name = entry.trim();
      if (name) {
        names.push(name);
      }
    });
  }

  return names;
}

/** 去掉 import 行后的正文（保留行号）。 */
function bodyOf(text) {
  return text
    .split('\n')
    .map((line) => (/^import /.test(line) ? '' : line))
    .join('\n');
}

/** 去掉字符串与注释，避免把文案里的 `text(` 之类当成调用。 */
function codeOnly(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/`(?:\\.|[^`\\])*`/g, '""')
    .replace(/'(?:\\.|[^'\\])*'/g, '""')
    .replace(/"(?:\\.|[^"\\])*"/g, '""');
}

/** 面板内自己声明的名字（变量/函数/参数），调用它们不需要 import。 */
function declaredNames(code) {
  const names = new Set();

  for (const match of code.matchAll(/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g)) {
    names.add(match[1]);
  }
  for (const match of code.matchAll(/function\s+([A-Za-z_$][\w$]*)\s*\(/g)) {
    names.add(match[1]);
  }
  for (const match of code.matchAll(/\(([^)]*)\)\s*=>/g)) {
    match[1].split(',').forEach((entry) => {
      const name = entry.trim().split(/[=:]/)[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) {
        names.add(name);
      }
    });
  }
  for (const match of code.matchAll(/([A-Za-z_$][\w$]*)\s*=>/g)) {
    names.add(match[1]);
  }

  return names;
}

/** 面板里以「自由函数」形式调用的库符号（`parent.vButton(...)` 这种 DSL 方法不算）。 */
function libraryCalls(code) {
  const locals = declaredNames(code);
  const names = new Set();

  for (const match of code.matchAll(/(^|[^\w$.])([A-Za-z_$][\w$]*)\s*\(([^)]*)\)([^\n]*)/g)) {
    const name = match[2];
    if (/^\s*\{/.test(match[4])) {
      continue; // 对象/类方法定义 `name(...) { ... }`，不是调用
    }
    if (LIBRARY_NAMES.has(name) && !locals.has(name)) {
      names.add(name);
    }
  }

  return names;
}

/** 面板里 `export function X()` 的行数（花括号配平）。 */
function demoFunctions(text) {
  const lines = text.split('\n');
  const found = [];
  let index = 0;

  while (index < lines.length) {
    const match = lines[index].match(/^export function ([A-Za-z_$][\w$]*)/);
    if (!match) {
      index += 1;
      continue;
    }

    const start = index;
    let depth = 0;
    for (; index < lines.length; index += 1) {
      depth += (lines[index].match(/\{/g) || []).length - (lines[index].match(/\}/g) || []).length;
      if (depth <= 0 && index > start) {
        break;
      }
    }
    found.push({ length: index - start + 1, name: match[1] });
    index += 1;
  }

  return found;
}

let panelCache = null;

/** 逐页渲染全部文档页，收集 (routeKey, 面板标题, 面板文本)；只渲染一次。 */
async function collectPanels() {
  if (panelCache) {
    return panelCache;
  }

  const panels = [];

  for (const [routeKey, load] of Object.entries(docsRouteLoaders)) {
    const holder = document.createElement('div');
    holder.innerHTML = renderToString(await load()).html;
    holder.querySelectorAll('[data-source-example]').forEach((panel) => {
      panels.push({
        routeKey,
        text: panel.textContent,
        title: panel.getAttribute('data-source-example')
      });
    });
  }

  panelCache = panels;
  return panels;
}

describe('demo source panels', () => {
  it('keeps every panel import block in sync with the code it shows', async () => {
    const failures = [];
    const panels = await collectPanels();

    panels.forEach(({ routeKey, text, title }) => {
      if (!/from '@yoyaflow\/yoya-ui/.test(text)) {
        return; // 适配器模板等原样展示的整文件面板不带包内 import
      }

      const body = bodyOf(text);
      const code = codeOnly(body);
      const imported = importsOf(text);
      const importedSet = new Set(imported);

      imported.forEach((name) => {
        if (!new RegExp(`\\b${name}\\b`).test(body)) {
          failures.push(`${routeKey} [${title}] 多导入了 ${name}`);
        }
      });

      libraryCalls(code).forEach((name) => {
        if (!importedSet.has(name)) {
          failures.push(`${routeKey} [${title}] 缺少导入 ${name}`);
        }
      });
    });

    expect(failures.join('\n')).toBe('');
  }, 120000);

  it('keeps panel code short and chains readable', async () => {
    const failures = [];
    const panels = await collectPanels();

    panels.forEach(({ routeKey, text, title }) => {
      bodyOf(text)
        .split('\n')
        .forEach((line, index) => {
          const lineNumber = index + 1;
          const length = [...line].length;
          const chainCalls = (line.match(/\.\s*[A-Za-z_$][\w$]*\s*\(/g) || []).length;

          if (length > MAX_LINE_LENGTH && !/https?:|data:/.test(line)) {
            failures.push(
              `${routeKey} [${title}:${lineNumber}] ${length} 字符，上限 ${MAX_LINE_LENGTH}`
            );
          }

          if (chainCalls > MAX_CHAIN_CALLS_PER_LINE) {
            failures.push(
              `${routeKey} [${title}:${lineNumber}] ${chainCalls} 个点式链，上限 ${MAX_CHAIN_CALLS_PER_LINE}`
            );
          }
        });
    });

    expect(failures.join('\n')).toBe('');
  }, 120000);

  it('keeps demo functions inside the 60-line budget', async () => {
    const failures = [];
    const seen = new Set();
    const panels = await collectPanels();

    panels.forEach(({ routeKey, text }) => {
      demoFunctions(text).forEach(({ length, name }) => {
        const key = `${routeKey} :: ${name}`;
        seen.add(key);
        const budget = LONG_DEMO_BUDGET[key];

        if (length <= MAX_DEMO_LINES) {
          if (budget) {
            failures.push(`${key} 已降到 ${MAX_DEMO_LINES} 行以内，请删除登记上限`);
          }
          return;
        }

        if (!budget) {
          failures.push(`${key} ${length} 行，超过 ${MAX_DEMO_LINES} 行且未登记：请拆小演示`);
          return;
        }

        if (length > budget) {
          failures.push(`${key} 从 ${budget} 行涨到 ${length} 行，请拆小演示`);
        } else if (length < budget) {
          failures.push(`${key} 已缩短到 ${length} 行，请把登记上限改为 ${length}`);
        }
      });
    });

    Object.keys(LONG_DEMO_BUDGET).forEach((key) => {
      if (!seen.has(key)) {
        failures.push(`${key} 已不存在，请删除登记上限`);
      }
    });

    expect(failures.join('\n')).toBe('');
  }, 120000);
});
