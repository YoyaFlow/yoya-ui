import { section } from '@yoyaflow/yoya-ui';

function createGuidePage(config) {
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
          '接入方式自由：script 标签、npm ESM、Vite/webpack、SSR 与脚手架模板均可接入，能力按模块按需引入。',
          '声明式直观且灵活：普通 JS 声明式 DSL、setup 回调与父节点快捷方法，视图结构即代码结构，直观且易于组合。',
          '多场景适用、全栈统一：同一套页面工厂与状态逻辑覆盖整站 SPA、服务端模板、SSR 与局部增强，Web 界面开发逻辑全栈一致。',
          '原生 JS 适应性高、资产不过时：无虚拟 DOM 与框架运行时，输出真实 HTML/DOM/JS；Web 标准持续向后兼容，既有界面资产长期可用。',
          '生命周期控制：以 ViewNode 作为操作句柄，生命周期与状态管理能力不输虚拟 DOM；vScroll 超过阈值自动开启虚拟滚动、只渲染可视窗口，让超大规模列表渲染依然流畅。',
          '原生生态继承：基于浏览器原生标准的真实 DOM 操作，第三方库接入只需要一个薄组件（一条生命周期契约，官方适配器 vEchart / vThree 就是参照）；绝大多数 JS 库都以 DOM 为接口，无需担心生态问题。',
          '可嵌入已有项目：bindTo() 可局部挂载到 HTML、PHP、JSP、Vue、React 等既有页面，渐进增强，无需整体迁移。',
          'AI 编程亲和：无 JSX/模板编译与框架上下文，AI 生成的声明式组件可直接运行、直接组合，返工率低。'
        ]
      },
      {
        title: '定位与边界',
        paragraphs: [
          'yoya-ui 是一套业务界面构建形式，也是一个 Web 基础库：直接基于浏览器原生 DOM 构建，视图与操作逻辑同源，消除 HTML 标签化语言与复杂操作逻辑不兼容的问题。',
          '普通 JS 函数把视图组合成 ViewNode 树；ViewNode 是真实 DOM 的句柄，节点的创建、挂载（bindTo）、更新（commit）与销毁（destroy）生命周期都由它统一控制。',
          '它不是垄断组件生态的巨型框架：富文本、表格、地图、图表等专业领域交给 Web 生态里更专业的库，用它们自己的原生 API 接入（每个库配一个薄适配组件，官方适配器 vEchart / vThree 就是参照）；也不是零组件基础库：表单、表格、导航、反馈与看板等高频能力开箱即用。自带 UI 组件只为开箱即用，组件清单不代表库的能力边界。',
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
      },
      {
        title: '产物清单',
        paragraphs: [
          '无后缀与 .min 是 ESM 增量入口（不含 core，自动加载共享块）；.full 是自包含文件（core 已内联），适合 CDN 与免构建单文件直用。SSR 原语从 router 入口导入，不单独提供 ssr 子路径。'
        ],
        code: `# 共享增量入口（ESM，自动加载共享 core 块）
yoya.core.js / yoya.core.min.js             核心：引擎 + html + svg + state/i18n/access
yoya.core.chunk.js / yoya.core.chunk.min.js 内部共享块（core/ui/router 自动加载）
yoya.ui.js / yoya.ui.min.js                 组件 + layout + theme
yoya.router.js / yoya.router.min.js         router + SSR 原语
yoya.echart.js / yoya.three.js / yoya.devtools.js（+ .min）
                                            扩展增量（自行引入 echarts / three）

# 自包含 ESM（core 已内联）
yoya.ui.full.js / yoya.ui.full.min.js       core + ui
yoya.router.full.js / yoya.router.full.min.js   core + router/SSR
yoya.ui-router.full.js / yoya.ui-router.full.min.js  core + ui + router/SSR

# 样式与类型
yoya.ui.css
types/...（root / core / ui / router / echart / three / devtools）`
      }
    ]
  });
}

