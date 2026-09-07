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
      this.opacity = 1;
    }

    dispose() {}
  }

  class FakeObject {
    constructor() {
      this.children = [];
      this.parent = null;
      this.position = new FakeVector3();
      this.rotation = { x: 0, y: 0, z: 0 };
      this.scale = { setScalar() {} };
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
      return 0.24;
    }
  }

  class FakeTimer {
    update() {}

    getDelta() {
      return 0.24;
    }
  }

  const fakeThree = {
    AmbientLight: FakeLight,
    BoxGeometry: FakeGeometry,
    CircleGeometry: FakeGeometry,
    Clock: FakeClock,
    Color: FakeColor,
    CylinderGeometry: FakeGeometry,
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
    Timer: FakeTimer,
    TorusGeometry: FakeGeometry,
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

import { ScadaTwinStandalone } from './scada-app.js';

describe('scada twin standalone', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('mounts the HUD and advances the fake-data simulation', () => {
    const frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

    const app = ScadaTwinStandalone();
    const node = app.render();
    const element = node.renderDom();
    document.body.appendChild(element);

    expect(element.querySelectorAll('.scada-viewport')).toHaveLength(1);
    expect(element.textContent).toContain('设备详情');
    expect(element.textContent).toContain('T-101 储水罐');

    frames.shift()();
    frames.shift()();

    expect(element.textContent).toContain('报警记录');
    expect(element.textContent).toContain('运行泵');

    const host = element.querySelector('.yoya-vthree');
    host.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, button: 2 }));
    host.dispatchEvent(
      new MouseEvent('pointermove', { bubbles: true, button: 2, clientX: 120, clientY: 80 })
    );
    host.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
    host.dispatchEvent(new WheelEvent('wheel', { bubbles: true, deltaY: -120 }));

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit2' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' }));

    expect(element.textContent).toContain('故障跳闸');
    app.destroy();
  });
});
