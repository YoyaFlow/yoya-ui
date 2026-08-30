let activeAllocator = null;
let fallbackSequence = 0;

/**
 * 创建一次渲染/挂载使用的 id 分配器。分配器在渲染上下文中共享，
 * 保证同一次渲染内 id 唯一且只依赖本次渲染的树结构（确定性、跨请求隔离）。
 */
export function createIdAllocator() {
  let value = 0;
  return {
    next() {
      value += 1;
      return value;
    }
  };
}

/**
 * 分配一个数字序号。渲染上下文中使用上下文分配器，否则退回模块级计数器。
 */
export function allocateNumber() {
  if (activeAllocator) {
    return activeAllocator.next();
  }

  fallbackSequence += 1;
  return fallbackSequence;
}

/**
 * 分配一个带前缀的确定性 id。
 */
export function allocateId(prefix) {
  return `${prefix}-${allocateNumber()}`;
}

/**
 * 在指定分配器作用域内执行构建，结束后恢复外层上下文。
 */
export function withIdAllocator(allocator, build) {
  const previous = activeAllocator;
  activeAllocator = allocator;
  try {
    return build();
  } finally {
    activeAllocator = previous;
  }
}
