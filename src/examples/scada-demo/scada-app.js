import * as THREE from 'three';
import { bindWindowEvent } from '../../core/document-events.js';
import { div, vButton, vStateNode, vText } from '../../index.js';
import { vThree } from '../../yoya.three.js';
import {
  DEVICE_DEFS,
  TICK_RATE,
  acknowledgeAlarm,
  activeAlarmCount,
  createScadaState,
  deviceSummary,
  recentAlarms,
  setPumpOverride,
  tick,
  triggerPumpFault
} from './scada-state.js';
import {
  createScadaEnvironment,
  createSelectMarker,
  pickDevice,
  syncScadaLayer,
  updateSelectMarker
} from './scada-render.js';

const START_VIEW = Object.freeze({ pitch: -0.08, x: -7.5, y: 2.2, yaw: -0.62, z: 7 });
const WALK_SPEED = 5;
const RUN_SPEED = 9.5;
const MIN_VIEW_Y = 0.8;
const MAX_VIEW_Y = 80;

function createDeltaTimer(threeLib) {
  if (typeof threeLib.Timer === 'function') {
    const timer = new threeLib.Timer();
    return {
      dispose() {
        timer.dispose?.();
      },
      getDelta() {
        timer.update();
        return timer.getDelta();
      }
    };
  }
  const clock = new threeLib.Clock();
  return {
    dispose() {
      clock.stop?.();
    },
    getDelta() {
      return clock.getDelta();
    }
  };
}

