/**
 * 老路径的**转发壳**：`@yoyaflow/yoya-ui/compiler-runtime`。
 *
 * 钩子的实现已经搬进 `@yoyaflow/yoya-core`（运行期代码归运行期包：这样）
 * “只装 core + 只加编译器”的项目也能跑编译产物，不必拖上整个组件库。
 * 这个文件只为“发布路径与原来一致”存在。
 */
export * from '@yoyaflow/yoya-core/compiler-runtime';
