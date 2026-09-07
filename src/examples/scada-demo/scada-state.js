/**
 * SCADA 数字孪生演示——纯逻辑模块（不依赖 DOM 与 Three.js）。
 *
 * 模型是一条简化的水处理产线：储水罐 → 一级给水泵 → 工艺罐 → 外输泵。
 * 液位、泵状态与报警全部由本地假数据驱动，方便之后替换成 MQTT/OPC UA 推送。
 */

export const TICK_RATE = 5;
export const SUPPLY_RATE = 6;

export const DEVICE_DEFS = Object.freeze([
  {
    capacity: 100,
    col: 2,
    id: 'T-101',
    name: '储水罐',
    pickRadius: 1.3,
    row: 2,
    type: 'tank'
  },
  {
    col: 5,
    flow: 14,
    id: 'P-101',
    name: '一级给水泵',
    pickRadius: 0.95,
    row: 2,
    type: 'pump'
  },
  {
    capacity: 100,
    col: 8,
    id: 'T-102',
    name: '工艺罐',
    pickRadius: 1.3,
    row: 2,
    type: 'tank'
  },
  {
    col: 11,
    flow: 10,
    id: 'P-102',
    name: '外输泵',
    pickRadius: 0.95,
    row: 2,
    type: 'pump'
  }
]);

export const PIPE_DEFS = Object.freeze([
  { flowDevice: 'P-101', from: 'T-101', id: 'LINE-1', to: 'P-101' },
  { flowDevice: 'P-101', from: 'P-101', id: 'LINE-2', to: 'T-102' },
  { flowDevice: 'P-102', from: 'T-102', id: 'LINE-3', to: 'P-102' }
]);

const LOW_T101 = Object.freeze({ active: 38, code: 'LOW-T101', recover: 44 });
const HIGH_T102 = Object.freeze({ active: 90, code: 'HIGH-T102', recover: 84 });

export function createScadaState(options = {}) {
  const cols = options.cols ?? 14;
  const rows = options.rows ?? 6;
  const initialLevels = options.initialLevels ?? { 'T-101': 82, 'T-102': 46 };
  const pumpOverrides = options.pumpOverrides ?? { 'P-101': null, 'P-102': null };

  return {
    alarmSeq: 1,
    alarms: [],
    cols,
    levels: {
      'T-101': initialLevels['T-101'] ?? 0,
      'T-102': initialLevels['T-102'] ?? 0
    },
    phase: 0,
    pumps: {
      'P-101': {
        faultTicks: 0,
        flow: pumpFlow('P-101'),
        override: pumpOverrides['P-101'] ?? null,
        status: pumpStatusFor('P-101', initialLevels['T-101'], initialLevels['T-102'])
      },
      'P-102': {
        faultTicks: 0,
        flow: pumpFlow('P-102'),
        override: pumpOverrides['P-102'] ?? null,
        status: pumpStatusFor('P-102', initialLevels['T-101'], initialLevels['T-102'])
      }
    },
    rows,
    tick: 0,
    version: 1
  };
}

export function deviceById(id) {
  return DEVICE_DEFS.find((device) => device.id === id);
}

export function setPumpOverride(state, id, value) {
  if (!state.pumps[id]) {
    return false;
  }
  state.pumps[id].override = value === null ? null : value === 'run' ? 'run' : 'stop';
  state.version += 1;
  return true;
}

export function acknowledgeAlarm(state, alarmId) {
  const alarm = state.alarms.find((entry) => entry.id === alarmId);
  if (!alarm) {
    return false;
  }
  alarm.acked = true;
  state.version += 1;
  return true;
}

export function triggerPumpFault(state, id = 'P-101') {
  const pump = state.pumps[id];
  if (!pump) {
    return false;
  }
  pump.faultTicks = 120;
  pump.status = 'fault';
  raiseAlarm(state, {
    code: `FAULT-${id}`,
    deviceId: id,
    message: `${deviceById(id)?.name ?? id}故障跳闸`,
    severity: 'critical'
  });
  state.version += 1;
  return true;
}

export function deviceSummary(state, id) {
  const device = deviceById(id);
  if (!device) {
    return null;
  }
  if (device.type === 'tank') {
    return {
      id: device.id,
      level: state.levels[id],
      name: device.name,
      status: levelStatus(state.levels[id], device.capacity),
      type: device.type
    };
  }
  const pump = state.pumps[id];
  return {
    flow: pump.status === 'run' ? pump.flow : 0,
    id: device.id,
    name: device.name,
    override: pump.override,
    status: pump.status,
    type: device.type
  };
}

export function activeAlarmCount(state) {
  return state.alarms.filter((alarm) => alarm.active && !alarm.acked).length;
}

