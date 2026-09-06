import { section, vCard } from '../index.js';
import { ComponentSource } from './component-source.js';
import {
  DigitalBoardDemo,
  GaugeDemo,
  RingStatDemo,
  SparklineDemo,
  TimelineDemo,
  TrendCardDemo
} from './demos/board.js';

const pageConfigs = Object.freeze([
  {
    component: DigitalBoardDemo,
    heading: '数字看板 vDigitalBoard',
    imports: ['vstack'],
    intro: '用响应式卡片网格展示关键指标：数值、单位、趋势和主题色。',
    key: 'digital-board',
    route: 'board:digital-board',
    title: '数字看板',
    usage: ['需要在一屏内展示多个关键指标时。', '需要趋势方向与主题色自动着色时。'],
    apiRows: [
      ['vDigitalBoard((board) => ...)', '创建指标网格。', 'vDigitalBoard((board) => ...)'],
      ['board.columns(n)', '设置固定列数。', 'board.columns(4)'],
      ['board.vDigitalBoardItem(...)', '添加指标项。', 'board.vDigitalBoardItem((item) => ...)']
    ]
  },
  {
    component: TrendCardDemo,
    heading: '趋势卡 vTrendCard',
    imports: ['vTrendCard', 'vstack'],
    intro: '组合数值、涨跌和迷你走势，适合放在看板顶部。',
    key: 'trend-card',
    route: 'board:trend-card',
    title: '趋势卡',
    usage: ['需要展示指标与变化方向时。', '适合看板顶部摘要卡。'],
    apiRows: [
      ['vTrendCard({ title, value, delta, up })', '创建趋势卡。', 'vTrendCard({ value: "84.2" })'],
      ['trend.up(true)', '标记上涨趋势。', 'trend.up(true)']
    ]
  },
  {
    component: SparklineDemo,
    heading: '迷你走势 vSparkline',
    imports: ['vSparkline', 'vstack'],
    intro: '无坐标轴的轻量折线图，支持面积填充和主题色。',
    key: 'sparkline',
    route: 'board:sparkline',
    title: '迷你走势',
    usage: ['需要在卡片里嵌入小图趋势时。'],
    apiRows: [
      ['vSparkline({ data, fill, tone })', '创建迷你走势。', 'vSparkline({ data: [1, 2, 3] })']
    ]
  },
  {
    component: RingStatDemo,
    heading: '环形统计 vRingStat',
    imports: ['vRingStat', 'vstack'],
    intro: '用圆环展示占比，中心默认显示百分比，也可自定义。',
    key: 'ring-stat',
    route: 'board:ring-stat',
    title: '环形统计',
    usage: ['需要展示比例类指标时。', '适合成功率、容量占用。'],
    apiRows: [
      ['vRingStat({ label, percent, tone })', '创建环形统计。', 'vRingStat({ percent: 68 })'],
      ['ring.value(text)', '自定义中心文本。', "ring.value('920 GB')"]
    ]
  },
  {
    component: GaugeDemo,
    heading: '仪表盘 vGauge',
    imports: ['vGauge', 'vstack'],
    intro: '用半圆刻度与指针展示区间指标，支持最大值与单位。',
    key: 'gauge',
    route: 'board:gauge',
    title: '仪表盘',
    usage: ['需要展示区间型指标时。', '适合负载、使用率等。'],
    apiRows: [
      ['vGauge({ value, max, unit, tone })', '创建仪表盘。', 'vGauge({ value: 72, unit: "%" })']
    ]
  },
  {
    component: TimelineDemo,
    heading: '时间线 vTimeline',
    imports: ['vTimeline', 'vstack'],
    intro: '竖向事件流，节点状态色区分成功、失败和进行中。',
    key: 'timeline',
    route: 'board:timeline',
    title: '时间线',
    usage: ['需要展示执行历史或事件流时。', '适合告警与发布记录。'],
    apiRows: [
      ['vTimeline((timeline) => ...)', '创建时间线。', 'vTimeline((timeline) => ...)'],
      ['item.status(value)', '设置节点状态。', "item.status('success')"]
    ]
  }
]);

function createPage(config) {
  return {
    render() {
      return section((page) => {
        page.className(`components-route-page components-${config.key}-docs`);
        page.attr('data-component-route-item', config.route);
        page.attr(`data-${config.key}-docs`, 'true');
        page.h1(config.heading);
        page.p(config.intro);

        page.section((usage) => {
          usage.h2('何时使用');
          usage.ul((list) => {
            config.usage.forEach((item) => list.li(item));
          });
        });

        page.section((api) => {
          api.h2('常用 API');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              config.apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.h2('代码演示');
          const liveDemo = config.component();
          const sourcePanel = ComponentSource({
            component: config.component,
            sourceComponent: config.component,
            imports: config.imports,
            title: `${config.key} 核心源码`
          });
          examples.h3(config.title);
          examples.div((live) => {
            live.className('components-board-live');
            live.child(
              vCard((card) => {
                card.vCardBody((body) => body.child(liveDemo));
              })
            );
          });
          examples.child(sourcePanel);
        });
      });
    }
  };
}

const pages = Object.freeze(
  Object.fromEntries(pageConfigs.map((config) => [config.key, createPage(config)]))
);

export const DigitalBoardDocumentationPage = () => pages['digital-board'];
export const TrendCardDocumentationPage = () => pages['trend-card'];
export const SparklineDocumentationPage = () => pages.sparkline;
export const RingStatDocumentationPage = () => pages['ring-stat'];
export const GaugeDocumentationPage = () => pages.gauge;
export const TimelineDocumentationPage = () => pages.timeline;
