import { describe, expect, it } from 'vitest';
import {
  ASSEMBLER,
  BELT,
  MINER,
  ORE,
  beltHasItem,
  buildDefaultChain,
  canPlace,
  createFactoryState,
  keyOf,
  placeBuilding,
  removeBuilding,
  tick
} from './factory-state.js';

function chainState() {
  const state = createFactoryState({ chain: true });
  expect(state.minerCount).toBe(1);
  expect(state.beltCount).toBe(4);
  expect(state.assemblerCount).toBe(1);
  return state;
}

describe('factory-state', () => {
  it('builds the default chain: miner -> belts -> assembler', () => {
    const state = chainState();

    expect(state.grid.get(keyOf(1, 3)).type).toBe(MINER);
    expect(state.grid.get(keyOf(2, 3)).type).toBe(BELT);
    expect(state.grid.get(keyOf(6, 3)).type).toBe(ASSEMBLER);
    expect(state.tick).toBe(0);
  });

  it('validates placement rules', () => {
    const state = createFactoryState();

    expect(canPlace(state, BELT, keyOf(0, 0))).toBe(true);
    expect(canPlace(state, MINER, keyOf(0, 0))).toBe(false);
    expect(canPlace(state, MINER, keyOf(5, 6))).toBe(true);
    expect(placeBuilding(state, MINER, keyOf(5, 6), 2)).toBe(true);
    expect(canPlace(state, BELT, keyOf(5, 6))).toBe(false);
    expect(placeBuilding(state, BELT, keyOf(-1, 0), 0)).toBe(false);
    expect(placeBuilding(state, BELT, keyOf(0, 99), 0)).toBe(false);
  });

  it('produces ore into an empty belt on interval', () => {
    const state = createFactoryState({
      chain: false,
      oreCells: [[1, 3]]
    });
    placeBuilding(state, MINER, keyOf(1, 3), 0);
    placeBuilding(state, BELT, keyOf(2, 3), 0);

    for (let i = 0; i < 5; i += 1) {
      tick(state);
    }

    expect(state.stats.minedOre).toBe(1);
    expect(beltHasItem(state, keyOf(2, 3))).toBe(true);
    expect(state.items.get(keyOf(2, 3))[0].type).toBe(ORE);
  });

  it('moves belt items along a straight line into the assembler buffer', () => {
    const state = chainState();

    // 20 ticks: miner 产出 4 个矿石，最慢也要进入 2、3 号传送带；
    // 更长步数用于观察物品一路进入组装机缓冲。
    for (let i = 0; i < 60; i += 1) {
      tick(state);
    }

    expect(state.stats.minedOre).toBeGreaterThanOrEqual(8);
    expect(state.grid.get(keyOf(6, 3)).oreBuffer).toBeGreaterThan(0);
    expect(state.stats.lostItems).toBe(0);
  });

  it('assembles plates from buffered ore', () => {
    const state = chainState();

    for (let i = 0; i < 160; i += 1) {
      tick(state);
    }

    expect(state.stats.plates).toBeGreaterThanOrEqual(1);
    expect(state.stats.lostItems).toBe(0);
  });

  it('blocks a dead-end belt and counts lost items on removal', () => {
    const state = createFactoryState({
      chain: false,
      oreCells: [[1, 3]]
    });
    placeBuilding(state, MINER, keyOf(1, 3), 0);
    placeBuilding(state, BELT, keyOf(2, 3), 0);

    for (let i = 0; i < 20; i += 1) {
      tick(state);
    }
    expect(state.stats.lostItems).toBe(0);
    expect(state.items.get(keyOf(2, 3))[0].progress).toBeLessThan(1);

    removeBuilding(state, keyOf(2, 3));
    expect(state.stats.lostItems).toBe(1);
    expect(beltHasItem(state, keyOf(2, 3))).toBe(false);
  });

  it('keeps counts consistent after removing buildings', () => {
    const state = chainState();

    removeBuilding(state, keyOf(2, 3));
    removeBuilding(state, keyOf(6, 3));

    expect(state.beltCount).toBe(3);
    expect(state.assemblerCount).toBe(0);
    expect(state.grid.get(keyOf(2, 3))).toBeUndefined();
  });

  it('allows rebuild after clearing manually', () => {
    const state = createFactoryState();

    buildDefaultChain(state);
    state.grid.clear();
    state.minerCount = 0;
    state.beltCount = 0;
    state.assemblerCount = 0;
    state.items.clear();
    buildDefaultChain(state);

    expect(state.minerCount).toBe(1);
    expect(state.beltCount).toBe(4);
    expect(state.assemblerCount).toBe(1);
  });
});
