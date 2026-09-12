import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { bindWindowEvent, computed, div, ref, svg, SvgElementNode, vText } from '../index.js';

/**
 * 三个单文件 SVG 演示是自包含 HTML：内联模块从 CDN 引库，因此测试抽出台本，
 * 注入本仓库的库符号后执行，验证「能启动 + 关键交互生效」。
 */
const demoLibrary = { bindWindowEvent, computed, div, ref, svg, SvgElementNode, vText };
const demoLibraryNames = Object.keys(demoLibrary);

function bootDemo(file) {
  const html = readFileSync(`src/examples/${file}`, 'utf8');
  const script = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  expect(script).not.toBeNull();

  const body = script[1].replace(/import\s*\{[\s\S]*?\}\s*from\s*'[^']*';\s*/, '');
  document.body.innerHTML = '<main id="app"></main>';
  // 演示台本按源码原样执行，库符号由参数注入
  const factory = new Function(...demoLibraryNames, body);
  factory(...demoLibraryNames.map((name) => demoLibrary[name]));

  return document.querySelector('#app');
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function waitFor(predicate, timeoutMs = 3000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = predicate();
    if (value) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  return null;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('svg car control demo', () => {
  it('boots the playfield and drives a car with the keyboard', async () => {
    const app = bootDemo('svg-car-control.html');
    const car = app.querySelector('.car');
    const body = car.querySelector('.car-body');

    expect(car.getAttribute('transform')).toBe('translate(430 300) rotate(0)');

    // 点击选中：车身描边与描边宽度随状态写入变黄
    car.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(body.getAttribute('style')).toContain('stroke-width: 4');
    expect(body.getAttribute('style')).toContain('stroke:');

    // 方向键驱动：动画帧写入位置，transform 原地更新
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await nextFrame();
    await nextFrame();

    expect(car.getAttribute('transform')).not.toBe('translate(430 300) rotate(0)');
    expect(app.querySelector('.demo-status').textContent).toContain('A 速度');
  });
});

describe('svg scada canvas demo', () => {
  function findButton(root, label) {
    return [...root.querySelectorAll('button')].find((button) => button.textContent === label);
  }

  it('places devices, connects them, runs the simulation and exports JSON', async () => {
    const app = bootDemo('svg-scada-canvas.html');
    const canvas = app.querySelector('.scada-canvas');
    const placeDevice = (kind) => {
      app.querySelector(`[data-scada-kind="${kind}"]`).click();
      canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: 120, clientY: 120 }));
    };

    placeDevice('motor');
    placeDevice('pump');
    const deviceNodes = app.querySelectorAll('.scada-device');
    expect(deviceNodes).toHaveLength(2);

    // 运行模拟：动画帧写入角度/液位信号，SVG 属性原地更新
    findButton(app, '运行模拟').click();
    const rotor = app.querySelector('.dev-motor-rotor');
    const beforeRun = rotor.getAttribute('transform');
    await nextFrame();
    await nextFrame();
    expect(rotor.getAttribute('transform')).not.toBe(beforeRun);

    // 连线模式：依次点两台设备，连线端点由设备坐标信号写入
    findButton(app, '连线模式').click();
    deviceNodes[0].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    deviceNodes[1].dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    expect(app.querySelectorAll('.scada-connections line.scada-line')).toHaveLength(1);

    // 导出 JSON：写入 hud 的 json 信号后文本区跟着变
    findButton(app, '导出 JSON').click();
    expect(app.querySelector('.scada-json').textContent).toContain('"devices"');
    expect(app.querySelector('.scada-status').textContent).toContain('已导出 JSON');
  });
});

describe('svg tower defense demo', () => {
  function findButton(root, label) {
    return [...root.querySelectorAll('button')].find((button) => button.textContent === label);
  }

  it('places a tower, spends gold and spawns enemies on the first wave', async () => {
    const app = bootDemo('svg-tower-defense.html');
    const goldBox = app.querySelector('.stat-box');

    app.querySelector('[data-tower-kind="arrow"]').click();
    app
      .querySelector('[data-cell="0,0"]')
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(app.querySelectorAll('.tower')).toHaveLength(1);
    // 放置后自动选中：射程圈由信号写入切到可见
    expect(app.querySelector('.tower-range').style.opacity).toBe('1');
    expect(goldBox.textContent).toContain('90');

    findButton(app, '开始第 1 波').click();
    const enemy = await waitFor(() => app.querySelector('.enemy'));

    expect(enemy).not.toBeNull();
    expect(enemy.querySelector('.enemy-hp-fill')).not.toBeNull();
  }, 10000);
});
