/** 测试夹具自己的快捷方式助手（真实库里来自组件运行时工具）。 */
export const createComponentShortcut = (factory) => (options) => factory(options);