export function ScadaTwinStandalone() {
  let rootNode = null;
  let state = createScadaState();
  let selectedDeviceId = null;
  let statsLastTick = -1;
  let lastAlarmKey = '';

  const runtime = {
    accumulator: 0,
    camera: null,
    canvas: null,
    cleanups: [],
    keys: new Set(),
    layerGroup: null,
    marker: null,
    pointer: { has: false, x: 0, y: 0 },
    pointerLocked: false,
    renderer: null,
    statusOpen: false,
    targetDeviceId: null,
    timer: null,
    view: { ...START_VIEW }
  };
  const deviceButtons = new Map();
  const ui = {
    alarmPanel: null,
    detailPanel: null,
    lockHint: null,
    reticleWrap: null,
    reticleText: null,
    statsPanel: null,
    statusWindow: null
  };

  function updateCamera() {
    const { camera, view } = runtime;
    if (!camera) {
      return;
    }
    camera.position.set(view.x, view.y, view.z);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = view.yaw;
    camera.rotation.x = view.pitch;
    camera.rotation.z = 0;
  }

  function updateDeviceButtons() {
    deviceButtons.forEach((button, id) => {
      button.attr('data-selected', id === selectedDeviceId ? 'true' : null);
    });
  }

  function updateMarker(hoveredId = null) {
    if (!runtime.marker) {
      return;
    }
    const key = hoveredId || selectedDeviceId;
    const selected = Boolean(key) && (!hoveredId || hoveredId === selectedDeviceId);
    updateSelectMarker(runtime.marker, state, key, selected);
  }

  function exitLock() {
    if (typeof document.exitPointerLock === 'function') {
      document.exitPointerLock();
    }
  }

  function canRequestLock() {
    return typeof runtime.canvas?.requestPointerLock === 'function';
  }

  function requestLock() {
    if (!canRequestLock()) {
      return;
    }
    try {
      const result = runtime.canvas.requestPointerLock();
      if (result && typeof result.catch === 'function') {
        result.catch(() => updateLockHint());
      }
    } catch {
      updateLockHint();
    }
  }

  function handleContextMenu(event) {
    event.preventDefault();
  }

  function centerPoint() {
    if (!runtime.camera) {
      return null;
    }
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), runtime.camera);
    const target = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return raycaster.ray.intersectPlane(plane, target) ? { x: target.x, z: target.z } : null;
  }

  function updateCenterTarget() {
    if (!runtime.camera || !runtime.marker || runtime.statusOpen) {
      return;
    }
    const point = centerPoint();
    const next = point ? pickDevice(state, point) : null;
    runtime.targetDeviceId = next;
    if (next && next !== selectedDeviceId) {
      selectedDeviceId = next;
      updateDeviceButtons();
      refreshHud(true);
    }
    updateMarker();
    const device = next ? DEVICE_DEFS.find((entry) => entry.id === next) : null;
    ui.reticleText?.textContent(device ? `${device.id} ${device.name}` : '—');
  }

  function focusDevice(deviceId) {
    const device = DEVICE_DEFS.find((entry) => entry.id === deviceId);
    if (!device) {
      return;
    }
    selectedDeviceId = deviceId;
    updateDeviceButtons();
    updateMarker();
    refreshHud(true);
    const targetX = device.col - (state.cols - 1) / 2;
    const targetZ = device.row - (state.rows - 1) / 2;
    const dx = targetX - runtime.view.x;
    const dz = targetZ - runtime.view.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.01) {
      return;
    }
    runtime.view.yaw = Math.atan2(-dx, -dz);
    runtime.view.pitch = clamp(-Math.atan2(Math.max(runtime.view.y - 1, 0.2), distance), -1.2, 1.2);
    updateCamera();
  }

  function handleClick() {
    if (runtime.camera) {
      if (!runtime.pointerLocked && canRequestLock()) {
        requestLock();
        return;
      }
      updateCenterTarget();
    }
  }

  function handleCanvasMove(event) {
    if (runtime.statusOpen) {
      return;
    }
    if (runtime.pointerLocked) {
      runtime.view.yaw -= event.movementX * 0.0022;
      runtime.view.pitch = clamp(runtime.view.pitch - event.movementY * 0.0022, -1.2, 1.2);
      updateCamera();
      updateCenterTarget();
      return;
    }
    const host = event.currentTarget;
    const rect = host.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }
    runtime.pointer = {
      has: true,
      x: ((event.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((event.clientY - rect.top) / rect.height) * 2 + 1
    };
  }

  function applyPointerSteering(delta) {
    if (runtime.pointerLocked || runtime.statusOpen || !runtime.pointer.has || !runtime.camera) {
      return;
    }
    const deadZone = 0.08;
    const x = runtime.pointer.x;
    const y = runtime.pointer.y;
    if (Math.abs(x) <= deadZone && Math.abs(y) <= deadZone) {
      return;
    }
    const steerX = Math.abs(x) > deadZone ? (x - Math.sign(x) * deadZone) / (1 - deadZone) : 0;
    const steerY = Math.abs(y) > deadZone ? (y - Math.sign(y) * deadZone) / (1 - deadZone) : 0;
    runtime.view.yaw -= steerX * 3.2 * delta;
    runtime.view.pitch = clamp(runtime.view.pitch + steerY * 2.2 * delta, -1.2, 1.2);
    updateCamera();
  }

  function toggleStatusWindow() {
    runtime.statusOpen = !runtime.statusOpen;
    if (runtime.statusOpen) {
      exitLock();
      runtime.pointer.has = false;
    }
    ui.statusWindow?.setState({ open: runtime.statusOpen });
    syncReticleVisibility();
    updateLockHint();
  }

  function handlePointerLockChange() {
    runtime.pointerLocked = runtime.canvas && document.pointerLockElement === runtime.canvas;
    if (!runtime.pointerLocked) {
      runtime.keys.clear();
      runtime.pointer.has = false;
    }
    syncReticleVisibility();
    updateLockHint();
    updateMarker();
    if (runtime.pointerLocked) {
      updateCenterTarget();
    }
  }

  function syncReticleVisibility() {
    if (!ui.reticleWrap) {
      return;
    }
    const visible = !runtime.statusOpen;
    ui.reticleWrap.style('display', visible ? '' : 'none');
    ui.reticleWrap.attr('data-visible', visible ? 'true' : 'false');
  }

  function updateLockHint() {
    if (!ui.lockHint) {
      return;
    }
    if (runtime.statusOpen) {
      ui.lockHint.textContent('状态窗口已打开：光标已释放 · Alt / Tab 关闭');
      return;
    }
    ui.lockHint.textContent(
      canRequestLock()
        ? '点击画面锁定光标（真 FPS）· 光标偏移持续转向 · WASD 飞行'
        : '取景器居中即准星 · 光标偏移持续转向 · WASD 飞行 · Alt/Tab 状态窗口'
    );
  }

  function handleKeyDown(event) {
    if (event.repeat) {
      return;
    }
    if (event.code === 'Tab' || event.code.startsWith('Alt')) {
      event.preventDefault();
      toggleStatusWindow();
      return;
    }
    if (event.code === 'Space' || event.code.startsWith('Arrow') || event.code === 'KeyV') {
      event.preventDefault();
    }
    runtime.keys.add(event.code);
    if (event.code.startsWith('Digit')) {
      const index = Number(event.code.slice(5)) - 1;
      if (DEVICE_DEFS[index]) {
        focusDevice(DEVICE_DEFS[index].id);
      }
      return;
    }
    if (event.code === 'KeyE') {
      togglePumpOverride();
    } else if (event.code === 'KeyR') {
      setOverride('auto');
    } else if (event.code === 'KeyF') {
      setOverride('fault');
    }
  }

  function handleKeyUp(event) {
    runtime.keys.delete(event.code);
  }

  function togglePumpOverride() {
    const id = selectedPumpId();
    if (!id) {
      return;
    }
    const pump = state.pumps[id];
    setPumpOverride(state, id, pump.override === 'run' ? 'stop' : 'run');
    refreshHud(true);
  }

  function setOverride(action) {
    const id = selectedPumpId();
    if (!id) {
      return;
    }
    if (action === 'fault') {
      triggerPumpFault(state, id);
    } else {
      setPumpOverride(state, id, action === 'run' ? 'run' : action === 'stop' ? 'stop' : null);
    }
    refreshHud(true);
  }

  function selectedPumpId() {
    const device = DEVICE_DEFS.find((entry) => entry.id === selectedDeviceId);
    return device?.type === 'pump' ? device.id : null;
  }

  function createStatusWindow() {
    return vStateNode({
      state: () => ({ open: false }),
      render(current) {
        return div((panel) => {
          panel.className('scada-status-window');
          panel.attr('data-open', current.open ? 'true' : 'false');
          if (!current.open) {
            panel.style({ display: 'none' });
            return;
          }
          panel.h3('状态窗口');
          panel.p('内容暂空 · 按 Alt 或 Tab 关闭');
        });
      }
    });
  }

  function createStatsPanel() {
    let alarmText = null;
    let flowText = null;
    let tank1Text = null;
    let tank2Text = null;

    return vStateNode({
      state: () => ({ alarms: 0, running: 0, tank1: 0, tank2: 0 }),
      render(current) {
        tank1Text = vText(`${current.tank1.toFixed(1)}%`);
        tank2Text = vText(`${current.tank2.toFixed(1)}%`);
        flowText = vText(String(current.running));
        alarmText = vText(String(current.alarms));
        return div((row) => {
          row.className('scada-stats');
          row.style({ display: 'flex', flexWrap: 'wrap', gap: '8px' });
          [
            ['T-101', tank1Text],
            ['T-102', tank2Text],
            ['运行泵', flowText],
            ['报警', alarmText]
          ].forEach(([label, text]) => {
            row.div((item) => {
              item.className('scada-stat');
              item.style({
                backdropFilter: 'blur(6px)',
                background: 'rgba(15, 23, 42, 0.72)',
                border: '1px solid rgba(148, 163, 184, 0.28)',
                borderRadius: '8px',
                color: '#e2e8f0',
                padding: '4px 10px'
              });
              item.strong(`${label} `);
              item.child(text);
            });
          });
        });
      },
      update(current) {
        tank1Text.textContent(`${current.tank1.toFixed(1)}%`);
        tank2Text.textContent(`${current.tank2.toFixed(1)}%`);
        flowText.textContent(String(current.running));
        alarmText.textContent(String(current.alarms));
      }
    });
  }

  function createDetailPanel() {
    let hintText = null;
    let idText = null;
    let modeText = null;
    let nameText = null;
    let statusText = null;
    let valueText = null;

    return vStateNode({
      state: () => ({
        hint: '选择设备后显示实时数据。',
        id: '—',
        mode: '—',
        name: '未选择设备',
        status: '—',
        value: '—'
      }),
      render(current) {
        idText = vText(current.id);
        nameText = vText(current.name);
        statusText = vText(current.status);
        valueText = vText(current.value);
        modeText = vText(current.mode);
        hintText = vText(current.hint);
        return div((panel) => {
          panel.className('scada-detail');
          panel.h3('设备详情');
          panel.p((line) => {
            line.strong('编号 ');
            line.child(idText);
          });
          panel.p((line) => {
            line.strong('名称 ');
            line.child(nameText);
          });
          panel.p((line) => {
            line.strong('状态 ');
            line.child(statusText);
          });
          panel.p((line) => {
            line.strong('实时值 ');
            line.child(valueText);
          });
          panel.p((line) => {
            line.strong('控制模式 ');
            line.child(modeText);
          });
          panel.p((line) => {
            line.className('scada-detail-hint');
            line.style({ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' });
            line.child(hintText);
          });
        });
      },
      update(current) {
        idText.textContent(current.id);
        nameText.textContent(current.name);
        statusText.textContent(current.status);
        valueText.textContent(current.value);
        modeText.textContent(current.mode);
        hintText.textContent(current.hint);
      }
    });
  }

  function createAlarmPanel(onAck) {
    return vStateNode({
      state: () => ({ alarms: [] }),
      render(current) {
        if (current.alarms.length === 0) {
          return div((panel) => {
            panel.className('scada-alarms');
            panel.p('暂无报警记录');
          });
        }
        return div((panel) => {
          panel.className('scada-alarms');
          current.alarms.forEach((alarm) => {
            panel.div((row) => {
              row.className(`scada-alarm scada-alarm--${alarm.severity}`);
              row.style({
                backdropFilter: 'blur(6px)',
                background:
                  alarm.severity === 'critical'
                    ? 'rgba(127, 29, 29, 0.75)'
                    : 'rgba(146, 64, 14, 0.72)',
                border:
                  alarm.severity === 'critical'
                    ? '1px solid rgba(248, 113, 113, 0.45)'
                    : '1px solid rgba(251, 191, 36, 0.4)',
                borderRadius: '8px',
                color: '#f8fafc',
                marginBottom: '6px',
                padding: '6px 8px'
              });
              row.p((line) => {
                line.strong(`#${alarm.id} ${alarm.deviceId} `);
                line.span(alarm.message);
              });
              row.p((line) => {
                line.style({ color: '#cbd5e1', fontSize: '12px', margin: 0 });
                line.span(
                  `${alarm.severity === 'critical' ? '严重' : '警告'} · T${alarm.raisedAt}` +
                    (alarm.active ? ' · 未恢复' : ' · 已恢复')
                );
              });
              if (alarm.active && !alarm.acked) {
                row.vButton('确认', (button) => {
                  button.on('click', () => onAck(alarm.id));
                });
              } else {
                row.span(alarm.acked ? '已确认' : '');
              }
            });
          });
        });
      }
    });
  }

  function refreshHud(force = false) {
    if (!force && state.tick === statsLastTick) {
      return;
    }
    statsLastTick = state.tick;
    const running = Object.values(state.pumps).filter((pump) => pump.status === 'run').length;
    ui.statsPanel?.setState({
      alarms: activeAlarmCount(state),
      running,
      tank1: state.levels['T-101'],
      tank2: state.levels['T-102']
    });

    const alarms = recentAlarms(state, 12);
    const key = alarms.map((alarm) => `${alarm.id}:${alarm.active}:${alarm.acked}`).join(',');
    if (force || key !== lastAlarmKey) {
      lastAlarmKey = key;
      ui.alarmPanel?.setState({ alarms });
    }
    refreshDetail();
  }

  function refreshDetail() {
    const panelState = {
      hint: '',
      id: '—',
      mode: '—',
      name: '未选择设备',
      status: '—',
      value: '—'
    };
    const summary = selectedDeviceId ? deviceSummary(state, selectedDeviceId) : null;
    if (summary) {
      panelState.id = summary.id;
      panelState.name = summary.name;
      if (summary.type === 'tank') {
        panelState.status = tankStatusText(summary.status);
        panelState.value = `${summary.level.toFixed(1)}%`;
        panelState.mode = '自动';
        panelState.hint = '罐体仅展示液位；E/R/F 只作用于泵。';
      } else {
        panelState.status = pumpStatusText(summary.status);
        panelState.value = `${summary.flow.toFixed(1)} m³/h`;
        panelState.mode =
          summary.override === null ? '自动' : summary.override === 'run' ? '手动运行' : '手动停止';
        panelState.hint = '快捷键：E 启停 · R 恢复自动 · F 触发故障';
      }
    } else {
      panelState.hint = '按 1-4 选择设备，或走进后左键点击。';
    }
    ui.detailPanel?.setState(panelState);
  }

  function ackAlarm(alarmId) {
    acknowledgeAlarm(state, alarmId);
    refreshHud(true);
  }

  function movePlayer(delta) {
    if (runtime.statusOpen) {
      return;
    }
    const keys = runtime.keys;
    const speed = keys.has('ShiftLeft') || keys.has('ShiftRight') ? RUN_SPEED : WALK_SPEED;
    let forward = 0;
    let strafe = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) {
      forward += 1;
    }
    if (keys.has('KeyS') || keys.has('ArrowDown')) {
      forward -= 1;
    }
    if (keys.has('KeyA') || keys.has('ArrowLeft')) {
      strafe -= 1;
    }
    if (keys.has('KeyD') || keys.has('ArrowRight')) {
      strafe += 1;
    }
    const vertical = (keys.has('Space') ? 1 : 0) - (keys.has('KeyV') ? 1 : 0);
    if (forward === 0 && strafe === 0 && vertical === 0) {
      return;
    }

    const yaw = runtime.view.yaw;
    const pitch = runtime.view.pitch;
    const cosPitch = Math.cos(pitch);
    const forwardX = -Math.sin(yaw) * cosPitch;
    const forwardY = Math.sin(pitch);
    const forwardZ = -Math.cos(yaw) * cosPitch;
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const length = Math.hypot(forward, strafe) || 1;
    runtime.view.x += ((forwardX * forward + rightX * strafe) / length) * speed * delta;
    runtime.view.y += ((forwardY * forward) / length) * speed * delta;
    runtime.view.z += ((forwardZ * forward + rightZ * strafe) / length) * speed * delta;
    runtime.view.y = clamp(runtime.view.y + vertical * speed * 1.5 * delta, MIN_VIEW_Y, MAX_VIEW_Y);
    runtime.view.x = clamp(runtime.view.x, -40, 40);
    runtime.view.z = clamp(runtime.view.z, -40, 40);
    updateCamera();
  }

  function bindWindowInputs() {
    runtime.cleanups.push(bindWindowEvent('keydown', handleKeyDown));
    runtime.cleanups.push(bindWindowEvent('keyup', handleKeyUp));
    runtime.cleanups.push(bindWindowEvent('pointerlockchange', handlePointerLockChange));
  }

  function initRuntime(api) {
    const { camera, renderer, scene, threeLib: lib } = api;
    runtime.camera = camera;
    runtime.canvas = renderer.domElement;
    runtime.renderer = renderer;
    runtime.scene = scene;

    camera.fov = 70;
    camera.updateProjectionMatrix();
    updateCamera();
    scene.background = new lib.Color(0x0b1220);
    scene.add(new lib.AmbientLight(0xffffff, 1.35));
    const light = new lib.DirectionalLight(0xffffff, 2.4);
    light.position.set(14, 24, 8);
    scene.add(light);

    runtime.layerGroup = new lib.Group();
    scene.add(runtime.layerGroup);
    scene.add(createScadaEnvironment(state));
    runtime.marker = createSelectMarker();
    scene.add(runtime.marker);
    runtime.timer = createDeltaTimer(lib);
    bindWindowInputs();
    handlePointerLockChange();
    syncScadaLayer(runtime.layerGroup, state);
    refreshHud(true);
  }

  function frameTick() {
    if (!runtime.timer || !runtime.layerGroup) {
      return;
    }
    const delta = Math.min(runtime.timer.getDelta(), 0.25);
    movePlayer(delta);
    applyPointerSteering(delta);
    updateCenterTarget();
    runtime.accumulator += delta;
    const step = 1 / TICK_RATE;
    if (runtime.accumulator >= step) {
      while (runtime.accumulator >= step) {
        tick(state);
        runtime.accumulator -= step;
      }
      syncScadaLayer(runtime.layerGroup, state);
      refreshHud();
    }
  }

  const threeNode = vThree((three) => {
    three.threeLib(THREE);
    three.height('100%');
    three.rendererOptions({
      antialias: true,
      powerPreference: 'high-performance'
    });
    three.onReady(initRuntime);
    three.onFrame(frameTick);
  });
  threeNode.on('click', handleClick);
  threeNode.on('contextmenu', handleContextMenu);
  threeNode.on('pointerleave', () => {
    runtime.pointer.has = false;
  });
  threeNode.on('pointermove', handleCanvasMove);

  return {
    destroy() {
      runtime.timer?.dispose?.();
      runtime.cleanups.forEach((unbind) => unbind());
      runtime.cleanups = [];
      exitLock();
      rootNode?.destroy();
      rootNode = null;
    },
    render() {
      ui.statsPanel = createStatsPanel();
      ui.detailPanel = createDetailPanel();
      ui.alarmPanel = createAlarmPanel(ackAlarm);
      ui.lockHint = vText('取景器居中即准星 · 移动鼠标转向 · Alt/Tab 状态窗口');
      ui.reticleText = vText('—');
      ui.statusWindow = createStatusWindow();

      rootNode = div((root) => {
        root.className('scada-twin');
        root.style({
          background: '#0b1220',
          height: '100vh',
          left: 0,
          overflow: 'hidden',
          position: 'fixed',
          top: 0,
          width: '100vw'
        });
        root.div((viewport) => {
          viewport.className('scada-viewport');
          viewport.style({
            bottom: 0,
            left: 0,
            position: 'absolute',
            right: 0,
            top: 0
          });
          viewport.child(threeNode);
        });

        root.div((hud) => {
          hud.className('scada-hud');
          hud.style({
            bottom: 0,
            left: 0,
            pointerEvents: 'none',
            position: 'absolute',
            right: 0,
            top: 0
          });
          hud.div((topLeft) => {
            topLeft.className('hud-panel scada-top-left');
            topLeft.style({
              left: '16px',
              position: 'absolute',
              top: '14px'
            });
            topLeft.h1('工业 SCADA');
            topLeft.p('假数据数字孪生 · 第一人称厂区巡查');
            topLeft.p((hint) => {
              hint.className('scada-lock-hint');
              hint.style({ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' });
              hint.child(ui.lockHint);
            });
          });

          hud.div((statsBox) => {
            statsBox.className('hud-panel scada-top-right');
            statsBox.style({ position: 'absolute', right: '16px', top: '14px' });
            statsBox.child(ui.statsPanel);
          });

          hud.div((deviceBox) => {
            deviceBox.className('hud-panel scada-device-hud');
            deviceBox.style({
              left: '16px',
              position: 'absolute',
              top: '150px',
              width: '210px'
            });
            deviceBox.h3('设备');
            deviceBox.div((list) => {
              list.style({ display: 'grid', gap: '6px' });
              DEVICE_DEFS.forEach((device, index) => {
                const button = vButton(`${index + 1} ${device.id} ${device.name}`, (entry) => {
                  entry.on('click', () => focusDevice(device.id));
                });
                deviceButtons.set(device.id, button);
                list.child(button);
              });
            });
          });

          hud.div((alarmBox) => {
            alarmBox.className('hud-panel scada-alarm-hud');
            alarmBox.style({
              maxHeight: '300px',
              overflow: 'auto',
              position: 'absolute',
              right: '16px',
              top: '120px',
              width: '330px'
            });
            alarmBox.h3('报警记录');
            alarmBox.child(ui.alarmPanel);
          });

          hud.div((bottomLeft) => {
            bottomLeft.className('hud-panel scada-bottom-left');
            bottomLeft.style({
              bottom: '16px',
              left: '16px',
              position: 'absolute',
              width: '300px'
            });
            bottomLeft.child(ui.detailPanel);
            bottomLeft.div((controls) => {
              controls.className('scada-controls');
              controls.style({ display: 'grid', gap: '6px', gridTemplateColumns: '1fr 1fr' });
              [
                ['E 启停', 'run'],
                ['R 自动', 'auto'],
                ['F 故障', 'fault']
              ].forEach(([label, action]) => {
                controls.vButton(label, (button) => {
                  button.on('click', () => setOverride(action));
                });
              });
            });
          });

          hud.div((reticleWrap) => {
            reticleWrap.className('scada-reticle-wrap');
            reticleWrap.style({
              left: '50%',
              pointerEvents: 'none',
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            });
            ui.reticleWrap = reticleWrap;
            syncReticleVisibility();
            reticleWrap.div((reticle) => {
              reticle.className('scada-reticle');
            });
            reticleWrap.div((label) => {
              label.className('scada-reticle-label');
              label.child(ui.reticleText);
            });
          });

          hud.div((bottomCenter) => {
            bottomCenter.className('hud-panel scada-bottom-center');
            bottomCenter.style({
              bottom: '16px',
              left: '50%',
              position: 'absolute',
              textAlign: 'center',
              transform: 'translateX(-50%)',
              whiteSpace: 'nowrap'
            });
            bottomCenter.p('WASD 水平移动 · 空格上升 · V 下降 · Shift 加速 · 1-4 选择设备');
          });

          hud.child(ui.statusWindow);
        });
      });
      return rootNode;
    }
  };
}

function pumpStatusText(status) {
  return status === 'run' ? '运行中' : status === 'fault' ? '故障' : '已停止';
}

function tankStatusText(status) {
  return status === 'low' ? '偏低' : status === 'high' ? '偏高' : '正常';
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
