import { describe, expect, it } from 'vitest';
import {
  activeAlarmCount,
  acknowledgeAlarm,
  createScadaState,
  deviceSummary,
  recentAlarms,
  setPumpOverride,
  tick
} from './scada-state.js';

function runTicks(state, count) {
  for (let i = 0; i < count; i += 1) {
    tick(state);
  }
  return state;
}

describe('scada-state', () => {
  it('starts with a running feed pump and a stopped export pump', () => {
    const state = createScadaState();

    expect(state.levels['T-101']).toBe(82);
    expect(state.levels['T-102']).toBe(46);
    expect(state.pumps['P-101'].status).toBe('run');
    expect(state.pumps['P-102'].status).toBe('stop');
    expect(activeAlarmCount(state)).toBe(0);
  });

  it('stops the feed pump automatically when the process tank is high', () => {
    const state = createScadaState({ initialLevels: { 'T-101': 80, 'T-102': 92 } });

    expect(state.pumps['P-101'].status).toBe('stop');
    expect(state.pumps['P-102'].status).toBe('run');
  });

  it('moves fluid from the source tank to the process tank', () => {
    const state = createScadaState({ initialLevels: { 'T-101': 90, 'T-102': 20 } });

    runTicks(state, 10);

    expect(state.levels['T-101']).toBeLessThan(90);
    expect(state.levels['T-102']).toBeGreaterThan(20);
  });

  it('clamps tank capacity at 100 even when pumping continuously', () => {
    const state = createScadaState({ initialLevels: { 'T-101': 100, 'T-102': 0 } });
    setPumpOverride(state, 'P-101', 'run');

    runTicks(state, 80);

    expect(state.levels['T-102']).toBeLessThanOrEqual(100);
    expect(state.levels['T-101']).toBeGreaterThanOrEqual(0);
  });

  it('raises and clears a low-level alarm on T-101', () => {
    const state = createScadaState({ initialLevels: { 'T-101': 50, 'T-102': 40 } });
    setPumpOverride(state, 'P-101', 'run');

    runTicks(state, 10);
    expect(activeAlarmCount(state)).toBe(1);
    expect(state.alarms[0].code).toBe('LOW-T101');
    expect(state.alarms[0].severity).toBe('critical');

    setPumpOverride(state, 'P-101', 'stop');
    runTicks(state, 14);
    expect(state.alarms[0].active).toBe(false);
    expect(activeAlarmCount(state)).toBe(0);
  });

  it('raises and clears a high-level alarm on T-102', () => {
    const state = createScadaState({ initialLevels: { 'T-101': 90, 'T-102': 92 } });

    tick(state);
    expect(activeAlarmCount(state)).toBe(1);
    expect(state.alarms[0].code).toBe('HIGH-T102');

    runTicks(state, 10);
    expect(state.alarms[0].active).toBe(false);
  });

  it('triggers a deterministic feed pump fault and recovers', () => {
    const state = createScadaState();

    runTicks(state, 170);
    expect(state.pumps['P-101'].status).toBe('fault');
    expect(activeAlarmCount(state)).toBe(1);
    expect(state.alarms[0].code).toBe('FAULT-P-101');

    runTicks(state, 120);
    expect(state.pumps['P-101'].status).toBe('run');
    expect(state.alarms[0].active).toBe(false);
  });

  it('acknowledges alarms and keeps them in recent history', () => {
    const state = createScadaState({ initialLevels: { 'T-101': 100, 'T-102': 92 } });

    tick(state);
    const alarmId = state.alarms[0].id;
    expect(acknowledgeAlarm(state, alarmId)).toBe(true);
    expect(state.alarms[0].acked).toBe(true);
    expect(activeAlarmCount(state)).toBe(0);
    expect(recentAlarms(state)).toHaveLength(1);
  });

  it('summarizes tank level and pump state for the HUD', () => {
    const state = createScadaState();
    const tank = deviceSummary(state, 'T-101');
    const pump = deviceSummary(state, 'P-101');

    expect(tank.status).toBe('normal');
    expect(tank.level).toBe(82);
    expect(pump.status).toBe('run');
    expect(pump.flow).toBe(14);
  });
});
