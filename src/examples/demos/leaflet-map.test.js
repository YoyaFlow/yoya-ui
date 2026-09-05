import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fakeMap,
  mapInstances,
  mapApi
} = vi.hoisted(() => {
  const mapInstances = [];
  const mapApi = {
    flyTo: vi.fn(),
    invalidateSize: vi.fn(),
    remove: vi.fn()
  };

  const fakeMap = {
    map: vi.fn(() => {
      mapInstances.push(mapApi);
      return mapApi;
    }),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    circleMarker: vi.fn(() => ({ addTo: vi.fn() }))
  };

  return { fakeMap, mapInstances, mapApi };
});

vi.mock('leaflet', () => ({ default: fakeMap }));

import { LeafletMapExample } from './leaflet-map.js';

describe('Leaflet map interop demo', () => {
  beforeEach(() => {
    mapInstances.length = 0;
    vi.clearAllMocks();
  });

  it('initializes the map with tile layer and a marker on the container', () => {
    const demo = LeafletMapExample();
    const el = demo.render().renderDom();

    expect(el.dataset.leafletHost).toBe('true');
    expect(fakeMap.map).toHaveBeenCalledWith(
      el,
      expect.objectContaining({ zoom: expect.any(Number) })
    );
    expect(fakeMap.tileLayer).toHaveBeenCalledOnce();
    expect(fakeMap.circleMarker).toHaveBeenCalledOnce();
    el.remove();
  });

  it('delegates flyTo to the map instance', () => {
    const demo = LeafletMapExample();
    const el = demo.render().renderDom();

    demo.flyTo([31.23, 121.47], 12);

    expect(mapApi.flyTo).toHaveBeenCalledWith([31.23, 121.47], 12);
    el.remove();
  });

  it('does not initialize the map twice when renderDom runs again', () => {
    const demo = LeafletMapExample();
    const node = demo.render();

    node.renderDom();
    node.renderDom();

    expect(mapInstances).toHaveLength(1);
  });

  it('removes the map instance on destroy', () => {
    const demo = LeafletMapExample();
    const el = demo.render().renderDom();
    document.body.appendChild(el);

    demo.destroy();

    expect(mapApi.remove).toHaveBeenCalledOnce();
    expect(document.body.contains(el)).toBe(false);
    expect(() => demo.flyTo([30, 120], 11)).not.toThrow();
  });
});
