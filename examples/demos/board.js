import {
  computed,
  keySet,
  ref,
  vDigitalBoardItem,
  vGauge,
  vRingStat,
  vSparkline,
  vTimeline,
  vTrendCard,
  vstack
} from '../../src/index.js';
import { componentSource } from '../component-source.js';

/**
 * 看板演示共用的脚手架：给一组 ref 接上「每 1.2s 抖动一次」的帧循环，
 * 并给出「开始模拟 / 暂停 / 模拟一轮」按钮。（真实业务把 tick 换成自己的数据源即可。）
 */
export function LiveDataControls(root, live, tick) {
  root.hstack((actions) => {
    actions.style({ gap: '10px', flexWrap: 'wrap' });
    [
      ['开始模拟', () => (live.value = true)],
      ['暂停', () => (live.value = false)],
      ['模拟一轮', tick]
    ].forEach(([label, handler]) => {
      actions.vButton(label, (button) => button.on('click', handler));
    });
  });

  let last = 0;
  root.bindAnimationFrameLoop((time) => {
    if (!live.value || time - last < 1200) {
      return;
    }
    last = time;
    tick();
  });
}

/** 演示用抖动：step 越大动得越多。 */
export function driftBy(step) {
  return Math.round((Math.random() - 0.45) * step * 2);
}

/** 源码面板用：把脚手架原样附在演示源码后面（去掉 export，避免当成第 5 个演示）。 */
export const liveDataSource = [
  '// 演示脚手架（页面外壳；真实业务把 tick 换成自己的数据源即可）',
  [LiveDataControls, driftBy]
    .map((helper) => componentSource(helper, []).replace(/^export /, ''))
    .join('\n\n')
].join('\n\n');

/**
 * 数字看板：指标是 `keySet`（同 key 同 api——数值 / 上次值挂各自的 api），增删指标交给 `keyed` 对账。
 * 「开始模拟」后每 1.2s 写一次数据，数值 / 趋势文案跟着状态走；涨跌方向色是组件命令，由 tick 同步。
 */
export function DigitalBoardDemo() {
  const live = ref(false);
  let seq = 4;
  const metrics = keySet(
    [
      { icon: '🖥️', id: 'svc', label: '服务总数', start: 128, step: 6, tone: 'primary', unit: '个' },
      { icon: '✅', id: 'run', label: '运行中', start: 96, step: 4, tone: 'success', unit: '个' },
      { icon: '⚠️', id: 'alert', label: '异常告警', start: 5, step: 3, tone: 'danger', unit: '个' },
      { icon: '⏱️', id: 'resp', label: '平均响应', start: 243, step: 40, tone: 'warning', unit: 'ms' }
    ],
    (metric) => metric.id,
    (item) => {
      item.api.value = ref(item.data.start);
      item.api.previous = ref(item.data.start);
      item.api.syncTrend = () => {};
    }
  );

  const tick = () => {
    metrics.items().forEach((item) => {
      const step = Math.round((Math.random() - 0.45) * item.data.step * 2);
      item.api.previous.value = item.api.value.value;
      item.api.value.value = Math.max(0, item.api.value.value + step);
      item.api.syncTrend();
    });
  };

  const reset = () => {
    metrics.items().forEach((item) => {
      item.api.value.value = item.data.start;
      item.api.previous.value = item.data.start;
      item.api.syncTrend();
    });
  };

  const addMetric = () => {
    seq += 1;
    metrics.add({
      icon: '📈',
      id: `metric-${seq}`,
      label: `指标 ${seq}`,
      start: 60,
      step: 10,
      tone: 'primary',
      unit: '%'
    });
  };

  const dropMetric = () => {
    const keys = metrics.keys();
    if (keys.length > 1) {
      metrics.remove(keys[keys.length - 1]);
    }
  };

  const trendOf = (item) =>
    computed(() => {
      const diff = item.api.value.value - item.api.previous.value;
      return `${diff >= 0 ? '+' : '−'}${Math.abs(diff)} 较上次`;
    });

  return vstack((root) => {
    root.style('gap', '14px');
    root.hstack((actions) => {
      actions.style({ gap: '10px', flexWrap: 'wrap' });
      [
        ['开始模拟', 'primary', () => (live.value = true)],
        ['暂停', 'secondary', () => (live.value = false)],
        ['模拟一轮', 'ghost', tick],
        ['重置', 'ghost', reset],
        ['新增指标', 'ghost', addMetric],
        ['移除末尾', 'ghost', dropMetric]
      ].forEach(([label, variant, handler]) => {
        actions.vButton(label, (button) => button.variant(variant).on('click', handler));
      });
    });
    root.vDigitalBoard((board) => {
      board.columns(4);
      board.keyed(metrics, (item) =>
        vDigitalBoardItem((card) => {
          item.api.syncTrend = () => card.trendUp(item.api.value.value >= item.api.previous.value);
          card.label(item.data.label);
          card.value(item.api.value);
          card.unit(item.data.unit);
          card.trend(trendOf(item));
          card.trendUp(item.api.value.value >= item.api.previous.value);
          card.tone(item.data.tone);
          card.icon(item.data.icon);
        })
      );
    });
    let last = 0;
    root.bindAnimationFrameLoop((time) => {
      if (!live.value || time - last < 1200) {
        return;
      }
      last = time;
      tick();
    });
  });
}

