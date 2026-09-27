import { isPlainObject } from '../../protocol/values.js';
import { buildA2UIRoot, buildComponent, valueExpr } from './components.js';
import { parseA2UIMessages } from './messages.js';
import { createA2UISession, toA2UISchema } from './session.js';
import { a2uiTheme } from './theme.js';

export const A2UI_DIALECT = 'a2ui';
export const A2UI_VERSION = '0.8';

/**
 * A2UI（Agent to UI）方言。
 *
 * 输入是 A2UI v0.8 的服务端消息（`beginRendering` / `surfaceUpdate` /
 * `dataModelUpdate` / `deleteSurface` 的数组、JSONL 或单条），输出是 yoya-genui schema。
 *
 * - `convert` 一次性转换；`createSession` 拿会话，之后可以用 `surface.ingest(messages)` 吃增量；
 * - 组件映射表见 `docs/dialects-a2ui.md`，未映射的组件渲染成说明性占位块并记 warning。
 */
export const a2uiDialect = {
  aliases: ['A2UI', 'a2ui', 'a2ui-0.8', 'a2ui/0.8', 'a2ui:0.8'],

  convert(input, options = {}) {
    return createA2UISession(input, { ...options, requireRoot: true }).schema;
  },

  createSession(input, options = {}) {
    return createA2UISession(input, options);
  },

  detect(input) {
    try {
      return parseA2UIMessages(input).length > 0;
    } catch {
      return false;
    }
  },

  label: 'A2UI (Agent to UI)',
  name: A2UI_DIALECT,
  version: A2UI_VERSION
};

/**
 * 动作事件 → A2UI `userAction`（客户端 → 服务端）。
 *
 * ```js
 * surface.on('action', (event) => {
 *   if (event.source.componentId) send(toA2UIUserAction(event));
 * });
 * ```
 */
export function toA2UIUserAction(event, options = {}) {
  const { now = () => new Date().toISOString(), surfaceId = 'main' } = options;

  return {
    userAction: {
      context: isPlainObject(event?.params) ? event.params : {},
      name: String(event?.name ?? ''),
      sourceComponentId: String(event?.source?.componentId ?? ''),
      surfaceId: String(event?.source?.surfaceId ?? surfaceId),
      timestamp: now()
    }
  };
}

/**
 * A2UI JSON → yoya-genui schema 的纯函数适配器（不碰 DOM，可离线 / 服务端用）。
 *
 * ```js
 * import { convertA2UI } from '@yoyaflow/yoya-core/genui/dialects/a2ui';
 * const schema = convertA2UI(a2uiMessages, { surfaceId: 'main' });
 * ```
 *
 * 输入认 A2UI v0.8 的数组 / JSONL 文本 / 单条消息；输出可直接 `GenUI.fromJson(schema)`。
 * CLI 形态见同目录 `cli.js`（`yoya-a2ui`）。
 */
export function convertA2UI(input, options = {}) {
  return a2uiDialect.convert(input, options);
}

export { a2uiTheme, buildA2UIRoot, buildComponent, createA2UISession, toA2UISchema, valueExpr };
export { applyDataModelUpdate, foldA2UIMessages, parseA2UIMessages } from './messages.js';
