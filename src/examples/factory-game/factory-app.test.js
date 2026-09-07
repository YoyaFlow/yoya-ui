import { afterEach, describe, expect, it, vi } from 'vitest';

const { fakeThree } = vi.hoisted(() => {
  class FakeVector3 {
    constructor(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
    }

    set(x, y, z) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
  }

  class FakeColor {
    setHex() {}
  }

  class FakeGeometry {
    dispose() {}
  }

  class FakeMaterial {
    constructor() {
      this.color = new FakeColor();
    }

    dispose() {}
  }

  class FakeObject {
    constructor() {
      this.children = [];
      this.parent = null;
      this.position = new FakeVector3();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.visible = true;
    }

    add(child) {
      if (!this.children.includes(child)) {
        this.children.push(child);
        child.parent = this;
      }
      return this;
    }

    remove(child) {
      const index = this.children.indexOf(child);
      if (index !== -1) {
        this.children.splice(index, 1);
        child.parent = null;
      }
      return this;
    }
  }

  class FakeMesh extends FakeObject {
    constructor(geometry = new FakeGeometry(), material = new FakeMaterial()) {
      super();
      this.geometry = geometry;
      this.material = material;
    }
  }

  class FakeScene extends FakeObject {
    constructor() {
      super();
      this.background = null;
    }
  }

  class FakePerspectiveCamera extends FakeObject {
    constructor() {
      super();
      this.aspect = 1;
      this.fov = 75;
      this.isPerspectiveCamera = true;
      this.lookAt = () => {};
      this.updateProjectionMatrix = () => {};
    }
  }

  class FakeLight extends FakeMesh {
    constructor() {
      super();
    }
  }

  class FakeDirectionalLight extends FakeLight {
    constructor() {
      super();
      this.position = new FakeVector3();
    }
  }

  class FakeWebGLRenderer {
    constructor(options) {
      this.domElement = document.createElement('canvas');
      this.dispose = () => {};
      this.options = options;
      this.render = () => {};
      this.setPixelRatio = () => {};
      this.setSize = () => {};
    }
  }

  class FakeClock {
    getDelta() {
      return 0.12;
    }
  }

  const fakeThree = {
    AmbientLight: FakeLight,
    BoxGeometry: FakeGeometry,
    Clock: FakeClock,
    Color: FakeColor,
    DirectionalLight: FakeDirectionalLight,
    GridHelper: FakeMesh,
    Group: FakeObject,
    Mesh: FakeMesh,
    MeshBasicMaterial: FakeMaterial,
    MeshStandardMaterial: FakeMaterial,
    PerspectiveCamera: FakePerspectiveCamera,
    Plane: class {
      constructor(normal, constant) {
        this.constant = constant;
        this.normal = normal;
      }
    },
    PlaneGeometry: FakeGeometry,
    Raycaster: class {
      setFromCamera() {
        this.ray = { intersectPlane: () => null };
      }
    },
    Scene: FakeScene,
    SphereGeometry: FakeGeometry,
    Vector2: class {
      constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
      }
    },
    Vector3: FakeVector3,
    WebGLRenderer: FakeWebGLRenderer
  };

  return { fakeThree };
});

vi.mock('three', () => fakeThree);

import { FactoryGameStandalone } from './factory-app.js';

describe('factory game standalone', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('mounts the page and advances the simulation on render frames', () => {
    const frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const app = FactoryGameStandalone();
    const node = app.render();
    const element = node.renderDom();
    document.body.appendChild(element);

    expect(element.querySelectorAll('.factory-viewport')).toHaveLength(1);
    expect(element.textContent).toContain('当前工具：传送带');

    frames.shift()();
    frames.shift()();

    expect(element.textContent).toContain('tick 1');
    expect(element.textContent).toContain('矿石');
    node.destroy();
  });
});