export function TrendCardDemo() {
  const live = ref(false);
  // 卡片 = keySet：数值 / 上次值 / 走势数据挂在各自 api 上，增删卡片交给 keyed 对账。
  const cards = keySet(
    [
      { id: 'req', start: 84.2, step: 6, title: '今日请求', tone: 'primary', unit: 'k' },
      { id: 'fail', start: 2, step: 2, title: '故障次数', tone: 'danger', unit: '次' },
      { id: 'resp', start: 243, step: 40, title: '平均响应', tone: 'success', unit: 'ms' }
    ],
    (card) => card.id,
    (item) => {
      item.api.value = ref(item.data.start);
      item.api.previous = ref(item.data.start);
      item.api.series = ref([3, 5, 4, 8, 7, 9]);
      item.api.up = computed(() => item.api.value.value >= item.api.previous.value);
      item.api.delta = computed(() => {
        const diff = Number((item.api.value.value - item.api.previous.value).toFixed(1));
        return `${diff >= 0 ? '+' : '−'}${Math.abs(diff)} 较上次`;
      });
    }
  );

  const tick = () => {
    cards.items().forEach((item) => {
      item.api.previous.value = item.api.value.value;
      const next = item.api.value.value + driftBy(item.data.step);
      item.api.value.value = Math.max(0, Number(next.toFixed(1)));
      item.api.series.value = [...item.api.series.value.slice(1), Math.round(next)];
    });
  };

  return vstack((root) => {
    root.style('gap', '14px');
    LiveDataControls(root, live, tick);
    root.div((grid) => {
      grid.style('display', 'grid');
      grid.style('gap', '12px');
      grid.style('gridTemplateColumns', 'repeat(auto-fit, minmax(200px, 1fr))');
      grid.keyed(cards, (item) =>
        vTrendCard({
          data: item.api.series,
          delta: item.api.delta,
          title: item.data.title,
          tone: item.data.tone,
          unit: item.data.unit,
          up: item.api.up,
          value: item.api.value
        })
      );
    });
  });
}

export function SparklineDemo() {
  const live = ref(false);
  const series = keySet(
    [
      { fill: true, id: 'a', level: 6, tone: 'primary' },
      { fill: true, id: 'b', level: 4, tone: 'danger' },
      { fill: false, id: 'c', level: 5, tone: 'success' },
      { fill: true, id: 'd', level: 7, tone: 'warning' }
    ],
    (row) => row.id,
    (item) => {
      item.api.level = ref(item.data.level);
      item.api.data = ref([2, 5, 3, 7, 6, 9]);
    }
  );

  const tick = () => {
    series.items().forEach((item) => {
      item.api.level.value = Math.max(0, item.api.level.value + driftBy(3));
      item.api.data.value = [...item.api.data.value.slice(1), item.api.level.value];
    });
  };

  return vstack((root) => {
    root.style('gap', '14px');
    LiveDataControls(root, live, tick);
    root.div((grid) => {
      grid.style('display', 'grid');
      grid.style('gap', '12px');
      grid.style('gridTemplateColumns', 'repeat(auto-fit, minmax(160px, 1fr))');
      grid.keyed(series, (item) =>
        vSparkline({ data: item.api.data, fill: item.data.fill, tone: item.data.tone })
      );
    });
  });
}

