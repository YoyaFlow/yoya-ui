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

export function createGhostPreview() {
  const group = new THREE.Group();
  group.visible = false;
  return group;
}

export function updateGhostPreview(group, state, key, type, direction, valid) {
  clearGroup(group);
  if (!key || !type) {
    group.visible = false;
    return;
  }

  const { x, z } = cellCenter(state, key);
  const color = valid ? 0x22c55e : 0xef4444;
  const material = new THREE.MeshBasicMaterial({
    color,
    opacity: 0.48,
    transparent: true
  });
  let height = 0.5;
  if (type === ASSEMBLER) {
    height = 0.72;
  } else if (type === BELT) {
    height = 0.09;
  }
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.74, height, 0.74), material);
  base.position.y = height / 2;
  group.add(base);

  const vector = DIRECTIONS[direction] ?? DIRECTIONS[0];
  const arrow = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.22), material);
  arrow.position.set(
    vector.dx * 0.3,
    type === BELT ? 0.12 : base.position.y + 0.12,
    vector.dz * 0.3
  );
  group.add(arrow);
  group.position.set(x, 0, z);
  group.visible = true;
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
      new THREE.BoxGeometry(0.72, 0.4, 0.72),
      new THREE.MeshStandardMaterial({ color: COLORS.miner, roughness: 0.6 })
    );
    base.position.y = 0.25;
    const drill = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.18, 0.42, 12),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 })
    );
    drill.position.y = 0.62;
    mesh.add(drill);
  } else if (record.type === ASSEMBLER) {
    base = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.72, 0.86),
      new THREE.MeshStandardMaterial({ color: COLORS.assembler, roughness: 0.45 })
    );
    base.position.y = 0.36;
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.08, 0.46),
      new THREE.MeshStandardMaterial({ color: 0xbfdbfe, roughness: 0.35 })
    );
    roof.position.y = 0.78;
    mesh.add(roof);
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
