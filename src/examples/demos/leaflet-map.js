import { HtmlElementNode } from '../../index.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const SHANGHAI = [31.2304, 121.4737];

export class LeafletMapDemoNode extends HtmlElementNode {
  constructor(center = SHANGHAI, zoom = 12) {
    super('div', null);
    this._center = center;
    this._map = null;
    this._zoom = zoom;
    this.attr('data-leaflet-host', 'true');
    this.styles({ height: '360px', width: '100%' });
  }

  renderDom() {
    const element = super.renderDom();
    if (this._map) {
      return element;
    }
    this._map = L.map(element, {
      center: this._center,
      scrollWheelZoom: false,
      zoom: this._zoom
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this._map);
    L.circleMarker(this._center, {
      color: '#2563eb',
      radius: 8
    }).addTo(this._map);
    return element;
  }

  flyTo(center, zoom = 13) {
    if (!this._map) {
      return;
    }
    if (typeof this._map.flyTo === 'function') {
      this._map.flyTo(center, zoom);
      return;
    }
    this._map.setView(center, zoom);
  }

  destroy() {
    if (this._map) {
      this._map.remove();
      this._map = null;
    }
    return super.destroy();
  }
}

export function LeafletMapExample(center = SHANGHAI, zoom = 12) {
  let node = null;

  return {
    render() {
      node = new LeafletMapDemoNode(center, zoom);
      return node;
    },
    flyTo(next, nextZoom) {
      node?.flyTo(next, nextZoom);
    },
    destroy() {
      node?.destroy();
      node = null;
    }
  };
}
