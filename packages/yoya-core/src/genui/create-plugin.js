/**
 * 插件工厂：把组件库的**数据表**（工厂引用 + 绑定声明 + 函数表）装成一个插件对象。
 *
 * GenUI 运行时不知道任何组件——组件知识由库自己的插件提供；这个函数是「创建插件的能力」
 * 本身：生成的插件文件（kitgen 产出）只需序列化数据表 + 一次 `createPlugin(...)` 调用。
 *
 * ```js
 * import { createPlugin } from '@yoyaflow/yoya-genui';
 * import { vCard, vButton } from '@yoyaflow/yoya-ui/ui';
 *
 * export default createPlugin({
 *   id: 'yoyaflow/yoya-ui@0.7.6',
 *   components: {
 *     vCard: { factory: vCard },
 *     vButton: { factory: vButton, props: { label: 'label' }, textProp: 'label' }
 *   }
 * });
 * ```
 *
 * `id` 是 `namespace@version`；也可分开给 `namespace` / `version`。
 */
export function createPlugin(options = {}) {
  const {
    aliases,
    core,
    components,
    default: isDefault,
    functions,
    id,
    namespace: givenNamespace,
    priority,
    repo,
    source,
    version: givenVersion
  } = options;

  if (!id && !givenNamespace) {
    throw new Error('createPlugin 需要 id（namespace@version）或 namespace');
  }

  const atIndex = typeof id === 'string' ? id.lastIndexOf('@') : -1;
  const namespace = givenNamespace ?? (atIndex > 0 ? id.slice(0, atIndex) : id);
  const version = givenVersion ?? (atIndex > 0 ? id.slice(atIndex + 1) : undefined);

  return {
    id: id ?? `${namespace}@${version ?? ''}`,

    install(api) {
      if (core) {
        api.core(core);
      }

      const record = api.library({
        aliases,
        components,
        default: isDefault,
        namespace,
        priority,
        repo,
        source,
        version
      });

      if (functions) {
        api.functions(functions, {
          aliases: [namespace, ...(aliases ?? [])],
          library: record.key
        });
      }

      return record;
    }
  };
}
