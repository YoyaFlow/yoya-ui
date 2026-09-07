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
      'yoya-ui 是基于浏览器原生 Web 技术的声明式 UI 基础库：用普通 JavaScript DSL 构建真实 DOM，自带组件、路由、布局与 i18n；无需构建即可运行，适合长期维护、渐进增强与 AI 协作。',
    sections: [
      {
        title: '核心亮点',
        points: [
          '长期维护友好：API 构建于稳定的原生 Web 标准之上，只需维护一套代码，无需同时维护基于多种框架版本构建的项目，也不随框架大版本迁移重写。',
          '接入方式自由：script 标签、npm ESM/UMD、Vite/webpack、SSR 与脚手架模板均可接入，能力按模块按需引入。',
          '声明式直观且灵活：普通 JS 声明式 DSL、setup 回调与父节点快捷方法，视图结构即代码结构，直观且易于组合。',
          '多场景适用、全栈统一：同一套页面工厂与状态逻辑覆盖整站 SPA、服务端模板、SSR 与局部增强，Web 界面开发逻辑全栈一致。',
          '原生 JS 适应性高、资产不过时：无虚拟 DOM 与框架运行时，输出真实 HTML/DOM/JS；Web 标准持续向后兼容，既有界面资产长期可用。',
          '可嵌入已有项目：bindTo() 可局部挂载到 HTML、Vue、React、htmx、PHP、JSP 等既有项目，渐进增强，无需整体迁移。',
          'AI 编程亲和：无 JSX/模板编译与框架上下文，AI 生成的声明式组件可直接运行、直接组合，返工率低。'
        ]
      },
      {
        title: '定位与边界',
        paragraphs: [
          'yoya-ui 是一套业务界面构建形式，也是一个 Web 基础库：直接基于浏览器原生 DOM 构建，视图与操作逻辑同源，消除 HTML 标签化语言与复杂操作逻辑不兼容的问题。',
          '普通 JS 函数把视图组合成 ViewNode 树；ViewNode 是真实 DOM 的句柄，节点的创建、挂载（bindTo）、更新（commit）与销毁（destroy）生命周期都由它统一控制。',
          '它不是垄断组件生态的巨型框架：富文本、表格、地图、图表等专业领域由 Web 生态中的专业库以原生方式嵌入；也不是零组件基础库：表单、表格、导航、反馈与看板等高频能力开箱即用。自带 UI 组件只为开箱即用，组件清单不代表库的能力边界。',
          '它不绑定业务视觉主题：样式独立提供，由 --yoya-* 主题 token 驱动，可定制配色、明暗模式与品牌主题，无需改动组件源码。'
        ]
      },
      {
        title: '典型使用场景',
        points: [
          '整站应用：以路由（hash/history）、标签页视图、懒加载、布局、状态与 i18n 搭建完整 SPA，覆盖后台管理、数据看板与工具型产品。',
          '服务端集成：整站 SSR 与局部组件客户端加载同代码切换；可直接嵌入服务端模板，从单个交互渐进接管到整站。',
          '随服务一体交付：UI 与后端服务同包发布、随服务整体交付，适合微服务独立部署与客户内网等受限环境。',
          '高频业务页面：表单、表格、详情页、图表与消息反馈等数据密集场景开箱即用，无需构建工具也可直接运行。',
          '原型与低代码协作：声明式结构让 AI 与低代码工具生成的组件代码可直接运行，适合快速迭代与批量生成页面。'
        ]
      },
      {
        title: '开箱即用能力',
        points: [
          '内置路由、i18n、主题、状态、权限与图表按模块提供，可整套搭建不依赖第三方生态的完整应用。',
          '原生元素、自带组件与任意可挂载 DOM 的第三方库以同一方式组合（child() 与父节点快捷方法）。',
          '同一代码既可无构建运行，也支持 SSR/hydration 与 TypeScript 类型声明；扩展能力按需引入。'
        ]
      }
    ]
  });
}

export function GuideInstallationPage() {
  return createGuidePage({
    id: 'installation',
    title: '安装方式',
    intro: '安装 create-yoya-ui 脚手架快速体验，或通过 ES Module 直接引入构建产物。',
    sections: [
      {
        title: '快速体验',
        paragraphs: ['create-yoya-ui 提供 admin 后台管理模板，可直接作为管理后台起点。'],
        code: `# 安装脚手架
npm install -g create-yoya-ui

# 使用 admin 模板创建项目
create-yoya-ui my-app --template admin
cd my-app
npm install
npm run dev

# admin 模板包含：顶部导航 + 左侧菜单 + RouterViews 内容区，
# 以及数据概览看板、成员/角色/权限/字典管理等业务域示例`
      },
      {
        title: 'admin 模板（推荐）',
        paragraphs: [
          'yoya-ui 拥有自己独特的开发范式：声明式节点 DSL、页面编排、feature 模块组织与 api 分层。推荐使用 admin 模板创建项目来了解这些范式。',
          'admin 模板开箱即用：顶部导航 + 左侧菜单 + RouterViews 内容区，内置数据概览看板与图表，以及成员 / 角色 / 权限 / 字典管理等业务域示例。'
        ],
        code: `create-yoya-ui my-app --template admin
cd my-app
npm install
npm run dev`
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
