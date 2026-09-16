// 跨模块共享的纯状态工具：keyed 列表刷新时按 key 合并行模型。
// 复用判据是行引用——能复用的行要原地 apply()，否则 keyed 会整行重建。

/** 按 key 合并：命中的行原地 apply()（实例身份不变），新 key 才用入参里的新实例。 */
export function mergeRowsByKey(previous, incoming, keyOf = (row) => row.id) {
  const reusable = new Map(previous.map((row) => [keyOf(row), row]));

  return incoming.map((row) => {
    const current = reusable.get(keyOf(row));
    return current && typeof current.apply === 'function' ? current.apply(row) : row;
  });
}

/** 读字段值：行内热字段是句柄，裸行是普通值——apply() 与表单回填两种输入都吃。 */
export function fieldValue(value) {
  return value && typeof value.peek === 'function' ? value.peek() : value;
}
