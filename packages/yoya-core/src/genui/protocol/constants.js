/**
 * yoya-genui 协议的稳定标识与版本。
 *
 * 协议只承诺两件事：**结构**（schema / node 的字段）与**值表达式**（`$bind` / `$template` /
 * `$action` / `$event`）；组件词汇不另立一套——`type` 直接写 yoya-ui 的工厂名（`vCard` /
 * `div` / `hstack` …），认不出的名字按 `onUnknown` 策略处理。
 */
export const PROTOCOL_ID = 'yoya-genui';

/** 协议版本：末位是同一份 schema 内的向后兼容修订，主版本变化才是破坏性变更。 */
export const PROTOCOL_VERSION = '0.2';

/** 值表达式保留键（协议只认这几个 `$` 开头的键）。 */
export const BIND_KEY = '$bind';
/** 引用的保管者（@i18n: / #: 归一化后的内部标记；缺省 = data）。 */
export const FROM_KEY = '$from';
export const TEMPLATE_KEY = '$template';
export const ACTION_KEY = '$action';
export const EVENT_KEY = '$event';
export const ARG_KEY = '$arg';
/** 函数调用：`{ "$call": "name", "args": { …值表达式 } }`（函数体在宿主注册表里，不在 schema 里）。 */
export const CALL_KEY = '$call';
export const CALL_ARGS_KEY = 'args';

/** 槽位：声明（占位）与投递（内容）两个属性。 */
export const SLOT_KEY = 'vn_slot';
export const TO_SLOT_KEY = 'to_slot';
/** 内容的宿主地址（省略 = surface 根）。 */
export const TO_KEY = 'to';

/**
 * 扁平内容表（内容区）：`components: [ …一块内容 ]`。
 *
 * 文档分成互不混层的两块：**结构**（`root`：布局 + `vn_slot` 落点）与**内容**（`components`：
 * 一块一个节点，各自用 `to` / `to_slot` 说不去到哪个落点）。`to` / `to_slot` 只允许写在这一层。
 */
export const COMPONENTS_KEY = 'components';

/** schema 顶层允许的键（其余键按 `meta` 处理，校验期给提示）。 */
export const SCHEMA_KEYS = Object.freeze([
  'protocol',
  'version',
  'surfaceId',
  'data',
  'computed',
  'theme',
  'root',
  COMPONENTS_KEY,
  'meta'
]);

/**
 * 节点上允许的结构键。
 *
 * - `type`     组件工厂名（必需；`text` 是内置的文本节点）
 * - `props`    组件 props（值位置，可放值表达式）
 * - `attrs` / `style` / `class` / `slot`  元素级透传
 * - `text`     文本内容（文本节点 / 组件的标签文本）
 * - `children` 子节点；`template` + `repeat` 是列表行模板
 * - `on`       事件 → 动作（`{ click: { $action: 'submit' } }`）
 * - `when`     条件挂载（布尔或值表达式 → `mountable`）
 * - `access`   权限码 → `node.access('...')`
 * - `id` / `key`  标识：`id` 落到 DOM 便于调试，`key` 用于列表对账
 */
export const NODE_KEYS = Object.freeze([
  'type',
  'id',
  'props',
  'attrs',
  'style',
  'class',
  'text',
  'children',
  'template',
  'repeat',
  'on',
  'when',
  'access',
  'key',
  'slot',
  'vn_slot',
  'to_slot',
  'to'
]);

/** 内置文本节点类型名：`{ "type": "text", "text": "…" }`。 */
export const TEXT_NODE_TYPE = 'text';

/** 列表行模板的保留字段。 */
export const REPEAT_EACH_KEY = '$each';
export const REPEAT_KEY_KEY = '$key';
export const REPEAT_AS_KEY = '$as';
