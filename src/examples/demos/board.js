import { vGauge, vRingStat, vSparkline, vTimeline, vTrendCard, vstack } from '../../index.js';

export function DigitalBoardDemo() {
  return {
    render() {
      return vstack((root) => {
          root.vstack((stack) => {
            stack.style('gap', '14px');
            stack.vDigitalBoard((board) => {
              board.columns(4);
              board.vDigitalBoardItem((item) => {
                item.label('服务总数');
                item.value('128');
                item.unit('个');
                item.trend('+12 本月');
                item.trendUp(true);
                item.icon('🖥️');
              });
              board.vDigitalBoardItem((item) => {
                item.label('运行中');
                item.value('96');
                item.unit('个');
                item.trend('+8 本周');
                item.trendUp(true);
                item.tone('success');
                item.icon('✅');
              });
              board.vDigitalBoardItem((item) => {
                item.label('异常告警');
                item.value('5');
                item.unit('个');
                item.trend('-2 今日');
                item.trendUp(false);
                item.tone('danger');
                item.icon('⚠️');
              });
              board.vDigitalBoardItem((item) => {
                item.label('平均响应');
                item.value('243');
                item.unit('ms');
                item.trend('-18 今日');
                item.trendUp(true);
                item.tone('warning');
                item.icon('⏱️');
              });
            });
        });
      });
    }
  };
}

export function TrendCardDemo() {
  return {
    render() {
      return vstack((root) => {
          root.vstack((stack) => {
            stack.style('gap', '14px');
            stack.div((grid) => {
              grid.style('display', 'grid');
              grid.style('gap', '12px');
              grid.style('gridTemplateColumns', 'repeat(auto-fit, minmax(200px, 1fr))');
              grid.child(
                vTrendCard({
                  data: [3, 5, 4, 8, 7, 9],
                  delta: '+6.4%',
                  title: '今日请求',
                  tone: 'primary',
                  unit: 'k',
                  up: true,
                  value: '84.2'
                })
              );
              grid.child(
                vTrendCard({
                  data: [6, 7, 4, 3, 2, 2],
                  delta: '-5 较昨日',
                  title: '故障次数',
                  tone: 'danger',
                  unit: '次',
                  up: false,
                  value: '2'
                })
              );
              grid.child(
                vTrendCard({
                  data: [320, 290, 310, 270, 260, 243],
                  delta: '-18 今日',
                  title: '平均响应',
                  tone: 'success',
                  unit: 'ms',
                  up: true,
                  value: '243'
                })
              );
            });
        });
      });
    }
  };
}

export function SparklineDemo() {
  return {
    render() {
      return vstack((root) => {
          root.vstack((stack) => {
            stack.style('gap', '14px');
            stack.div((grid) => {
              grid.style('display', 'grid');
              grid.style('gap', '12px');
              grid.style('gridTemplateColumns', 'repeat(auto-fit, minmax(160px, 1fr))');
              grid.child(vSparkline({ data: [2, 5, 3, 7, 6, 9], fill: true, tone: 'primary' }));
              grid.child(vSparkline({ data: [9, 7, 8, 4, 5, 3], fill: true, tone: 'danger' }));
              grid.child(vSparkline({ data: [3, 4, 6, 5, 8, 7], tone: 'success' }));
              grid.child(vSparkline({ data: [6, 6, 7, 5, 6, 8], fill: true, tone: 'warning' }));
            });
        });
      });
    }
  };
}

export function RingStatDemo() {
  return {
    render() {
      return vstack((root) => {
          root.vstack((stack) => {
            stack.style('gap', '14px');
            stack.hstack((row) => {
              row.style('gap', '24px');
              row.style('flexWrap', 'wrap');
              row.child(vRingStat({ label: '成功率', percent: 68, tone: 'success' }));
              row.child(vRingStat({ label: '队列占用', percent: 45, tone: 'warning' }));
              row.child(
                vRingStat({ label: '容量使用', percent: 92, tone: 'primary', value: '920 GB' })
              );
              row.child(vRingStat({ label: '失败率', percent: 18, tone: 'danger' }));
            });
        });
      });
    }
  };
}

export function GaugeDemo() {
  return {
    render() {
      return vstack((root) => {
          root.vstack((stack) => {
            stack.style('gap', '14px');
            stack.hstack((row) => {
              row.style('gap', '24px');
              row.style('flexWrap', 'wrap');
              row.child(vGauge({ unit: '%', value: 72, tone: 'warning' }));
              row.child(vGauge({ unit: '%', value: 38, tone: 'primary' }));
              row.child(vGauge({ max: 120, unit: '°C', value: 86, tone: 'danger' }));
            });
        });
      });
    }
  };
}

export function TimelineDemo() {
  return {
    render() {
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
  };
}
