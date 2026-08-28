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
      'yoya-ui 是面向后端与全栈开发者的浏览器原生 JS 基础库，同时提供常用 UI 组件库，AI 生成组件可直接使用。',
    sections: [
      {
        title: '是什么',
        paragraphs: [
          'yoya-ui 回归浏览器原生 DOM，提供声明式 HTML DSL、布局、组件、状态、路由、i18n 和图表适配，并直接支持 AI 生成组件。'
        ]
      },
      {
        title: '适合什么场景',
        points: [
          '服务端模板嵌入和局部交互。',
          '后台管理系统和 CRUD 页面。',
          '微前端中的独立功能块。',
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
    intro: 'yoya-ui 回归浏览器原生环境，提供常用 UI 组件库，并面向 AI 生成组件场景。',
    sections: [
      {
        title: '目标用户',
        points: [
          '后端与全栈开发者。',
          '希望在服务端模板中逐步接管局部交互的团队。',
          '使用 AI 生成组件并希望直接运行的项目。'
        ]
      },
      {
        title: '边界',
        points: [
          '回归浏览器原生，不需要额外编译过程，源码可直接运行。',
          '支持但不强制整站 SPA。',
          '不绑定业务视觉主题。'
        ]
      },
      {
        title: '适用场景',
        points: ['后台管理。', '表单、表格和详情页。', '局部挂载、微前端和 AI 生成 UI。']
      }
    ]
  });
}

export function GuideAdvantagesPage() {
  return createGuidePage({
    id: 'advantages',
    title: '优势',
    intro: 'yoya-ui 把浏览器原生能力和轻量 DSL 组合起来，减少框架层抽象。',
    sections: [
      {
        title: '运行时轻量',
        points: ['无虚拟 DOM 运行时。', '无第三方框架依赖。', '核心包可按子入口引入。']
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
    intro: '设计上优先保持浏览器原生、声明式、小核加扩展和后端友好。',
    sections: [
      {
        title: '浏览器原生优先',
        paragraphs: ['直接使用真实 DOM，避免不必要的虚拟层和运行时依赖。']
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
        paragraphs: ['可嵌入、可组合、可阅读、可复制，适合逐步接管服务端渲染页面。']
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
