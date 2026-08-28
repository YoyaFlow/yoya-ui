import { section } from '../index.js';

function createGuidePage(config) {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-guide-page');
        page.attr('data-guide-page', config.id);
        page.h2(config.title);
        page.p(config.intro);

        config.sections.forEach((item) => {
          page.section((block) => {
            block.className('components-guide-section');
            block.h3(item.title);

            if (item.paragraphs) {
              item.paragraphs.forEach((paragraph) => block.p(paragraph));
            }

            if (item.points) {
              block.ul((list) => {
                item.points.forEach((point) => list.li(point));
              });
            }

            if (item.code) {
              block.pre((pre) => {
                pre.className('guide-code');
                pre.code(item.code);
              });
            }
          });
        });
      });
    }
  };
}

export function GuideOverviewPage() {
  return createGuidePage({
    id: 'overview',
    title: '概述',
    intro:
      'yoya-ui 是以浏览器原生能力替代 React/Vue 类框架的 UI 库：声明式 HTML DSL、组件库、路由、布局与 i18n，零构建直接运行，AI 生成组件可直接使用。',
    sections: [
      {
        title: '是什么',
        paragraphs: [
          'yoya-ui 回归浏览器原生 DOM，消除虚拟 DOM、JSX/SFC 编译与框架运行时等因早期 Web 标准不足而发明的技术特性，提供声明式 HTML DSL、组件、布局、状态、路由、i18n 和图表适配，并直接支持 AI 生成组件。'
        ]
      },
      {
        title: '适合什么场景',
        points: [
          '整站 SPA：路由（hash/history）、标签页视图、懒加载、布局、状态与 i18n 一应俱全。',
          '后台管理系统和 CRUD 页面。',
          '服务端模板、微前端中的渐进接管与局部交互。',
          'AI 生成组件直接使用，避免环境问题，返工率极低。'
        ]
      },
      {
        title: '演示页面',
        paragraphs: ['左侧菜单按分类组织，右侧提供实时演示和源码面板。']
      }
    ]
  });
}

export function GuidePositioningPage() {
  return createGuidePage({
    id: 'positioning',
    title: '定位',
    intro: 'yoya-ui 回归浏览器原生环境，以声明式 DSL 与完整组件、路由、布局能力替代前端框架。',
    sections: [
      {
        title: '目标用户',
        points: [
          '所有 Web 开发者，尤其是希望摆脱框架运行时与构建链的团队。',
          '希望同一套技术同时覆盖整站 SPA 与服务端页面的团队。',
          '使用 AI 生成组件并希望直接运行的项目。'
        ]
      },
      {
        title: '边界',
        points: [
          '回归浏览器原生，无虚拟 DOM 与框架运行时，不需要编译过程，源码可直接运行。',
          '完整支持整站 SPA，也能从单个局部交互开始渐进接管。',
          '不绑定业务视觉主题。'
        ]
      },
      {
        title: '适用场景',
        points: [
          '整站 SPA 与后台管理系统。',
          '表单、表格和详情页。',
          '服务端渐进接管、微前端和 AI 生成 UI。'
        ]
      }
    ]
  });
}

export function GuideAdvantagesPage() {
  return createGuidePage({
    id: 'advantages',
    title: '优势',
    intro: 'yoya-ui 把浏览器原生能力与声明式 DSL 组合起来，替代框架层抽象。',
    sections: [
      {
        title: '运行时轻量',
        points: ['无虚拟 DOM 运行时。', '无第三方框架依赖。', '核心包可按子入口引入。']
      },
      {
        title: '完整 SPA 能力',
        points: [
          '内置路由（hash/history），标签页视图与页面懒加载。',
          '布局、状态、i18n 与图表开箱即用。',
          '可整套搭建整站应用，不依赖第三方生态。'
        ]
      },
      {
        title: '后端友好',
        points: ['bindTo() 支持局部挂载。', '可直接嵌入服务端模板。']
      },
      {
        title: '能力完整',
        points: [
          '组件、布局、路由、i18n 和图表按模块提供。',
          '扩展能力按需引入，不进入核心概念。',
          '演示源码面板可复制到业务项目。'
        ]
      }
    ]
  });
}

export function GuideDesignPhilosophyPage() {
  return createGuidePage({
    id: 'philosophy',
    title: '设计理念',
    intro: '设计上优先保持浏览器原生、声明式、完整能力与零构建交付。',
    sections: [
      {
        title: '浏览器原生优先',
        paragraphs: [
          '直接使用真实 DOM，消除虚拟 DOM、JSX/SFC 编译和框架运行时这类为弥补早期 Web 标准不足而发明的技术特性。'
        ]
      },
      {
        title: '小核加扩展',
        points: ['核心保持稳定。', '路由、i18n、图表等按需引入。', '组件边界清晰，模块可组合。']
      },
      {
        title: '声明式 DSL',
        paragraphs: ['用函数、setup callback 和链式方法描述视图，代码可读且接近页面结构。']
      },
      {
        title: '后端友好',
        paragraphs: ['可嵌入、可组合、可阅读、可复制，从服务端渲染页面渐进接管到整站 SPA 均适用。']
      }
    ]
  });
}

export function GuideInstallationPage() {
  return createGuidePage({
    id: 'installation',
    title: '安装方式',
    intro: '目前通过 ES Module 的 import 直接引入 basepath 下的 yoya.*.js 构建文件。',
    sections: [
      {
        title: '构建产物',
        paragraphs: ['dist 目录提供 yoya.core.js、yoya.ui.js、yoya.echart.js 和 yoya.ui.css。']
      },
      {
        title: '模块引入',
        code: `import { section } from 'basepath/yoya.core.js';
import { vButton } from 'basepath/yoya.ui.js';

section((page) => {
  page.child(vButton('Ready'));
}).bindTo('#app');`
      },
      {
        title: '按需扩展',
        code: `import { vEchart } from 'basepath/yoya.echart.js';`
      },
      {
        title: '样式',
        code: `<link rel="stylesheet" href="basepath/yoya.ui.css" />`
      }
    ]
  });
}
