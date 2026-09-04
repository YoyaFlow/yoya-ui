import { interopPageFrame } from './interop-section.js';
import { LeafletMapDemoNode, LeafletMapExample } from './demos/leaflet-map.js';

const LEAF_DEMO = Object.freeze({
  id: 'leaflet',
  title: 'Leaflet 地图',
  description:
    '地图容器由 yoya-ui 提供，Leaflet 在真实 DOM 上初始化瓦片图层与标记点，地图交互完全由 Leaflet 管理。',
  component: LeafletMapExample,
  sourceComponent: LeafletMapDemoNode,
  imports: ['HtmlElementNode'],
  extraSource: "import L from 'leaflet';\nimport 'leaflet/dist/leaflet.css';",
  sourceTitle: 'Leaflet 胶水类源码',
  outputText: '地图默认定位上海，可尝试切换城市。',
  controls: [
    {
      label: '定位杭州',
      run: (live, output) => {
        live.flyTo([30.2741, 120.1551], 11);
        output.textContent('已定位到杭州。');
      }
    },
    {
      label: '回到上海',
      run: (live, output) => {
        live.flyTo([31.2304, 121.4737], 12);
        output.textContent('已回到上海。');
      }
    }
  ]
});

export function LeafletDocumentationPage() {
  return interopPageFrame({
    docsKey: 'leaflet',
    heading: 'Leaflet 地图',
    lead: '轻量、框架无关的 2D 地图：一个真实容器交给 L.map，瓦片与标记即开即用。',
    usage: [
      '后台页面需要地图展示（点位、轨迹、区域标注）。',
      '不想把地图方案绑定进 UI 库本体。',
      '需要地图与页面其他声明式组件并存于同一视图树。'
    ],
    note: 'Leaflet 依赖浏览器地图渲染，只在客户端初始化并用 vClientOnly 包住；销毁节点时调用 map.remove 清理实例。',
    demos: [LEAF_DEMO]
  });
}
