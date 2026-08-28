import { vCard, vGauge, vRingStat, vSparkline, vTimeline, vTrendCard } from '../../index.js';

export function DigitalBoardDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('数字看板');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vDigitalBoard 用响应式卡片网格展示关键指标：数值、单位、趋势和主题色。');
            stack.p('columns 可固定列数，趋势方向与主题色会自动着色。');
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
      });
    }
  };
}

export function TrendCardDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('趋势卡');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vTrendCard 组合数值、涨跌和迷你走势，适合放在看板顶部。');
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
      });
    }
  };
}

export function SparklineDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('迷你走势');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vSparkline 是无坐标轴的轻量折线图，支持面积填充和主题色。');
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
      });
    }
  };
}

export function RingStatDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('环形统计');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vRingStat 用圆环展示占比，中心默认显示百分比，也可自定义。');
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
      });
    }
  };
}

export function GaugeDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('仪表盘');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('vGauge 用半圆刻度与指针展示区间指标，支持最大值与单位。');
            stack.hstack((row) => {
              row.style('gap', '24px');
              row.style('flexWrap', 'wrap');
              row.child(vGauge({ unit: '%', value: 72, tone: 'warning' }));
              row.child(vGauge({ unit: '%', value: 38, tone: 'primary' }));
              row.child(vGauge({ max: 120, unit: '°C', value: 86, tone: 'danger' }));
            });
          });
        });
      });
    }
  };
}

export function TimelineDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('时间线');
        card.vCardBody((body) => {
          body.child(
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
      });
    }
  };
}

export const boardCategory = {
  description: '展示关键指标的响应式卡片看板。',
  id: 'board',
  title: '看板',
  demos: [
    {
      component: DigitalBoardDemo,
      imports: ['vCard', 'vDigitalBoard', 'vDigitalBoardItem'],
      title: '数字看板核心源码'
    }
  ]
};
