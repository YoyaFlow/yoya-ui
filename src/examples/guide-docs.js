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
      'yoya-ui 是直接基于浏览器原生能力的 UI 库：声明式 HTML DSL、组件库、路由、布局与 i18n，无需构建也可直接运行，AI 生成组件可直接使用。',
    sections: [
      {
        title: '是什么',
        paragraphs: [
          'yoya-ui 是一套新的业务界面构建形式，也是一个 Web 基础库：直接基于浏览器原生 DOM 构建，消除虚拟 DOM、JSX/SFC 编译与框架运行时等因早期 Web 标准不足而发明的技术特性，采用声明式结构化 JS 元素构建方案，视图与操作逻辑同源，消除 HTML 标签化语言与复杂操作逻辑不兼容的问题。',
          '同时提供组件、布局、状态、路由、i18n 与图表适配，并直接支持 AI 生成组件。自带 UI 组件只是为了开箱即用，组件清单并不代表库的能力边界——原生元素与第三方组件以同样方式自由组合。'
        ]
      },
      {
        title: '版本演进友好',
        points: [
          '视图语法基于原生 HTML 与声明式结构，消除 UI 库语法版本变更带来的迁移负担。',
          '核心描述 html 原生元素，保持稳定，既有代码不随 UI 库版本变动重写。',
          '既有代码、示例与 AI 生成组件在新版本中持续可用。',
          '路由、i18n、图表等按需引入。',
          '组件边界清晰，模块可组合。'
        ]
      },
      {
        title: '使用场景',
        points: [
          '整站应用：以路由（hash/history）、标签页视图、懒加载、布局、状态与 i18n 搭建完整 SPA，覆盖后台管理、数据看板与工具型产品。',
          '服务端集成：整站 SSR 与局部组件客户端加载同代码切换；可直接嵌入服务端模板，从单个交互渐进接管到整站。',
          '随服务一体交付：UI 与后端服务同包发布、随服务整体交付，适合微服务独立部署与客户内网等受限环境。',
          '高频业务页面：表单、表格、详情页、图表与消息反馈等数据密集场景开箱即用，无需构建工具也可直接运行。',
          'AI 与低代码协作：声明式结构让 AI 生成的组件代码可直接运行，适合原型快速迭代与批量生成页面。',
          '长期维护项目：核心库保持稳定，降低版本升级与重写成本，适合需要长期运维的系统，也让厌倦前端更迭的团队少一份负担。'
        ]
      },
      {
        title: '目标用户',
        points: [
          '所有 Web 开发者，尤其是希望摆脱框架运行时与构建链的团队。',
          '希望同一套技术同时覆盖整站 SPA 与服务端页面的团队。',
          '使用 AI 生成组件并希望直接运行的项目。',
          '厌倦前端层出不穷的新概念、新框架与破坏性版本更新的团队。'
        ]
      },
      {
        title: '边界',
        points: [
          '回归浏览器原生，无虚拟 DOM 与框架运行时，不需要编译过程，源码可直接运行。',
          '完整支持整站 SPA，也能从单个局部交互开始渐进接管。',
          '不绑定业务视觉主题。',
          '自带 UI 组件只为开箱即用，组件清单不代表库的能力边界。'
        ]
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
        title: '渐进集成',
        points: ['bindTo() 支持局部挂载。', '可直接嵌入服务端模板。'],
        paragraphs: ['同一套代码可服务端渲染也可客户端渲染，从局部组件渐进接管到整站 SPA 均适用。']
      },
      {
        title: '能力完整',
        points: [
          '组件、布局、路由、i18n 和图表按模块提供。',
          '扩展能力按需引入，不进入核心概念。',
          '演示源码面板可复制到业务项目。'
        ]
      },
      {
        title: '样式可定制',
        points: [
          '提供独立 CSS 样式文件（yoya.ui.css），引入即用，也可自行修改定制。',
          '样式由 --yoya-* CSS 变量（主题 token）驱动，可定制配色、明暗模式与品牌主题。',
          '组件样式与主题解耦，定制无需改动组件源码与页面结构。'
        ]
      }
    ]
  });
}

export function GuideInstallationPage() {
  return createGuidePage({
    id: 'installation',
    title: '安装方式',
    intro: '用 create-yoya-ui 脚手架快速搭建，或通过 ES Module 直接引入构建产物。',
    sections: [
      {
        title: '脚手架',
        paragraphs: ['create-yoya-ui 内置 basic（SPA）与 ssr（服务端渲染）两个模板。'],
        code: `npx create-yoya-ui@latest my-app
npx create-yoya-ui@latest my-app --template ssr

cd my-app
npm install
npm run dev        # basic 模板
# SSR 模板：npm run build && npm start`
      },
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