export function GuideInstallationPage() {
  return createGuidePage({
    id: 'installation',
    title: '安装方式',
    intro:
      '三条路：脚手架起项目、经过打包器按需 import、或 CDN 直接引入自包含单文件。下面把 yoya-ui 的导出物（每个公开入口）逐条列清，照抄即可。',
    sections: [
      {
        title: '1. 脚手架',
        paragraphs: [
          '三个模板：basic（最小 SPA）、admin（后台管理，推荐）、ssr（renderPage + hydrate 整页渲染）。模板依赖钉在当前发布版本。'
        ],
        code: `npm create yoya-ui@latest my-app          # 等价于 npx create-yoya-ui my-app
# 也可以全局安装：npm install -g create-yoya-ui

create-yoya-ui my-app --template admin     # admin | basic | ssr
cd my-app
npm install
npm run dev                                # build 构建；SSR 模板另有 npm start`
      },
      {
        title: '2. npm 模块（经过打包器）',
        points: [
          '只要组件：npm install @yoyaflow/yoya-ui —— @yoyaflow/yoya-core 作为 peer 依赖一起装上，两包共用同一份 core 实例。',
          '只要引擎：npm install @yoyaflow/yoya-core（写自己的组件库，零第三方依赖）。',
          '样式必引：没有运行时 CSS 注入，组件皮肤与主题变量要自己引入。'
        ],
        code: `// 最省事：根入口（引擎 + 元素面 + 全部组件 + 路由/SSR），按需 tree-shake
import { div, ref, vText, vButton, vCard, createRouter, renderPage } from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

// 想更薄：引擎走 core，组件走 /ui，路由走 /router（同一份 core，不会有双副本）
import { div, ref, vText } from '@yoyaflow/yoya-core';
import { vButton, vCard } from '@yoyaflow/yoya-ui/ui';
import { createRouter, renderPage } from '@yoyaflow/yoya-ui/router';`
      },
      {
        title: '3. 导出物（一）@yoyaflow/yoya-core —— 引擎与元素面',
        paragraphs: [
          '主入口 = 渲染原语 + 整个元素面（节点、HTML 与 SVG 工厂 + 图标集、信号、vText、slot、权限/Context 原语）。i18n、主题、a11y 与组件作者契约放在 /tools：它们是辅助能力，不进每个应用的下载量。'
        ],
        code: `import { body, div, svg, svgs, ref, computed, vNode, vText, slot } from '@yoyaflow/yoya-core';      // 主入口
import { createAccess, installAccess, withContext, inject, provide } from '@yoyaflow/yoya-core';  // 权限 / Context
import { bindWindowEvent, bindDocumentEvent } from '@yoyaflow/yoya-core';                         // 文档/窗口事件
import { createI18n, i18nText } from '@yoyaflow/yoya-core/tools';                                 // i18n
import { initYoyaTheme, setYoyaMode, setYoyaTheme } from '@yoyaflow/yoya-core/tools';             // 主题 token 开关
import { announce, createFocusTrap, moveByKey } from '@yoyaflow/yoya-core/tools';                 // a11y 原语
import { applyElementOptions, themeValue, runBuilder } from '@yoyaflow/yoya-core/tools';          // 组件作者契约
import { RequestBase, Result, configureRequest } from '@yoyaflow/yoya-core/api';                  // 通讯辅助
import { renderToString, hydrate, mount, parseState, serializeState } from '@yoyaflow/yoya-core/ssr'; // SSR 原语
import { enableDevtools, subscribeDevtools } from '@yoyaflow/yoya-core/dev';                      // DevTools（旧名 /devtools 仍可用）
import { head, htmls } from '@yoyaflow/yoya-core/html';                                           // HTML 工厂（与主入口同一份）
import { svg as svgTag, svgs as svgNs, ArrowUpOutlined } from '@yoyaflow/yoya-core/svg';         // SVG 工厂 + 图标集（同一份）
import '@yoyaflow/yoya-core/compiler-runtime';                                                    // 编译产物的运行期钩子（自动引入即可）`
      },
      {
        title: '4. 导出物（二）@yoyaflow/yoya-ui —— 组件、路由与扩展',
        paragraphs: [
          '根入口是全量面（组件 + 布局 + 主题 + 路由/SSR + core + tools）；分类子入口与根入口是同一批组件的不同切法，只为控制下载量，写法完全一致。'
        ],
        code: `import { vButton, vCard, vForm, vTable, vBody, vstack, toast } from '@yoyaflow/yoya-ui';  // 根入口（全量面）
import { vButton, vCard } from '@yoyaflow/yoya-ui/ui';                 // 只要组件（不含 router/SSR）
import { vMenu, vSidebar, vTabs, vSteps } from '@yoyaflow/yoya-ui/navigation';   // 分类切法
import { vDialog, vTooltip } from '@yoyaflow/yoya-ui/feedback';
import { vInput, vSelect, vForm as vFormTag } from '@yoyaflow/yoya-ui/form';
import { vTable as vTableTag, vTree } from '@yoyaflow/yoya-ui/data-display';
import { createRouter, Router, renderPage, hydrateOrMount } from '@yoyaflow/yoya-ui/router';      // 路由 + SSR
import { renderPage as renderOnServer, vBody } from '@yoyaflow/yoya-ui/ssr';                      // 服务端完整入口（core + html + layout + router）
import { createI18n, initYoyaTheme, announce } from '@yoyaflow/yoya-ui/tools';                   // i18n / 主题 / a11y / 作者契约
import { vEchart } from '@yoyaflow/yoya-ui/echart';                    // 自备 echarts（chart.echartsLib(echarts)）
import { vThree } from '@yoyaflow/yoya-ui/three';                      // 自备 three
import { RequestBase, Result } from '@yoyaflow/yoya-ui/api';           // 通讯辅助（= core/api）
import { enableDevtools } from '@yoyaflow/yoya-ui/dev';                // DevTools（旧名 /devtools 仍可用）
import { svg, svgs, ArrowUpOutlined } from '@yoyaflow/yoya-ui/svg';    // SVG 元素面（= core 那一份）
import { div, ref, vText } from '@yoyaflow/yoya-ui/core';              // 引擎原语转发（与 core 共用实例）
import { yoyaCompile } from '@yoyaflow/yoya-ui/compiler';              // 构建期编译器（= 下面的 compiler 包）
import '@yoyaflow/yoya-ui/ui.css';                                     // 组件皮肤（必引）`
      },
      {
        title: '5. 导出物（三）@yoyaflow/yoya-compiler —— 可选编译路径',
        paragraphs: [
          '编译器把重复单元（表格行、列表项、树节点）在构建期编成「静态片段 + 位置寻址的写操作」。它是可选包，运行期钩子由产物自动从 core 引入。'
        ],
        code: `import { yoyaCompile } from '@yoyaflow/yoya-compiler';   // unplugin 插件：yoyaCompile.vite({ core }) / .rollup() / .esbuild() …
import { compileFile, reportCoverage } from '@yoyaflow/yoya-compiler'; // 程序化 API 与覆盖率报告

# npm i -D @yoyaflow/yoya-compiler @babel/parser`
      },
      {
        title: '6. CDN —— 免构建，直接引入',
        paragraphs: [
          'CDN 上直接可用的是**自包含单文件**（core 内联在里面）；下面的增量入口是单行转发、core 走 peer，从 URL 直接 import 需要 import map。'
        ],
        code: `<!-- 自包含：core 单文件（引擎 + 元素面 + 图标集，≈95 kB min） -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.4/dist/yoya.ui.css" />
<script type="module">
  import { div, svg, ref, vText } from
    'https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.4/dist/yoya.core.min.js';
  // 全量（core + 组件 + 路由/SSR，≈349 kB min）：      dist/yoya.ui.full.min.js
  // 全量 + 路由（≈377 kB min）：                      dist/yoya.ui-router.full.min.js
</script>

<!-- 想在 CDN 上用包名写法（含组件子入口）：加一张 import map -->
<script type="importmap">
{
  "imports": {
    "@yoyaflow/yoya-ui": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-ui@0.7.4/dist/ui.js",
    "@yoyaflow/yoya-core": "https://cdn.jsdelivr.net/npm/@yoyaflow/yoya-core@0.7.4/dist/index.js"
  }
}
</script>`
      },
      {
        title: '7. 样式与类型',
        code: `import '@yoyaflow/yoya-ui/ui.css';   // 打包器：组件皮肤与主题变量
<link rel="stylesheet" href=".../dist/yoya.ui.css" />   // CDN：同一个文件

# 类型：每个入口都有对应声明（types/*.d.ts），随包发布，打包器/编辑器自动生效
# 发布内容只有 dist/ 与 types/ —— 不含 docs/ 与源码`
      },
      {
        title: '8. 命名与兼容口径',
        points: [
          '旧命名入口（dist/yoya.ui.js、*.min.js 等）保留且内容即当前版本；模块镜像 dist/core/**、dist/actions/** 是旧深引用的落点。',
          '@yoyaflow/yoya-ui/core 是 @yoyaflow/yoya-core 的转发入口，两者共用同一实例；/devtools 是 /dev 的别名（core 与 ui 都一样）。',
          '自包含单文件（yoya.core.min.js / *.full.min.js）不要与 @yoyaflow/yoya-core 包混用：两份 core 会让 instanceof / 身份判定失配。',
          '业务代码请用公开入口；/internal/* 深引用只面向库内（core 另有白名单子路径）。'
        ]
      }
    ]
  });
}
