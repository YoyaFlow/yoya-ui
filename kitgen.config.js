/**
 * yoya-ui 的 kitgen 配置——manifest 生成从此只维护这一份。
 *
 * 运行：npm run kit:generate（wrapper 会调 yoya-genui 的通用生成器）。
 */
export default {
  src: 'packages/yoya-ui/src',
  out: 'packages/yoya-ui/genui-kit.json',
  namespace: 'yoyaflow/yoya-ui',
  pkg: 'packages/yoya-ui/package.json',
  runtime: { genui: '>=0.2 <0.3' },
  generated: {
    from: 'source-scan + JSDoc @genui tags',
    notice:
      '工厂清单勿手改——重跑 scripts/generate-genui-kit.mjs；文档写在组件源码 JSDoc（@genui* 标签）'
  },
  categories: {
    actions: 'actions',
    form: 'form',
    'data-display': 'data-display',
    feedback: 'feedback',
    navigation: 'navigation',
    layout: 'layout',
    components: 'basic',
    chart: 'media',
    async: 'feedback',
    effects: 'feedback',
    i18n: 'basic',
    theme: 'basic',
    router: 'navigation',
    three: 'media',
    testing: null
  },
  factories: {
    pascalPrefix: 'V',
    shortcutPrefix: 'v',
    shortcutHelpers: ['createComponentShortcut'],
    // 归一出口：通用原语 + 表单控件族自己的入口（`applyPropValue` 与 `asSignal` 语义等价：
    // 给句柄就登记绑定、给普通值就落位）。认出它，门禁就不必逼着组件改写。
    normalizeHelpers: ['asSignal', 'asSignalJson', 'applyPropValue'],
    extraPatterns: [
      {
        // yoya-ui 的布局工厂形态：小写名 + (first, second, third) 三参
        regex: 'export function ([a-z]\\w*)\\(first = null, second = null, third = null\\)',
        category: 'layout'
      }
    ]
  },
  elements: {
    html: {
      module: '@yoyaflow/yoya-core/html',
      blocked: [
        'HtmlElementNode',
        'createHtmlFactories',
        'script',
        'iframe',
        'object',
        'embed',
        'base',
        'link',
        'meta',
        'styleTag',
        'template',
        'title',
        'head',
        'html',
        'body',
        'noscript',
        'slot',
        'canvas'
      ]
    },
    svg: {
      module: '@yoyaflow/yoya-core/svg',
      blocked: ['svgs', 'SvgElementNode', 'SVG_NAMESPACE']
    }
  },
  exclude: [/\.test\./],
  plugin: {
    out: 'packages/yoya-ui/genui-plugin.js',
    runtimeImport: '@yoyaflow/yoya-core/genui',
    factoryImports: [
      { module: '@yoyaflow/yoya-ui/ui' },
      { module: '@yoyaflow/yoya-ui/router' },
      { module: '@yoyaflow/yoya-ui/echart' },
      { module: '@yoyaflow/yoya-ui/three' }
    ],
    // vTable 的内部部件：公开入口未导出（随 vTable 内部使用），manifest 里仍可见
    exclude: ['vTableCaption', 'vTableGrid', 'vTableScroll'],
    default: true,
    repo: 'https://github.com/yoyaflow/yoya-ui.git',
    aliases: ['yoya-ui'],
    coreFactories: [
      'center',
      'container',
      'divider',
      'flex',
      'grid',
      'hstack',
      'mobileLayout',
      'responsiveGrid',
      'spacer',
      'stack',
      'vBody',
      'vCol',
      'vContainer',
      'vRow',
      'vstack'
    ],
    kinds: {
      vCardBody: 'element',
      vCardFooter: 'element',
      vCardHeader: 'element',
      vSlot: 'element'
    }
  }
};
