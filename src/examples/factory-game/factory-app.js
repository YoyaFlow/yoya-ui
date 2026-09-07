import * as THREE from 'three';
import { div, vButton, vStateNode, vText } from '../../index.js';
import { vThree } from '../../yoya.three.js';
import {
  ASSEMBLER,
  BELT,
  DIRECTIONS,
  MINER,
  TICK_RATE,
  canPlace,
  createFactoryState,
  keyOf,
  placeBuilding,
  removeBuilding,
  tick
} from './factory-state.js';
import {
  createFactoryEnvironment,
  createGhostPreview,
  syncFactoryLayer,
  updateGhostPreview,
  worldToCell
} from './factory-render.js';

const INITIAL_CAMERA = Object.freeze({
  azimuth: Math.PI / 4,
  polar: Math.PI / 3.2,
  radius: 17
});

const TOOL_OPTIONS = Object.freeze([
  { key: BELT, label: '传送带' },
  { key: MINER, label: '矿机' },
  { key: ASSEMBLER, label: '组装机' },
  { key: 'remove', label: '拆除' }
]);

export function FactoryGameStandalone() {
  let state = createFactoryState({ chain: true });
  let statsLastTick = -1;

  const tool = { direction: 0, name: BELT };
  const runtime = {
    accumulator: 0,
    camera: null,
    cameraState: { ...INITIAL_CAMERA, target: { x: 0, y: 0, z: 0 } },
    clock: null,
    drag: null,
    ghost: null,
    hoverCellKey: null,
    hoverValid: false,
    layerGroup: null,
    renderer: null,
    scene: null
  };
  const toolButtons = new Map();
  const ui = { directionText: null, selectionText: null, stats: null };

  function selectTool(name) {
    tool.name = name;
    toolButtons.forEach((button, key) => {
      button.attr('data-tool-active', key === name ? 'true' : null);
    });
    ui.selectionText?.textContent(toolLabel(name));
    refreshGhost();
  }

  function toolLabel(name) {
    if (name === 'remove') {
      return '当前工具：拆除';
    }
    const option = TOOL_OPTIONS.find((entry) => entry.key === name);
    return option ? `当前工具：${option.label}` : '';
  }

  function rotateDirection() {
    tool.direction = (tool.direction + 1) % DIRECTIONS.length;
    ui.directionText?.textContent(`方向 ${DIRECTIONS[tool.direction].label}`);
    refreshGhost();
  }

  function resetCamera() {
    Object.assign(runtime.cameraState, INITIAL_CAMERA);
    updateCamera();
  }

  function createStatsPanel() {
    let lostText = null;
    let oreText = null;
    let plateText = null;
    let tickText = null;

    return vStateNode({
      state: () => ({ lostItems: 0, minedOre: 0, plates: 0, tick: 0 }),
      render(current) {
        oreText = vText(String(current.minedOre));
        plateText = vText(String(current.plates));
        lostText = vText(String(current.lostItems));
        tickText = vText(String(current.tick));

        return div((row) => {
          row.className('factory-stats');
          row.style({
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '10px 0'
          });
          [
            ['矿石', oreText],
            ['组装件', plateText],
            ['流失', lostText],
            ['tick', tickText]
          ].forEach(([label, text]) => {
            row.div((item) => {
              item.style({
                background: 'var(--yoya-color-surface, #ffffff)',
                border: '1px solid var(--yoya-color-border-faint, #e2e8f0)',
                borderRadius: '8px',
                padding: '4px 12px'
              });
              item.strong(`${label} `);
              item.child(text);
            });
          });
        });
      },
      update(current) {
        oreText.textContent(String(current.minedOre));
        plateText.textContent(String(current.plates));
        lostText.textContent(String(current.lostItems));
        tickText.textContent(String(current.tick));
      }
    });
  }

  function refreshStats(force = false) {
    if (!force && state.tick === statsLastTick) {
      return;
    }
    statsLastTick = state.tick;
    ui.stats?.setState({
      lostItems: state.stats.lostItems,
      minedOre: state.stats.minedOre,
      plates: state.stats.plates,
      tick: state.tick
    });
  }

  function resetFactory() {
    state = createFactoryState({ chain: true });
    statsLastTick = -1;
    runtime.accumulator = 0;
    runtime.hoverCellKey = null;
    runtime.hoverValid = false;
    if (runtime.ghost) {
      updateGhostPreview(runtime.ghost, state, null, null, tool.direction, false);
    }
    if (runtime.layerGroup) {
      syncFactoryLayer(runtime.layerGroup, state);
    }
    refreshStats(true);
  }

  function pointerWorld(event) {
    const host = event.currentTarget;
    const rect = host.getBoundingClientRect();
    const lib = THREE;
    const pointer = new lib.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new lib.Raycaster();
    raycaster.setFromCamera(pointer, runtime.camera);
    const target = new lib.Vector3();
    const plane = new lib.Plane(new lib.Vector3(0, 1, 0), 0);
    return raycaster.ray.intersectPlane(plane, target) ? { x: target.x, z: target.z } : null;
  }

  function cellAt(event) {
    if (!runtime.camera) {
      return null;
    }
    const point = pointerWorld(event);
    return point ? worldToCell(state, point.x, point.z) : null;
  }

  function keyAt(event) {
    const cell = cellAt(event);
    return cell ? keyOf(cell.col, cell.row) : null;
  }

  function validityFor(key) {
    if (!key) {
      return false;
    }
    return tool.name === 'remove' ? state.grid.has(key) : canPlace(state, tool.name, key);
  }

  function refreshGhost() {
    if (!runtime.ghost) {
      return;
    }
    const key = runtime.hoverCellKey;
    const type = tool.name === 'remove' ? null : tool.name;
    updateGhostPreview(runtime.ghost, state, key, type, tool.direction, validityFor(key));
  }

  function updateHover(event) {
    const key = keyAt(event);
    runtime.hoverCellKey = key;
    runtime.hoverValid = validityFor(key);
    refreshGhost();
  }

  function clearHover() {
    runtime.hoverCellKey = null;
    runtime.hoverValid = false;
    refreshGhost();
  }

  function handleClick(event) {
    const key = keyAt(event);
    if (!key) {
      return;
    }

    let changed = false;
    if (tool.name === 'remove') {
      changed = removeBuilding(state, key);
    } else if (canPlace(state, tool.name, key)) {
      changed = placeBuilding(state, tool.name, key, tool.direction);
    }
    if (changed && runtime.layerGroup) {
      syncFactoryLayer(runtime.layerGroup, state);
      refreshStats(true);
      refreshGhost();
    }
  }

  function handleContextMenu(event) {
    event.preventDefault();
  }

  function startOrbit(event) {
    if (event.button === 1 || event.button === 2) {
      runtime.drag = { button: event.button, x: event.clientX, y: event.clientY };
      event.preventDefault();
    }
  }

  function moveOrbit(event) {
    updateHover(event);
    if (!runtime.drag) {
      return;
    }

    const dx = event.clientX - runtime.drag.x;
    const dy = event.clientY - runtime.drag.y;
    runtime.drag.x = event.clientX;
    runtime.drag.y = event.clientY;
    runtime.cameraState.azimuth += dx * 0.008;
    runtime.cameraState.polar = clamp(runtime.cameraState.polar - dy * 0.006, 0.35, 1.45);
    updateCamera();
  }

  function endOrbit() {
    runtime.drag = null;
  }

  function zoomCamera(event) {
    event.preventDefault();
    const factor = Math.exp(event.deltaY * 0.0012);
    runtime.cameraState.radius = clamp(runtime.cameraState.radius * factor, 7, 34);
    updateCamera();
  }

  function updateCamera() {
    const { camera, cameraState } = runtime;
    if (!camera) {
      return;
    }
    const { azimuth, polar, radius, target } = cameraState;
    const sinPolar = Math.sin(polar);
    camera.position.set(
      target.x + radius * sinPolar * Math.sin(azimuth),
      target.y + radius * Math.cos(polar),
      target.z + radius * sinPolar * Math.cos(azimuth)
    );
    camera.lookAt(target.x, target.y, target.z);
  }

  function initRuntime(api) {
    const { camera, renderer, scene, threeLib: lib } = api;
    runtime.camera = camera;
    runtime.renderer = renderer;
    runtime.scene = scene;

    camera.fov = 50;
    camera.updateProjectionMatrix();
    updateCamera();
    scene.background = new lib.Color(0x0b1220);
    scene.add(new lib.AmbientLight(0xffffff, 1.1));
    const light = new lib.DirectionalLight(0xffffff, 2.6);
    light.position.set(8, 16, 7);
    scene.add(light);

    runtime.layerGroup = new lib.Group();
    scene.add(runtime.layerGroup);
    scene.add(createFactoryEnvironment(state));
    runtime.ghost = createGhostPreview();
    scene.add(runtime.ghost);
    runtime.clock = new lib.Clock();
    syncFactoryLayer(runtime.layerGroup, state);
    refreshStats(true);
  }

  function frameTick() {
    if (!runtime.clock || !runtime.layerGroup) {
      return;
    }

    const delta = Math.min(runtime.clock.getDelta(), 0.25);
    runtime.accumulator += delta;
    const step = 1 / TICK_RATE;
    if (runtime.accumulator < step) {
      return;
    }

    while (runtime.accumulator >= step) {
      tick(state);
      runtime.accumulator -= step;
    }
    syncFactoryLayer(runtime.layerGroup, state);
    refreshStats();
  }

  const threeNode = vThree((three) => {
    three.threeLib(THREE);
    three.height('460px');
    three.rendererOptions({
      antialias: true,
      powerPreference: 'high-performance'
    });
    three.onReady(initRuntime);
    three.onFrame(frameTick);
  });
  threeNode.on('click', handleClick);
  threeNode.on('pointercancel', endOrbit);
  threeNode.on('pointerdown', startOrbit);
  threeNode.on('contextmenu', handleContextMenu);
  threeNode.on('pointerleave', () => {
    clearHover();
    endOrbit();
  });
  threeNode.on('pointermove', moveOrbit);
  threeNode.on('pointerup', endOrbit);
  threeNode.on('wheel', zoomCamera);

  return {
    render() {
      const stats = createStatsPanel();
      ui.stats = stats;
      ui.directionText = vText(`方向 ${DIRECTIONS[tool.direction].label}`);
      ui.selectionText = vText(toolLabel(tool.name));

      return div((root) => {
        root.className('factory-game');
        root.style({ margin: '0 auto', maxWidth: '1080px', padding: '20px' });
        root.h1('工业自动化原型');
        root.p('矿机把矿石送上传送带，传送带把矿石送进组装机；组装机攒够两份矿石后开始合成。');

        root.div((toolbar) => {
          toolbar.className('factory-toolbar');
          toolbar.style({
            alignItems: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          });
          TOOL_OPTIONS.forEach((option) => {
            const button = vButton(option.label, (entry) => {
              entry.on('click', () => selectTool(option.key));
            });
            toolButtons.set(option.key, button);
            toolbar.child(button);
          });
          selectTool(tool.name);
          toolbar.vButton('旋转方向', (button) => {
            button.on('click', rotateDirection);
          });
          toolbar.vButton('清空重建', (button) => {
            button.on('click', resetFactory);
          });
          toolbar.vButton('重置视角', (button) => {
            button.on('click', resetCamera);
          });
          toolbar.div((meta) => {
            meta.style({ display: 'flex', gap: '16px', marginLeft: 'auto' });
            meta.span((text) => text.child(ui.selectionText));
            meta.span((text) => text.child(ui.directionText));
          });
        });

        root.child(stats);
        root.div((viewport) => {
          viewport.className('factory-viewport');
          viewport.style({
            background: '#0b1220',
            border: '1px solid var(--yoya-color-border, #cbd5e1)',
            borderRadius: '12px',
            overflow: 'hidden',
            position: 'relative'
          });
          viewport.child(threeNode);
        });

        root.p(
          '操作：左键按当前工具建造；右键拖动旋转视角、滚轮缩放；' +
            '矿机必须建在橙色矿点上；矿机/传送带用“旋转方向”调整输出侧。'
        );
      });
    }
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
