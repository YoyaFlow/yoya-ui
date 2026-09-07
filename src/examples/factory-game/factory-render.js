import * as THREE from 'three';
import { ASSEMBLER, BELT, DIRECTIONS, MINER, ORE, PLATE, parseKey } from './factory-state.js';

const COLORS = Object.freeze({
  assembler: 0x2563eb,
  belt: 0x334155,
  grid: 0x475569,
  gridCenter: 0x64748b,
  hoverInvalid: 0xef4444,
  hoverValid: 0x22c55e,
  miner: 0x94a3b8,
  nose: 0xfacc15,
  oreFloor: 0x78350f,
  plate: 0x93c5fd,
  ironOre: 0xfb923c,
  floor: 0x111827,
  floorEdge: 0x1e293b
});

export function createFactoryEnvironment(state) {
  const group = new THREE.Group();
  const size = Math.max(state.cols, state.rows);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: COLORS.floor })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.02;
  group.add(floor);

  const edge = new THREE.Mesh(
    new THREE.PlaneGeometry(size + 0.16, size + 0.16),
    new THREE.MeshStandardMaterial({ color: COLORS.floorEdge })
  );
  edge.rotation.x = -Math.PI / 2;
  edge.position.y = -0.04;
  group.add(edge);

  const grid = new THREE.GridHelper(size, size, COLORS.gridCenter, COLORS.grid);
  grid.position.y = 0;
  group.add(grid);

  for (const oreKey of state.ore) {
    const marker = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 0.92),
      new THREE.MeshStandardMaterial({ color: COLORS.oreFloor })
    );
    marker.rotation.x = -Math.PI / 2;
    const { x, z } = cellCenter(state, oreKey);
    marker.position.set(x, 0.005, z);
    group.add(marker);
  }

  return group;
}

export function createHoverMarker() {
  const marker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.94, 0.94),
    new THREE.MeshBasicMaterial({
      color: COLORS.hoverValid,
      opacity: 0.35,
      transparent: true
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.012;
  marker.visible = false;
  return marker;
}

export function showHover(marker, state, key, valid) {
  if (!key) {
    marker.visible = false;
    return;
  }

  const { x, z } = cellCenter(state, key);
  marker.position.x = x;
  marker.position.z = z;
  marker.material.color.setHex(valid ? COLORS.hoverValid : COLORS.hoverInvalid);
  marker.visible = true;
}

export function cellCenter(state, key) {
  const { col, row } = parseKey(key);
  return {
    x: col - (state.cols - 1) / 2,
    z: row - (state.rows - 1) / 2
  };
}

export function worldToCell(state, x, z) {
  const col = Math.floor(x + state.cols / 2);
  const row = Math.floor(z + state.rows / 2);
  if (col < 0 || col >= state.cols || row < 0 || row >= state.rows) {
    return null;
  }
  return { col, row };
}

export function syncFactoryLayer(group, state) {
  clearGroup(group);

  for (const [key, record] of state.grid) {
    group.add(buildingMesh(state, key, record));
  }
  for (const [key, items] of state.items) {
    const record = state.grid.get(key);
    if (!record || record.type !== BELT) {
      continue;
    }
    items.forEach((item) => group.add(itemMesh(state, key, record.direction, item.type)));
  }
}

function buildingMesh(state, key, record) {
  const { x, z } = cellCenter(state, key);
  const mesh = new THREE.Group();
  let base;

  if (record.type === MINER) {
    base = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.5, 0.72),
      new THREE.MeshStandardMaterial({ color: COLORS.miner, roughness: 0.6 })
    );
    base.position.y = 0.25;
  } else if (record.type === ASSEMBLER) {
    base = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.72, 0.86),
      new THREE.MeshStandardMaterial({ color: COLORS.assembler, roughness: 0.45 })
    );
    base.position.y = 0.36;
  } else {
    base = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.09, 0.72),
      new THREE.MeshStandardMaterial({ color: COLORS.belt, roughness: 0.7 })
    );
    base.position.y = 0.045;
  }

  mesh.add(base);

  const vector = DIRECTIONS[record.direction] ?? DIRECTIONS[0];
  const nose = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.14, 0.2),
    new THREE.MeshStandardMaterial({
      color: COLORS.nose,
      emissive: COLORS.nose,
      emissiveIntensity: 0.25
    })
  );
  nose.position.set(
    vector.dx * 0.3,
    record.type === BELT ? 0.11 : base.position.y + 0.15,
    vector.dz * 0.3
  );
  mesh.add(nose);
  mesh.position.set(x, 0, z);
  return mesh;
}

function itemMesh(state, key, direction, type) {
  const { x, z } = cellCenter(state, key);
  const vector = DIRECTIONS[direction] ?? DIRECTIONS[0];
  const item = state.items.get(key)[0];
  const offset = (item.progress - 0.5) * 0.7;
  const color = type === ORE ? COLORS.ironOre : type === PLATE ? COLORS.plate : 0xffffff;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(type === PLATE ? 0.12 : 0.11, 12, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.4 })
  );
  mesh.position.set(x + vector.dx * offset, 0.2, z + vector.dz * offset);
  return mesh;
}

function clearGroup(group) {
  for (const child of [...group.children]) {
    disposeObject(child);
    group.remove(child);
  }
}

function disposeObject(object) {
  if (object.children?.length > 0) {
    object.children.forEach((child) => disposeObject(child));
  }
  if (object.geometry) {
    object.geometry.dispose();
  }
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach((material) => material.dispose());
    } else {
      object.material.dispose();
    }
  }
}
