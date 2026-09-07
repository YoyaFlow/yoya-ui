/**
 * 工业自动化原型——纯逻辑模块（不依赖 DOM 与 Three.js）。
 *
 * 状态模型：
 * - grid：格子 -> { type, direction, timer, oreBuffer }
 * - items：传送带格子 -> 至多一个物品 { type, progress }（0=刚进入，1=准备离开）
 * - ore：可放置矿机的矿点集合；矿机必须压在矿点上
 */

export const ORE = 'ore';
export const PLATE = 'plate';

export const MINER = 'miner';
export const BELT = 'belt';
export const ASSEMBLER = 'assembler';

export const DIRECTIONS = Object.freeze([
  { dx: 1, dz: 0, label: '→' },
  { dx: 0, dz: 1, label: '↓' },
  { dx: -1, dz: 0, label: '←' },
  { dx: 0, dz: -1, label: '↑' }
]);

export const TICK_RATE = 10;
export const MINER_INTERVAL = 5;
export const RECIPE_TICKS = 8;
export const ORE_PER_RECIPE = 2;
export const MAX_ORE_BUFFER = 4;
export const BELT_SPEED = 0.25;

export const DEFAULT_ORE_CELLS = Object.freeze([
  [1, 3],
  [5, 6],
  [8, 1]
]);

export function keyOf(col, row) {
  return `${col},${row}`;
}

export function parseKey(key) {
  const [col, row] = key.split(',').map(Number);
  return { col, row };
}

export function isInside(state, col, row) {
  return col >= 0 && col < state.cols && row >= 0 && row < state.rows;
}

export function createFactoryState(options = {}) {
  const cols = options.cols ?? 10;
  const rows = options.rows ?? 8;
  const oreCells = options.oreCells ?? DEFAULT_ORE_CELLS;
  const state = {
    assemblerCount: 0,
    beltCount: 0,
    cols,
    grid: new Map(),
    items: new Map(),
    minerCount: 0,
    ore: new Set(oreCells.map(([col, row]) => keyOf(col, row))),
    rows,
    stats: {
      lostItems: 0,
      minedOre: 0,
      plates: 0
    },
    tick: 0,
    version: 1
  };

  if (options.chain) {
    buildDefaultChain(state);
  }
  return state;
}

export function buildDefaultChain(state) {
  placeBuilding(state, MINER, keyOf(1, 3), 0);
  placeBuilding(state, BELT, keyOf(2, 3), 0);
  placeBuilding(state, BELT, keyOf(3, 3), 0);
  placeBuilding(state, BELT, keyOf(4, 3), 0);
  placeBuilding(state, BELT, keyOf(5, 3), 0);
  placeBuilding(state, ASSEMBLER, keyOf(6, 3), 0);
}

export function canPlace(state, type, key) {
  const { col, row } = parseKey(key);
  if (!isInside(state, col, row) || state.grid.has(key)) {
    return false;
  }
  return type === MINER ? state.ore.has(key) : true;
}

export function placeBuilding(state, type, key, direction = 0) {
  if (!canPlace(state, type, key)) {
    return false;
  }

  const record = { direction, oreBuffer: 0, timer: 0, type };
  state.grid.set(key, record);
  if (type === MINER) {
    state.minerCount += 1;
  } else if (type === BELT) {
    state.beltCount += 1;
  } else {
    state.assemblerCount += 1;
  }
  state.version += 1;
  return true;
}

export function removeBuilding(state, key) {
  const record = state.grid.get(key);
  if (!record) {
    return false;
  }

  if (record.type === BELT) {
    state.stats.lostItems += dropItems(state, key);
  } else if (record.type === ASSEMBLER) {
    state.stats.lostItems += record.oreBuffer;
  }

  state.grid.delete(key);
  if (record.type === MINER) {
    state.minerCount -= 1;
  } else if (record.type === BELT) {
    state.beltCount -= 1;
  } else {
    state.assemblerCount -= 1;
  }
  state.version += 1;
  return true;
}

export function neighborKey(state, key, direction) {
  const { col, row } = parseKey(key);
  const vector = DIRECTIONS[direction];
  const nextCol = col + vector.dx;
  const nextRow = row + vector.dz;
  return isInside(state, nextCol, nextRow) ? keyOf(nextCol, nextRow) : null;
}

export function beltHasItem(state, key) {
  const items = state.items.get(key);
  return items !== undefined && items.length > 0;
}

export function tick(state) {
  state.tick += 1;
  stepMiners(state);
  stepBelts(state);
  stepAssemblers(state);
  state.version += 1;
  return state;
}

function stepMiners(state) {
  for (const [key, record] of [...state.grid]) {
    if (record.type !== MINER) {
      continue;
    }

    record.timer += 1;
    if (record.timer < MINER_INTERVAL) {
      continue;
    }

    if (deliverToNeighbor(state, key, record.direction, ORE)) {
      record.timer = 0;
      state.stats.minedOre += 1;
    }
  }
}

function stepBelts(state) {
  for (const [key, record] of [...state.grid]) {
    if (record.type !== BELT || !beltHasItem(state, key)) {
      continue;
    }

    const item = state.items.get(key)[0];
    item.progress += BELT_SPEED;
    if (item.progress < 1) {
      continue;
    }

    const targetKey = neighborKey(state, key, record.direction);
    if (!canEnterTarget(state, targetKey)) {
      item.progress = 0.99;
      continue;
    }

    dropItems(state, key);
    enterTarget(state, targetKey, item.type);
  }
}

function stepAssemblers(state) {
  for (const [, record] of [...state.grid]) {
    if (record.type !== ASSEMBLER) {
      continue;
    }

    if (record.oreBuffer >= ORE_PER_RECIPE && record.timer <= 0) {
      record.oreBuffer -= ORE_PER_RECIPE;
      record.timer = RECIPE_TICKS;
    }
    if (record.timer > 0) {
      record.timer -= 1;
      if (record.timer === 0) {
        state.stats.plates += 1;
      }
    }
  }
}

function deliverToNeighbor(state, key, direction, itemType) {
  const targetKey = neighborKey(state, key, direction);
  if (!targetKey || !canEnterTarget(state, targetKey)) {
    return false;
  }

  enterTarget(state, targetKey, itemType);
  return true;
}

function canEnterTarget(state, targetKey) {
  if (!targetKey) {
    return false;
  }

  const target = state.grid.get(targetKey);
  if (!target) {
    return false;
  }
  if (target.type === BELT) {
    return !beltHasItem(state, targetKey);
  }
  if (target.type === ASSEMBLER) {
    return target.oreBuffer < MAX_ORE_BUFFER;
  }
  return false;
}

function enterTarget(state, targetKey, itemType) {
  const target = state.grid.get(targetKey);
  if (target.type === BELT) {
    state.items.set(targetKey, [{ progress: 0, type: itemType }]);
    return;
  }
  if (target.type === ASSEMBLER && itemType === ORE) {
    target.oreBuffer += 1;
  }
}

function dropItems(state, key) {
  const items = state.items.get(key);
  if (!items) {
    return 0;
  }
  const count = items.length;
  if (count > 0) {
    state.items.delete(key);
  }
  return count;
}
