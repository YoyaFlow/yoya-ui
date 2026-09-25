import { div, vNode } from '../../index.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SHANGHAI = [31.2304, 121.4737];

/**
 * Leaflet 胶水组件（形态 B，照 `VBadge` 的写法规格）：容器结构写死，地图实例挂在闭包里，
 * 初始化 / 清理走 `whenMount` / `whenDestroy`（宿主元素由钩子上下文现取）。
 */
export function vLeafletMap(center = SHANGHAI, zoom = 12) {
  return vNode((api) => {
    const mapState = { instance: null };

    api.flyTo = (next, nextZoom = 13) => {
      if (!mapState.instance) {
        return api;
      }

      if (typeof mapState.instance.flyTo === 'function') {
        mapState.instance.flyTo(next, nextZoom);
      } else {
        mapState.instance.setView(next, nextZoom);
      }

      return api;
    };
    api.whenMount = (host) => {
      const element = host?.element?.() ?? null;

      if (!element || mapState.instance) {
        return;
      }

      mapState.instance = L.map(element, { center, scrollWheelZoom: false, zoom });
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapState.instance);
      L.circleMarker(center, { color: '#2563eb', radius: 8 }).addTo(mapState.instance);
      refreshSize(mapState.instance);
    };
    api.whenDestroy = () => {
      mapState.instance?.remove();
      mapState.instance = null;
    };

    return div({
      'data-leaflet-host': 'true',
      style: { height: '360px', width: '100%' }
    });
  });
}

/** 落地首帧容器尺寸还没稳定，排一帧让 Leaflet 量一次。 */
function refreshSize(instance) {
  if (typeof window === 'undefined') {
    return;
  }

  const refresh = () => instance.invalidateSize();

  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(refresh);
    return;
  }

  window.setTimeout(refresh, 0);
}

export function LeafletMapExample(center = SHANGHAI, zoom = 12) {
  const map = vLeafletMap(center, zoom);

  return vNode((api) => {
    api.flyTo = (next, nextZoom) => map.flyTo(next, nextZoom);

    return map;
  });
}
