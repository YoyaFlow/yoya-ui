// 依赖收集：由 core 拥有，引擎只负责「取值 + 通知」。
// 收集器是同步 push/pop 栈，与 setupStack 同形态，渲染同步执行因而天然每请求隔离。
const collectors = [];

function currentCollector() {
  return collectors.length > 0 ? collectors[collectors.length - 1] : null;
}

// 读取旁路：dev 护栏用（核心不依赖它）。与收集语义无关——收集仍只记最内层收集器。
let readObserver = null;

/**
 * 句柄写入的全局序号：绑定的求值记下当时的序号，**落地时**据此判断"构建之后源有没有被写过"。
 *
 * 为什么需要：绑定构建期只求值一次、落地才订阅依赖，所以「构建 → 落地」窗口里的写入收不到
 * 通知；若源之后不再变化，绑定会一直停在构建期快照（静默错值）。落地时对上过号的绑定对齐一次即可。
 */
let writeSerial = 0;

export function bumpWriteSerial() {
  writeSerial += 1;
}

export function currentWriteSerial() {
  return writeSerial;
}

/** 内部：安装读取观察者；没有收集器时也会收到回调（正是「声明区域之前读」的场景）。 */
export function setReadObserver(observer) {
  readObserver = observer;
}

function uniqueSources(sources) {
  return sources.filter((source, index) => sources.indexOf(source) === index);
}

/** 记录一次依赖读取；没有收集器或当前收集器被抑制时不进依赖表。 */
export function recordRead(source) {
  const collector = currentCollector();
  const suppressed = Boolean(collector && collector.suppressed);

  if (collector && !suppressed) {
    collector.sources.push(source);
  }

  // peek() 走 withoutCollect：显式「只读不订阅」，观察者不该看到它。
  if (readObserver && !suppressed) {
    readObserver(source);
  }
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

/** 在收集器内求值，返回值与依赖；receiver 交给 run 当 this（避免为每个绑定建一层闭包）。 */
export function withCollect(run, receiver = undefined) {
  const token = beginCollect();
  try {
    return { value: run.call(receiver), sources: uniqueSources(token.sources) };
  } finally {
    endCollect(token);
  }
}

/**
 * 绑定求值的热路径：收集器 token 池化复用。
 *
 * `withCollect` 每次求值要建 token 对象 + 依赖数组 + 去重后的结果对象（隔离微基准实测 33 B/次），
 * 而绑定求值是按行累加的（一行一两条绑定，每次写入唤醒都要重算）。这里改成：
 * 从池里取一个 token → 在收集器里求值 → 调用方读完依赖 / 拷走多依赖后归还。
 * 池是模块级的空 token 列表（归还时清空依赖，不跨请求留引用），同步执行因而天然每请求隔离。
 */
const TOKEN_POOL_LIMIT = 32;
const tokenPool = [];

/** 取一个可复用的收集器 token（依赖列表已清空）。 */
export function acquireCollectorToken() {
  const token = tokenPool.pop();
  if (token !== undefined) {
    token.suppressed = false;
    return token;
  }

  return { sources: [], suppressed: false };
}

/** 归还 token：清空依赖引用后放回池（池有上限，避免异常路径把它撑大）。 */
export function releaseCollectorToken(token) {
  token.sources.length = 0;
  token.suppressed = false;
  if (tokenPool.length < TOKEN_POOL_LIMIT) {
    tokenPool.push(token);
  }
}

/** 在给定 token 的收集器内求值；返回值，依赖留在 `token.sources`。 */
export function collectInto(token, run, receiver = undefined) {
  collectors.push(token);
  try {
    return run.call(receiver);
  } finally {
    collectors.pop();
  }
}

/** 就地按首次出现去重（保序），不产生新数组。 */
export function dedupeSourcesInPlace(sources) {
  let write = 0;
  for (let read = 0; read < sources.length; read += 1) {
    const source = sources[read];
    let seen = false;
    for (let probe = 0; probe < write; probe += 1) {
      if (sources[probe] === source) {
        seen = true;
        break;
      }
    }
    if (!seen) {
      sources[write] = source;
      write += 1;
    }
  }

  sources.length = write;
  return sources;
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
