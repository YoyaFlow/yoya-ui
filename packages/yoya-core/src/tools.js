// 工具子系统入口（`@yoyaflow/yoya-core/tools`）：a11y + i18n。
//
// 为什么单独成入口：这两族是**辅助能力**，不是每个应用都要用；放在主入口里它们会被
// barrel 的导入（i18n 还有顶层副作用：短路安装 + 作用域桥接）拖进每个 bundle。
// 分开之后：主入口只留渲染必需的原语（节点 / 信号 / keyed / 元素工厂 / vText / slot），
// 要用工具的地方显式从这里 import。
export * from './core/a11y.js';
export * from './core/i18n.js';
export * from './core/theme.js';
export * from './core/component-authoring.js';
