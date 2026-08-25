import { section, vCard } from '../index.js';
import { ComponentSource } from './component-source.js';
import { vEchart } from '../yoya.echart.js';
import '../chart/echarts-loader.js';

function EchartsBarExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('柱状图');
        card.vCardBody((body) => {
          body.child(
            vEchart((chart) => {
              chart.echartsLib(window.echarts);
              chart.height('320px');
              chart.option({
                title: { left: 'center', text: '月度销售', top: 10 },
                tooltip: { trigger: 'axis' },
                xAxis: {
                  data: ['1 月', '2 月', '3 月', '4 月', '5 月', '6 月'],
                  type: 'category'
                },
                yAxis: { type: 'value' },
                series: [
                  {
                    data: [120, 200, 150, 80, 70, 110],
                    itemStyle: { color: '#5470c6' },
                    type: 'bar'
                  }
                ]
              });
            })
          );
        });
      });
    }
  };
}

function EchartsLineExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('折线图');
        card.vCardBody((body) => {
          body.child(
            vEchart((chart) => {
              chart.echartsLib(window.echarts);
              chart.height('320px');
              chart.option({
                title: { left: 'center', text: '温度趋势', top: 10 },
                tooltip: { trigger: 'axis' },
                xAxis: {
                  boundaryGap: false,
                  data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
                  type: 'category'
                },
                yAxis: { type: 'value' },
                series: [
                  {
                    areaStyle: { opacity: 0.3 },
                    data: [15, 18, 20, 17, 22, 19, 16],
                    itemStyle: { color: '#28a745' },
                    smooth: true,
                    type: 'line'
                  }
                ]
              });
            })
          );
        });
      });
    }
  };
}

function EchartsPieExample1() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('饼图');
        card.vCardBody((body) => {
          body.child(
            vEchart((chart) => {
              chart.echartsLib(window.echarts);
              chart.height('320px');
              chart.option({
                legend: { left: 'left', orient: 'vertical', top: 'middle' },
                series: [
                  {
                    center: ['60%', '50%'],
                    data: [
                      { name: '搜索引擎', value: 1048 },
                      { name: '直接访问', value: 735 },
                      { name: '邮件营销', value: 580 },
                      { name: '联盟广告', value: 484 },
                      { name: '视频广告', value: 300 }
                    ],
                    radius: ['40%', '70%'],
                    type: 'pie'
                  }
                ],
                title: { left: 'center', text: '市场份额', top: 10 },
                tooltip: { formatter: '{b}: {c} ({d}%)', trigger: 'item' }
              });
            })
          );
        });
      });
    }
  };
}

const echartsDemos = [
  {
    component: EchartsBarExample1,
    id: 'bar',
    imports: [
      { from: 'yoya-ui', names: ['vCard'] },
      { from: 'yoya-ui/echart', names: ['vEchart'] }
    ],
    sourceTitle: '柱状图源码',
    title: '柱状图'
  },
  {
    component: EchartsLineExample1,
    id: 'line',
    imports: [
      { from: 'yoya-ui', names: ['vCard'] },
      { from: 'yoya-ui/echart', names: ['vEchart'] }
    ],
    sourceTitle: '折线图源码',
    title: '折线图'
  },
  {
    component: EchartsPieExample1,
    id: 'pie',
    imports: [
      { from: 'yoya-ui', names: ['vCard'] },
      { from: 'yoya-ui/echart', names: ['vEchart'] }
    ],
    sourceTitle: '饼图源码',
    title: '饼图'
  }
];

function EchartsDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    imports: demo.imports,
    sourceComponent: demo.component,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-echarts-demo');
        example.attr('data-echarts-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-echarts-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function EchartsDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-echarts-page');
        page.attr('data-echarts-page', 'true');
        page.h1('ECharts 图表');
        page.p('基于 yoya.echart.js 的 ECharts 扩展，支持柱状图、折线图和饼图。');

        page.div((grid) => {
          grid.className('components-echarts-grid');
          grid.attr('data-echarts-grid', 'true');
          echartsDemos.forEach((demo) => {
            grid.child(EchartsDemoSection(demo));
          });
        });
      });
    }
  };
}
