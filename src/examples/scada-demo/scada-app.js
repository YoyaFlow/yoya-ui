import * as THREE from 'three';
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

const INITIAL_CAMERA = Object.freeze({
  azimuth: Math.PI / 3,
  polar: Math.PI / 2.6,
  radius: 15
});

export function ScadaTwinStandalone() {
  let state = createScadaState();
  let selectedDeviceId = null;
  let statsLastTick = -1;
  let lastAlarmKey = '';

  const runtime = {
    accumulator: 0,
    camera: null,
    cameraState: { ...INITIAL_CAMERA, target: { x: 0, y: 0, z: 0 } },
    clock: null,
    drag: null,
    layerGroup: null,
    marker: null,
    renderer: null
  };
  const deviceButtons = new Map();
  const ui = { alarmPanel: null, detailPanel: null, statsPanel: null };

  function resetCamera() {
    Object.assign(runtime.cameraState, INITIAL_CAMERA);
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

  function resetSimulation() {
    state = createScadaState();
    selectedDeviceId = null;
    statsLastTick = -1;
    lastAlarmKey = '';
    runtime.accumulator = 0;
    updateDeviceButtons();
    updateMarker();
    if (runtime.layerGroup) {
      syncScadaLayer(runtime.layerGroup, state);
    }
    refreshHud(true);
  }

  function selectDevice(deviceId) {
    selectedDeviceId = deviceId;
    updateDeviceButtons();
    updateMarker();
    refreshHud(true);
  }

  function updateDeviceButtons() {
    deviceButtons.forEach((button, id) => {
      button.attr('data-selected', id === selectedDeviceId ? 'true' : null);
    });
  }

  function updateMarker() {
    if (runtime.marker) {
      updateSelectMarker(runtime.marker, state, selectedDeviceId, true);
    }
  }

  function pointerWorld(event) {
    const host = event.currentTarget;
    const rect = host.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, runtime.camera);
    const target = new THREE.Vector3();
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    return raycaster.ray.intersectPlane(plane, target) ? { x: target.x, z: target.z } : null;
  }

  function handleClick(event) {
    if (!runtime.camera) {
      return;
    }
    const point = pointerWorld(event);
    selectDevice(point ? pickDevice(state, point) : null);
  }

  function updateHover(event) {
    if (!runtime.marker || !runtime.camera) {
      return;
    }
    const point = pointerWorld(event);
    const hovered = point ? pickDevice(state, point) : null;
    updateSelectMarker(runtime.marker, state, hovered, hovered === selectedDeviceId);
  }

  function clearHover() {
    if (runtime.marker) {
      updateMarker();
    }
  }

  function handleContextMenu(event) {
    event.preventDefault();
  }

  function startOrbit(event) {
    if (event.button === 1 || event.button === 2) {
      runtime.drag = { x: event.clientX, y: event.clientY };
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
    runtime.cameraState.radius = clamp(runtime.cameraState.radius * factor, 8, 30);
    updateCamera();
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
          row.style({ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '8px 0' });
          [
            ['T-101 液位', tank1Text],
            ['T-102 液位', tank2Text],
            ['运行泵', flowText],
            ['活跃报警', alarmText]
          ].forEach(([label, text]) => {
            row.div((item) => {
              item.className('scada-stat');
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
        hint: '点击 3D 场景中的设备或左侧列表查看实时数据。',
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
          panel.style({ padding: '8px 2px' });
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
            line.style({ color: 'var(--yoya-color-text-muted, #5a6575)', fontSize: '13px' });
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
                background:
                  alarm.severity === 'critical'
                    ? 'var(--yoya-color-danger-subtle, #fef2f2)'
                    : 'var(--yoya-color-warning-subtle, #fffbeb)',
                border:
                  alarm.severity === 'critical'
                    ? '1px solid var(--yoya-color-danger-border, #fecaca)'
                    : '1px solid var(--yoya-color-warning-border, #fde68a)',
                borderRadius: '8px',
                marginBottom: '6px',
                padding: '6px 8px'
              });
              row.p((line) => {
                line.strong(`#${alarm.id} ${alarm.deviceId} `);
                line.span(alarm.message);
              });
              row.p((line) => {
                line.className('scada-alarm-meta');
                line.style({ color: 'var(--yoya-color-text-muted, #5a6575)', fontSize: '12px' });
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

    const alarms = recentAlarms(state, 14);
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
        panelState.hint = '罐体无手动控制，仅展示液位。';
      } else {
        panelState.status = pumpStatusText(summary.status);
        panelState.value = `${summary.flow.toFixed(1)} m³/h`;
        panelState.mode =
          summary.override === null ? '自动' : summary.override === 'run' ? '手动运行' : '手动停止';
        panelState.hint = '可在下方手动启停或触发故障。';
      }
    } else {
      panelState.hint = '点击 3D 场景中的设备或左侧列表查看实时数据。';
    }
    ui.detailPanel?.setState(panelState);
  }

  function runPumpAction(action) {
    const id = selectedDeviceId;
    const device = DEVICE_DEFS.find((entry) => entry.id === id);
    if (!device || device.type !== 'pump') {
      return;
    }
    if (action === 'fault') {
      triggerPumpFault(state, id);
    } else {
      setPumpOverride(state, id, action === 'run' ? 'run' : action === 'stop' ? 'stop' : null);
    }
    refreshHud(true);
  }

  function ackAlarm(alarmId) {
    acknowledgeAlarm(state, alarmId);
    refreshHud(true);
  }

  function initRuntime(api) {
    const { camera, renderer, scene, threeLib: lib } = api;
    runtime.camera = camera;
    runtime.renderer = renderer;
    runtime.scene = scene;

    camera.fov = 46;
    camera.updateProjectionMatrix();
    updateCamera();
    scene.background = new lib.Color(0x0b1220);
    scene.add(new lib.AmbientLight(0xffffff, 1.3));
    const light = new lib.DirectionalLight(0xffffff, 2.6);
    light.position.set(10, 18, 8);
    scene.add(light);

    runtime.layerGroup = new lib.Group();
    scene.add(runtime.layerGroup);
    scene.add(createScadaEnvironment(state));
    runtime.marker = createSelectMarker();
    scene.add(runtime.marker);
    runtime.clock = new lib.Clock();
    syncScadaLayer(runtime.layerGroup, state);
    refreshHud(true);
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
    syncScadaLayer(runtime.layerGroup, state);
    refreshHud();
  }

  const threeNode = vThree((three) => {
    three.threeLib(THREE);
    three.height('520px');
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
      ui.statsPanel = createStatsPanel();
      ui.detailPanel = createDetailPanel();
      ui.alarmPanel = createAlarmPanel(ackAlarm);

      return div((root) => {
        root.className('scada-twin');
        root.style({ margin: '0 auto', maxWidth: '1280px', padding: '20px' });
        root.h1('工业 SCADA · 数字孪生演示');
        root.p('假数据驱动：罐体液位、泵状态、管线流量与报警实时刷新。');
        root.child(ui.statsPanel);

        root.div((workspace) => {
          workspace.className('scada-workspace');
          workspace.style({ display: 'flex', gap: '14px' });
          workspace.div((viewport) => {
            viewport.className('scada-viewport');
            viewport.style({
              background: '#0b1220',
              border: '1px solid var(--yoya-color-border, #cbd5e1)',
              borderRadius: '12px',
              flex: '1 1 0',
              overflow: 'hidden',
              position: 'relative'
            });
            viewport.child(threeNode);
          });

          workspace.aside((panel) => {
            panel.className('scada-side');
            panel.style({ flex: '0 0 300px', minWidth: '0' });
            panel.h3('设备列表');
            panel.div((list) => {
              list.className('scada-device-list');
              list.style({ display: 'grid', gap: '6px', marginBottom: '8px' });
              DEVICE_DEFS.forEach((device) => {
                const button = vButton(`${device.id} ${device.name}`, (entry) => {
                  entry.on('click', () => selectDevice(device.id));
                });
                deviceButtons.set(device.id, button);
                list.child(button);
              });
            });
            panel.child(ui.detailPanel);
            panel.div((controls) => {
              controls.className('scada-controls');
              controls.style({ display: 'grid', gap: '6px', gridTemplateColumns: '1fr 1fr' });
              [
                ['手动运行', 'run'],
                ['手动停止', 'stop'],
                ['恢复自动', 'auto'],
                ['触发故障', 'fault']
              ].forEach(([label, action]) => {
                controls.vButton(label, (button) => {
                  button.on('click', () => runPumpAction(action));
                });
              });
            });
          });
        });

        root.div((secondary) => {
          secondary.className('scada-secondary');
          secondary.style({ display: 'grid', gap: '12px', gridTemplateColumns: '2fr 1fr' });
          secondary.div((alarmBox) => {
            alarmBox.className('scada-alarm-box');
            alarmBox.h3('报警记录');
            alarmBox.child(ui.alarmPanel);
          });
          secondary.div((actions) => {
            actions.className('scada-actions');
            actions.h3('视图与模拟');
            actions.div((row) => {
              row.style({ display: 'flex', gap: '8px', flexWrap: 'wrap' });
              row.vButton('重置视角', (button) => {
                button.on('click', resetCamera);
              });
              row.vButton('重置模拟', (button) => {
                button.on('click', resetSimulation);
              });
            });
          });
        });

        root.p('操作：右键拖动旋转视角、滚轮缩放；点击设备查看实时详情与报警。');
      });
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
