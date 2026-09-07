import { section, vCard } from '../index.js';
import * as THREE from 'three';
import { vThree } from '../yoya.three.js';
import { ComponentSource } from './component-source.js';

const THREE_EXTRA_SOURCE = "import * as THREE from 'three';";

function ThreeCubeDemo() {
  const cube = { mesh: null };

  return {
    render() {
      return vThree((three) => {
        three.height('320px');
        three.threeLib(THREE);
        three.onReady(({ camera, scene, threeLib }) => {
          camera.position.set(2.2, 1.8, 4);
          camera.lookAt(0, 0, 0);
          const geometry = new threeLib.BoxGeometry(1.4, 1.4, 1.4);
          const material = new threeLib.MeshStandardMaterial({
            color: 0x2563eb,
            roughness: 0.35
          });
          cube.mesh = new threeLib.Mesh(geometry, material);
          scene.add(cube.mesh);
          scene.add(new threeLib.AmbientLight(0xffffff, 1.6));
          const light = new threeLib.DirectionalLight(0xffffff, 2.2);
          light.position.set(3, 4, 5);
          scene.add(light);
          scene.add(new threeLib.GridHelper(6, 12, 0x64748b, 0xe2e8f0));
        });
        three.onFrame(() => {
          if (cube.mesh) {
            cube.mesh.rotation.y += 0.012;
          }
        });
      });
    }
  };
}

function ThreeSphereDemo() {
  const sphere = { mesh: null };

  return {
    render() {
      return vThree((three) => {
        three.height('320px');
        three.threeLib(THREE);
        three.onReady(({ camera, scene, threeLib }) => {
          camera.position.set(3, 1.6, 4);
          camera.lookAt(0, 0, 0);
          const geometry = new threeLib.SphereGeometry(1.15, 32, 32);
          const material = new threeLib.MeshStandardMaterial({
            color: 0x0d9488,
            roughness: 0.28
          });
          sphere.mesh = new threeLib.Mesh(geometry, material);
          scene.add(sphere.mesh);
          scene.add(new threeLib.AmbientLight(0xffffff, 1.6));
          const light = new threeLib.DirectionalLight(0xffffff, 2.2);
          light.position.set(-3, 4, 5);
          scene.add(light);
          scene.add(new threeLib.GridHelper(6, 12, 0x64748b, 0xe2e8f0));
        });
        three.onFrame(() => {
          if (sphere.mesh) {
            sphere.mesh.rotation.x += 0.008;
            sphere.mesh.rotation.y += 0.01;
          }
        });
      });
    }
  };
}

const threeDemos = [
  {
    component: ThreeCubeDemo,
    extraSource: THREE_EXTRA_SOURCE,
    id: 'cube',
    imports: [{ from: 'yoya-ui/three', names: ['vThree'] }],
    sourceTitle: '旋转立方体源码',
    title: '旋转立方体'
  },
  {
    component: ThreeSphereDemo,
    extraSource: THREE_EXTRA_SOURCE,
    id: 'sphere',
    imports: [{ from: 'yoya-ui/three', names: ['vThree'] }],
    sourceTitle: '自转球体源码',
    title: '自转球体'
  }
];

function ThreeDemoSection(demo) {
  const live = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    extraSource: demo.extraSource,
    imports: demo.imports,
    sourceComponent: demo.component,
    title: demo.sourceTitle
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader(demo.title);
        card.vCardBody((body) => {
          body.div((liveBox) => {
            liveBox.className('components-three-demo-live');
            liveBox.attr('data-three-demo-live', 'true');
            liveBox.child(live);
          });
          body.child(sourcePanel);
        });
      });
    }
  };
}

export function ThreeDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-three-page');
        page.attr('data-three-page', 'true');
        page.h1('Three.js 场景');
        page.p(
          '基于 yoya.three.js 的 Three.js 扩展：引擎容器交给 WebGLRenderer，' +
            '渲染循环、尺寸同步与销毁清理由组件生命周期接管。'
        );

        page.div((grid) => {
          grid.className('components-three-grid');
          grid.attr('data-three-grid', 'true');
          threeDemos.forEach((demo) => {
            grid.child(ThreeDemoSection(demo));
          });
        });
      });
    }
  };
}
