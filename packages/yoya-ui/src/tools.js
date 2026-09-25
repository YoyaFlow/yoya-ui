// 工具子系统入口（`@yoyaflow/yoya-ui/tools`）：转发 core 的 a11y + i18n。
//
// 组件包里不放实现：这两族住在 core（慢线），这里只是给"从组件包一侧 import"的使用者一个入口。
export * from '@yoyaflow/yoya-core/tools';