export function RingStatDemo() {
  const live = ref(false);
  const rings = keySet(
    [
      { id: 'ok', label: '成功率', start: 68, step: 6, tone: 'success' },
      { id: 'queue', label: '队列占用', start: 45, step: 8, tone: 'warning' },
      { id: 'cap', label: '容量使用', start: 92, step: 5, tone: 'primary' },
      { id: 'fail', label: '失败率', start: 18, step: 4, tone: 'danger' }
    ],
    (ring) => ring.id,
    (item) => {
      item.api.percent = ref(item.data.start);
      item.api.text = computed(() => `${Math.round(item.api.percent.value * 10)} GB`);
    }
  );

  const tick = () => {
    rings.items().forEach((item) => {
      const next = item.api.percent.value + driftBy(item.data.step);
      item.api.percent.value = Math.max(0, Math.min(100, next));
    });
  };

  return vstack((root) => {
    root.style('gap', '14px');
    LiveDataControls(root, live, tick);
    root.hstack((row) => {
      row.style('gap', '24px');
      row.style('flexWrap', 'wrap');
      row.keyed(rings, (item) =>
        vRingStat({
          label: item.data.label,
          percent: item.api.percent,
          tone: item.data.tone,
          value: item.data.id === 'cap' ? item.api.text : undefined
        })
      );
    });
  });
}

export function GaugeDemo() {
  const live = ref(false);
  const gauges = keySet(
    [
      { id: 'load', max: 100, start: 72, step: 8, tone: 'warning', unit: '%' },
      { id: 'mem', max: 100, start: 38, step: 6, tone: 'primary', unit: '%' },
      { id: 'temp', max: 120, start: 86, step: 10, tone: 'danger', unit: '°C' }
    ],
    (gauge) => gauge.id,
    (item) => {
      item.api.value = ref(item.data.start);
    }
  );

  const tick = () => {
    gauges.items().forEach((item) => {
      const next = item.api.value.value + driftBy(item.data.step);
      item.api.value.value = Math.max(0, Math.min(item.data.max, next));
    });
  };

  return vstack((root) => {
    root.style('gap', '14px');
    LiveDataControls(root, live, tick);
    root.hstack((row) => {
      row.style('gap', '24px');
      row.style('flexWrap', 'wrap');
      row.keyed(gauges, (item) =>
        vGauge({
          max: item.data.max,
          tone: item.data.tone,
          unit: item.data.unit,
          value: item.api.value
        })
      );
    });
  });
}

export function TimelineDemo() {
  return vstack((root) => {
    root.child(
      vTimeline((timeline) => {
        timeline.vTimelineItem((item) => {
          item.status('success');
          item.title('服务发布成功');
          item.time('09:32 · 2026-08-28');
          item.content((box) => box.p('api-gateway v2.4.1 已上线，金丝雀批次全部通过。'));
        });
        timeline.vTimelineItem((item) => {
          item.status('processing');
          item.title('滚动发布中');
          item.time('09:20 · 2026-08-28');
          item.content('web-console 正在按 5% 批次滚动。');
        });
        timeline.vTimelineItem((item) => {
          item.status('warning');
          item.title('容量预警');
          item.time('08:47 · 2026-08-28');
          item.content('redis 内存使用率接近 80%。');
        });
        timeline.vTimelineItem((item) => {
          item.status('danger');
          item.title('告警已恢复');
          item.time('08:15 · 2026-08-28');
          item.content('数据库连接池告警自动恢复。');
        });
      })
    );
  });
}
