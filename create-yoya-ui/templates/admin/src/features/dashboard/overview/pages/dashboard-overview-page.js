import { vGauge, vRingStat, vTimeline, vTrendCard, vstack } from '@yoyaflow/yoya-ui';
import { DashboardChart } from '../components/dashboard-chart.js';

const weekLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function DashboardOverviewPage() {
  return {
    render() {
      return vstack({ gap: '16px' }, (stack) => {
        stack.h2('数据概览');

        stack.vCard((card) => {
          card.vCardHeader('核心指标');
          card.vCardBody((body) => {
            body.vDigitalBoard((board) => {
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

        stack.div((trends) => {
          trends.style({
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'
          });
          trends.child(
            vTrendCard({
              data: [12, 15, 11, 18, 16, 21, 24],
              delta: '+6.4%',
              title: '今日请求',
              tone: 'primary',
              unit: 'k',
              up: true,
              value: '84.2'
            })
          );
          trends.child(
            vTrendCard({
              data: [320, 290, 310, 270, 260, 248, 243],
              delta: '-18 今日',
              title: '平均响应',
              tone: 'success',
              unit: 'ms',
              up: true,
              value: '243'
            })
          );
          trends.child(
            vTrendCard({
              data: [6, 7, 4, 3, 5, 2, 2],
              delta: '-5 较昨日',
              title: '故障次数',
              tone: 'danger',
              unit: '次',
              up: false,
              value: '2'
            })
          );
        });

        stack.div((charts) => {
          charts.style({
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
          });
          charts.child(
            DashboardChart({
              labels: weekLabels,
              series: [{ name: '请求量', data: [62, 71, 58, 84, 92, 76, 88] }],
              title: '近 7 日请求量',
              type: 'bar'
            })
          );
          charts.child(
            DashboardChart({
              labels: weekLabels,
              series: [
                { name: '错误数', data: [8, 12, 7, 15, 10, 6, 9], color: '#dc2626' },
                { name: '恢复数', data: [6, 10, 5, 12, 8, 5, 8], color: '#16a34a' }
              ],
              title: '近 7 日错误与恢复',
              type: 'line'
            })
          );
        });

        stack.div((bottom) => {
          bottom.style({
            display: 'grid',
            gap: '12px',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
          });
          bottom.vCard((card) => {
            card.vCardHeader('资源使用');
            card.vCardBody((body) => {
              body.hstack((row) => {
                row.style({ flexWrap: 'wrap', gap: '20px' });
                row.child(vRingStat({ label: '成功率', percent: 99, tone: 'success' }));
                row.child(
                  vRingStat({ label: '容量使用', percent: 68, tone: 'primary', value: '680 GB' })
                );
                row.div((box) => {
                  box.style({ textAlign: 'center' });
                  box.child(vGauge({ unit: '%', value: 72, tone: 'warning' }));
                  box.p((text) => {
                    text.style({ color: 'var(--yoya-color-text-muted, #64748b)', fontSize: '12px' });
                    text.text('CPU 使用率');
                  });
                });
                row.div((box) => {
                  box.style({ textAlign: 'center' });
                  box.child(vGauge({ unit: '%', value: 58, tone: 'primary' }));
                  box.p((text) => {
                    text.style({ color: 'var(--yoya-color-text-muted, #64748b)', fontSize: '12px' });
                    text.text('内存使用率');
                  });
                });
              });
            });
          });
          bottom.vCard((card) => {
            card.vCardHeader('最近动态');
            card.vCardBody((body) => {
              body.child(
                vTimeline((timeline) => {
                  timeline.vTimelineItem((item) => {
                    item.status('success');
                    item.title('服务发布成功');
                    item.time('09:32 · 2026-09-01');
                    item.content((box) =>
                      box.p('api-gateway v2.4.1 已上线，金丝雀批次全部通过。')
                    );
                  });
                  timeline.vTimelineItem((item) => {
                    item.status('processing');
                    item.title('滚动发布中');
                    item.time('09:20 · 2026-09-01');
                    item.content('web-console 正在按 5% 批次滚动。');
                  });
                  timeline.vTimelineItem((item) => {
                    item.status('warning');
                    item.title('容量预警');
                    item.time('08:47 · 2026-09-01');
                    item.content('redis 内存使用率接近 80%。');
                  });
                  timeline.vTimelineItem((item) => {
                    item.status('danger');
                    item.title('告警已恢复');
                    item.time('08:15 · 2026-09-01');
                    item.content('数据库连接池告警自动恢复。');
                  });
                })
              );
            });
          });
        });
      });
    }
  };
}
