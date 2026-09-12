// 依赖收集：由 core 拥有，引擎只负责「取值 + 通知」。
// 收集器是同步 push/pop 栈，与 setupStack 同形态，渲染同步执行因而天然每请求隔离。
const collectors = [];

function currentCollector() {
  return collectors.length > 0 ? collectors[collectors.length - 1] : null;
}

function uniqueSources(sources) {
  return sources.filter((source, index) => sources.indexOf(source) === index);
}

/** 记录一次依赖读取；没有收集器或当前收集器被抑制时静默跳过。 */
export function recordRead(source) {
  const collector = currentCollector();
  if (!collector || collector.suppressed) {
    return;
  }

  collector.sources.push(source);
}

/** 打开一个收集器，返回令牌；用于「中途开始、别处结束」的场景（如区域 builder）。 */
export function beginCollect() {
  const token = { sources: [], suppressed: false };
  collectors.push(token);
  return token;
}

/** 关闭收集器并返回本次读到的依赖（去重、保序）。 */
export function endCollect(token) {
  const index = collectors.lastIndexOf(token);
  if (index !== -1) {
    collectors.splice(index, 1);
  }

  return uniqueSources(token.sources);
}

/** 在收集器内求值，返回值与依赖。 */
export function withCollect(run) {
  const token = beginCollect();
  try {
    return { value: run(), sources: uniqueSources(token.sources) };
  } finally {
    endCollect(token);
  }
}

/** 在抑制收集的上下文内求值（peek / untracked）。 */
export function withoutCollect(run) {
  const token = beginCollect();
  token.suppressed = true;
  try {
    return run();
  } finally {
    endCollect(token);
  }
}