export function recentAlarms(state, limit = 12) {
  return [...state.alarms]
    .sort((a, b) => b.id - a.id)
    .slice(0, limit)
    .map((alarm) => ({ ...alarm }));
}

export function tick(state) {
  state.tick += 1;
  stepFaults(state);
  stepPumps(state);
  stepFluids(state);
  state.phase = (state.phase + 0.055) % 1;
  updateTankAlarms(state);
  maybeTriggerFault(state);
  state.version += 1;
  return state;
}

function stepFaults(state) {
  for (const [id, pump] of Object.entries(state.pumps)) {
    if (pump.faultTicks > 0) {
      pump.faultTicks -= 1;
      if (pump.faultTicks === 0) {
        clearAlarm(state, `FAULT-${id}`);
      }
    }
  }
}

function stepPumps(state) {
  for (const [id, pump] of Object.entries(state.pumps)) {
    if (pump.faultTicks > 0) {
      pump.status = 'fault';
    } else if (pump.override === 'run') {
      pump.status = 'run';
    } else if (pump.override === 'stop') {
      pump.status = 'stop';
    } else {
      pump.status = autoStatus(id, pump.status, state.levels['T-101'], state.levels['T-102']);
    }
  }
}

function stepFluids(state) {
  const dt = 1 / TICK_RATE;
  const p101 = state.pumps['P-101'];
  const p102 = state.pumps['P-102'];

  if (p101.status === 'run') {
    const moved = Math.min(p101.flow * dt, state.levels['T-101']);
    state.levels['T-101'] -= moved;
    state.levels['T-102'] += moved;
  }
  if (p102.status === 'run') {
    const moved = Math.min(p102.flow * dt, state.levels['T-102']);
    state.levels['T-102'] -= moved;
  }

  if (state.levels['T-101'] < 100) {
    state.levels['T-101'] = Math.min(100, state.levels['T-101'] + SUPPLY_RATE * dt);
  }
  state.levels['T-101'] = clampLevel(state.levels['T-101']);
  state.levels['T-102'] = clampLevel(state.levels['T-102']);
}

function updateTankAlarms(state) {
  const low = state.levels['T-101'];
  if (low <= LOW_T101.active) {
    raiseAlarm(state, {
      code: LOW_T101.code,
      deviceId: 'T-101',
      message: '储水罐液位低',
      severity: 'critical'
    });
  } else if (low >= LOW_T101.recover) {
    clearAlarm(state, LOW_T101.code);
  }

  const high = state.levels['T-102'];
  if (high >= HIGH_T102.active) {
    raiseAlarm(state, {
      code: HIGH_T102.code,
      deviceId: 'T-102',
      message: '工艺罐液位高',
      severity: 'warning'
    });
  } else if (high <= HIGH_T102.recover) {
    clearAlarm(state, HIGH_T102.code);
  }
}

function maybeTriggerFault(state) {
  // 确定性假故障：每 340 tick（68s）在第 170 tick 触发一次 P-101 故障。
  if (state.tick % 340 !== 170) {
    return;
  }
  triggerPumpFault(state, 'P-101');
}

function autoStatus(id, previous, level101, level102) {
  if (id === 'P-101') {
    if (level101 <= 42 || level102 >= 90) {
      return 'stop';
    }
    if (level101 >= 50 && level102 <= 84) {
      return 'run';
    }
    return previous === 'run' ? 'run' : 'stop';
  }
  if (level102 >= 58) {
    return 'run';
  }
  if (level102 <= 45) {
    return 'stop';
  }
  return previous === 'run' ? 'run' : 'stop';
}

function pumpStatusFor(id, level101, level102) {
  return autoStatus(id, level102 > 55 ? 'run' : 'stop', level101, level102);
}

function pumpFlow(id) {
  return DEVICE_DEFS.find((device) => device.id === id)?.flow ?? 0;
}

function raiseAlarm(state, input) {
  if (state.alarms.some((alarm) => alarm.code === input.code && alarm.active)) {
    return;
  }
  state.alarms.push({
    acked: false,
    active: true,
    code: input.code,
    deviceId: input.deviceId,
    id: state.alarmSeq,
    message: input.message,
    raisedAt: state.tick,
    severity: input.severity
  });
  state.alarmSeq += 1;
}

function clearAlarm(state, code) {
  const alarm = state.alarms.find((entry) => entry.code === code && entry.active);
  if (alarm) {
    alarm.active = false;
    alarm.clearedAt = state.tick;
  }
}

function levelStatus(level, capacity) {
  const percent = level / capacity;
  if (percent <= 0.42) {
    return 'low';
  }
  if (percent >= 0.9) {
    return 'high';
  }
  return 'normal';
}

function clampLevel(value) {
  return Math.min(100, Math.max(0, value));
}
