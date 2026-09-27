import { ERROR_CODES, GenUIError } from '../../protocol/errors.js';
import { isPlainObject, normalizePath, readPath, writePath } from '../../protocol/values.js';

const MESSAGE_KEYS = ['beginRendering', 'surfaceUpdate', 'dataModelUpdate', 'deleteSurface'];

/**
 * 解析 A2UI 输入：字符串（JSON / JSONL）、单条消息、消息数组、`{ messages: [...] }` 都收。
 * 字符串里混着多行 JSON 时按 JSONL 逐行解析，报错带行号。
 */
export function parseA2UIMessages(input) {
  const messages = coerceToArray(input).flatMap(expand);

  if (messages.length === 0) {
    throw new GenUIError('A2UI 输入里没有任何消息', { code: ERROR_CODES.dialect });
  }

  return messages.map((message, index) => normalizeMessage(message, index));
}

function coerceToArray(input) {
  if (typeof input === 'string') {
    return parseText(input);
  }

  if (Array.isArray(input)) {
    return input;
  }

  if (isPlainObject(input)) {
    if (Array.isArray(input.messages)) {
      return input.messages;
    }

    return [input];
  }

  throw new GenUIError('A2UI 输入必须是消息数组、单条消息或 JSON / JSONL 字符串', {
    code: ERROR_CODES.dialect
  });
}

function parseText(text) {
  const trimmed = text.trim();

  if (trimmed === '') {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    // 多行 JSONL：整体解析失败才按行拆
    const lines = trimmed
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '');

    if (lines.length <= 1) {
      throw new GenUIError(`A2UI JSON 解析失败：${error.message}`, {
        cause: error,
        code: ERROR_CODES.dialect
      });
    }

    return lines.map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (lineError) {
        throw new GenUIError(`A2UI JSONL 第 ${index + 1} 行解析失败：${lineError.message}`, {
          cause: lineError,
          code: ERROR_CODES.dialect,
          path: `messages[${index}]`
        });
      }
    });
  }
}

function expand(entry) {
  return typeof entry === 'string' ? parseText(entry) : [entry];
}

function normalizeMessage(message, index) {
  if (!isPlainObject(message)) {
    throw new GenUIError('A2UI 消息必须是 JSON 对象', {
      code: ERROR_CODES.dialect,
      path: `messages[${index}]`
    });
  }

  if (MESSAGE_KEYS.every((key) => message[key] === undefined)) {
    throw new GenUIError(`A2UI 消息必须是 ${MESSAGE_KEYS.join(' / ')} 之一`, {
      code: ERROR_CODES.dialect,
      path: `messages[${index}]`
    });
  }

  return message;
}

/**
 * 把消息流折叠成一份 surface 状态。
 *
 * A2UI 是**增量**协议：`surfaceUpdate` 加 / 换组件、`dataModelUpdate` 改数据、
 * `beginRendering` 定 root 与样式；这里只做折叠，不渲染。
 */
export function foldA2UIMessages(messages) {
  const state = {
    catalogId: null,
    components: new Map(),
    data: {},
    deleted: false,
    root: null,
    styles: {},
    surfaceId: null
  };

  messages.forEach((message) => {
    if (isPlainObject(message.beginRendering)) {
      const begin = message.beginRendering;
      state.surfaceId = begin.surfaceId ?? state.surfaceId;
      state.root = begin.root ?? state.root;
      state.catalogId = begin.catalogId ?? state.catalogId;
      state.styles = isPlainObject(begin.styles) ? begin.styles : state.styles;
      return;
    }

    if (isPlainObject(message.surfaceUpdate)) {
      const update = message.surfaceUpdate;
      state.surfaceId = update.surfaceId ?? state.surfaceId;

      (Array.isArray(update.components) ? update.components : []).forEach((component) => {
        if (isPlainObject(component) && typeof component.id === 'string') {
          state.components.set(component.id, component);
        }
      });
      return;
    }

    if (isPlainObject(message.dataModelUpdate)) {
      applyDataModelUpdate(state, message.dataModelUpdate);
      return;
    }

    if (isPlainObject(message.deleteSurface)) {
      state.deleted = true;
      state.surfaceId = message.deleteSurface.surfaceId ?? state.surfaceId;
    }
  });

  return state;
}

/** `dataModelUpdate` → 数据模型：`contents` 是 `{key, value*}` 列表，`valueMap` 是邻接表。 */
export function applyDataModelUpdate(state, update) {
  const path = normalizePath(update.path ?? '/');
  const patch = entriesToObject(update.contents);

  if (path === '/') {
    state.data = { ...state.data, ...patch };
    return;
  }

  const current = readPath(state.data, path);
  const base = isPlainObject(current) ? current : {};
  state.data = writePath(state.data, path, { ...base, ...patch });
}

function entriesToObject(contents) {
  return (Array.isArray(contents) ? contents : []).reduce((accumulator, entry) => {
    if (isPlainObject(entry) && typeof entry.key === 'string') {
      accumulator[entry.key] = entryValue(entry);
    }

    return accumulator;
  }, {});
}

function entryValue(entry) {
  if (Array.isArray(entry.valueMap)) {
    return entriesToObject(entry.valueMap);
  }

  if (entry.valueString !== undefined) {
    return entry.valueString;
  }

  if (entry.valueNumber !== undefined) {
    return entry.valueNumber;
  }

  if (entry.valueBoolean !== undefined) {
    return entry.valueBoolean;
  }

  return null;
}
