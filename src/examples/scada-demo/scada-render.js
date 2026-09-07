import * as THREE from 'three';
import { DEVICE_DEFS, PIPE_DEFS } from './scada-state.js';

const COLORS = Object.freeze({
  activeFlow: 0x7dd3fc,
  alarmRed: 0xef4444,
  floor: 0x0b1220,
  grid: 0x1e293b,
  gridCenter: 0x334155,
  pad: 0x1e293b,
  pipe: 0x475569,
  pumpFault: 0xef4444,
  pumpRun: 0x22c55e,
  pumpStop: 0x94a3b8,
  tankGlass: 0x94a3b8,
  water: 0x38bdf8,
  waterLow: 0xf59e0b
});

export function createScadaEnvironment(state) {
  const group = new THREE.Group();
  const size = Math.max(state.cols, state.rows);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: COLORS.floor, roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.03;
  group.add(floor);

  const grid = new THREE.GridHelper(size, size, COLORS.gridCenter, COLORS.grid);
  grid.position.y = 0;
  group.add(grid);

  DEVICE_DEFS.forEach((device) => {
    const { x, z } = deviceCenter(state, device.id);
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(device.type === 'tank' ? 2.25 : 1.4, 28),
      new THREE.MeshStandardMaterial({ color: COLORS.pad, roughness: 0.8 })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(x, 0.005, z);
    group.add(pad);
  });
  return group;
}

export function deviceCenter(state, deviceId) {
  const device = DEVICE_DEFS.find((entry) => entry.id === deviceId);
  return {
    x: (device?.col ?? 0) - (state.cols - 1) / 2,
    z: (device?.row ?? 0) - (state.rows - 1) / 2
  };
}

export function pickDevice(state, point) {
  let best = null;
  let bestDistance = Infinity;
  for (const device of DEVICE_DEFS) {
    const { x, z } = deviceCenter(state, device.id);
    const dx = point.x - x;
    const dz = point.z - z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance <= device.pickRadius && distance < bestDistance) {
      best = device.id;
      bestDistance = distance;
    }
  }
  return best;
}

export function syncScadaLayer(group, state) {
  clearGroup(group);
  PIPE_DEFS.forEach((pipe) => {
    group.add(pipeMesh(state, pipe));
  });
  DEVICE_DEFS.forEach((device) => {
    group.add(deviceMesh(state, device));
  });
}

export function createSelectMarker() {
  const marker = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      opacity: 0.22,
      transparent: true
    })
  );
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.012;
  marker.visible = false;
  return marker;
}

export function updateSelectMarker(marker, state, deviceId, selected) {
  if (!deviceId) {
    marker.visible = false;
    return;
  }
  const device = DEVICE_DEFS.find((entry) => entry.id === deviceId);
  const { x, z } = deviceCenter(state, deviceId);
  marker.position.x = x;
  marker.position.z = z;
  marker.scale.setScalar(device?.type === 'tank' ? 2.7 : 1.8);
  marker.material.color.setHex(selected ? 0x38bdf8 : 0xe2e8f0);
  marker.material.opacity = selected ? 0.5 : 0.22;
  marker.visible = true;
}

function pipeMesh(state, pipe) {
  const mesh = new THREE.Group();
  const from = deviceCenter(state, pipe.from);
  const to = deviceCenter(state, pipe.to);
  const fromEdge = edgeOffset(state, pipe.from);
  const toEdge = edgeOffset(state, pipe.to);
  const startX = from.x + Math.sign(to.x - from.x) * fromEdge;
  const endX = to.x - Math.sign(to.x - from.x) * toEdge;
  const length = Math.abs(endX - startX);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.16, length, 12),
    new THREE.MeshStandardMaterial({ color: COLORS.pipe, roughness: 0.5 })
  );
  body.rotation.z = Math.PI / 2;
  body.position.set((startX + endX) / 2, 0.55, from.z);
  mesh.add(body);

  const pump = state.pumps[pipe.flowDevice];
  if (!pump || pump.status !== 'run') {
    return mesh;
  }

  for (let i = 0; i < 7; i += 1) {
    const progress = (state.phase + i / 7) % 1;
    const x = startX + (endX - startX) * progress;
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      new THREE.MeshBasicMaterial({ color: COLORS.activeFlow })
    );
    particle.position.set(x, 0.82, from.z);
    mesh.add(particle);
  }
  return mesh;
}

function deviceMesh(state, device) {
  const { x, z } = deviceCenter(state, device.id);
  if (device.type === 'tank') {
    return tankMesh(state, device, x, z);
  }
  return pumpMesh(state, device, x, z);
}

function tankMesh(state, device, x, z) {
  const group = new THREE.Group();
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.5, 4.6, 28),
    new THREE.MeshStandardMaterial({
      color: COLORS.tankGlass,
      opacity: 0.22,
      roughness: 0.15,
      transparent: true
    })
  );
  glass.position.y = 2.3;
  group.add(glass);

  const ratio = Math.min(1, Math.max(0, state.levels[device.id] / device.capacity));
  const waterHeight = Math.max(0.15, ratio * 3.9);
  const color = ratio <= 0.42 ? COLORS.waterLow : COLORS.water;
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.02, 1.26, waterHeight, 24),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.12,
      roughness: 0.2
    })
  );
  water.position.y = waterHeight / 2;
  group.add(water);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.38, 0.1, 10, 32),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 4.6;
  group.add(rim);
  group.position.set(x, 0, z);
  return group;
}

function pumpMesh(state, device, x, z) {
  const pump = state.pumps[device.id];
  const color =
    pump.status === 'run'
      ? COLORS.pumpRun
      : pump.status === 'fault'
        ? COLORS.pumpFault
        : COLORS.pumpStop;
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.5, 1.35, 1.5),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: pump.status === 'run' ? 0.22 : pump.status === 'fault' ? 0.18 : 0,
      roughness: 0.5
    })
  );
  body.position.y = 0.675;
  group.add(body);

  const motor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.85, 18),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.55 })
  );
  motor.position.set(0, 1.6, -0.95);
  group.add(motor);
  group.position.set(x, 0, z);
  return group;
}

function edgeOffset(state, deviceId) {
  const device = DEVICE_DEFS.find((entry) => entry.id === deviceId);
  return device?.type === 'tank' ? 2.3 : 1.25;
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
