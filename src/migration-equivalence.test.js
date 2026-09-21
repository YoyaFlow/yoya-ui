/**
 * 组件迁移等价性金标（波 0 的夹具升级版）。
 *
 * 每个用例把组件渲染到真实容器，冻结四段签名：**逐节点 DOM** / `toHTML()` / **命令探测** /
 * **销毁残留**。迁移（C/B → vNode）前后这几段必须逐字不变——不然这个测试就红。
 *
 * 工作流：
 * 1. 迁移某组件前，先在 `CASES` 里加一条（中性形状，只用公开 API）；
 * 2. `UPDATE_MIGRATION_GOLDEN=1 npx vitest run src/migration-equivalence.test.js` 生成金标，
 *    粘贴进 `GOLDEN`（输出同时落在 `.scratch/migration-snapshots/migration-golden.txt`）；
 * 3. 迁移；4. `npx vitest run src/migration-equivalence.test.js` 必须仍然全绿。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as core from './yoya.core.js';
import * as ui from './yoya.ui.js';

const api = { ...core, ...ui };

/** 与迁移前快照同一口径：属性按名排序、文本节点显式标出。 */
const signature = (node) => {
  if (node.nodeType === 3) {
    return `#text:${node.textContent}`;
  }
  const attrs = [...node.attributes]
    .map((item) => `${item.name}=${item.value}`)
    .sort()
    .join(' ');
  const children = [...node.childNodes].map(signature).join('');
  return `<${node.tagName.toLowerCase()} ${attrs}>${children}`;
};

/** 序列化差异归一（见 compiler-landing 票 08：style 文本 / 属性排序）。 */
const normalizeHtml = (html) =>
  html.replace(/\sstyle="([^"]*)"/g, (whole, value) => {
    const declarations = value
      .split(';')
      .map((item) => item.trim())
      .filter(Boolean)
      .sort()
      .join(';');
    return ` style="${declarations}"`;
  });

const CASES = [
  {
    name: 'vTransition / 默认',
    build: () => api.vTransition((transition) => transition.span('内容')),
    probe: (node) => ({ shown: node.show(), motion: node.motion() })
  },
  {
    name: 'vTransition / leave + duration',
    build: () => api.vTransition({ duration: 120, shown: false }, (t) => t.span('内容')),
    probe: (node) => ({ shown: node.show(), duration: node.duration() })
  },
  {
    name: 'vButton / 文本 + variant',
    build: () =>
      api.vButton('保存', (button) => {
        button.variant('primary');
        button.attr('data-role', 'save');
      }),
    probe: (node) => ({ variant: node.variant() })
  },
  {
    name: 'vBadge / 文本 + 类型',
    build: () => api.vBadge('新', { type: 'primary' }),
    probe: () => null
  },
  {
    name: 'vCard / header + body + footer',
    build: () =>
      api.vCard((card) => {
        card.vCardHeader('标题');
        card.vCardBody((body) => body.p('正文'));
        card.vCardFooter('页脚');
      }),
    probe: () => null
  },
  {
    name: 'vProgress / 百分比',
    build: () => api.vProgress({ value: 40 }),
    probe: (node) => ({ value: node.value() })
  },
  {
    name: 'vTabs / 两个页签',
    build: () =>
      api.vTabs((tabs) => {
        tabs.vTab('概览', () => api.p('A'));
        tabs.vTab('详情', () => api.p('B'));
      }),
    probe: (node) => ({ active: node.active() })
  },
  {
    name: 'vSteps / 两步',
    build: () =>
      api.vSteps({ current: 1 }, (steps) => {
        steps.vStep({ title: '第一步' });
        steps.vStep({ title: '第二步' });
      }),
    probe: (node) => ({ current: node.current() })
  },
  {
    name: 'vForm / 采集链',
    build: () =>
      api.vForm((form) => {
        form.vFormItem((item) => {
          item.label('名称').name('title');
          item.control((editor) => editor.vInput({ name: 'title', value: '初始' }));
        });
      }),
    probe: (node) => ({ values: node.values(), valid: node.validate() })
  },
  {
    name: 'vPagination / 分页（命令 + update）',
    build: () => api.vPagination({ page: 2, pageSize: 10, total: 95 }),
    probe: (node) => ({
      page: node.page(),
      pageSize: node.pageSize(),
      totalPages: node.totalPages()
    })
  },
  {
    name: 'vDialog / 标题 + 内容',
    build: () =>
      api.vDialog({ title: '提示' }, (dialog) => {
        dialog.child(api.p('内容'));
      }),
    probe: () => null
  },
  {
    name: 'vScroll / 空容器',
    build: () => api.vScroll((scroll) => scroll.style('height', '120px')),
    probe: (node) => ({
      threshold: node.threshold(),
      virtual: node.virtual(),
      itemHeight: node.itemHeight()
    })
  },
  {
    name: 'vMenu / 分组 + 分隔线 + 项目',
    build: () =>
      api.vMenu((menu) => {
        menu.vMenuGroup((group) => {
          group.label('文件操作');
          group.vMenuItem('新建');
          group.vMenuItem({ disabled: true, text: '删除' });
        });
        menu.vMenuDivider();
        menu.vMenuItem('退出');
      }),
    probe: (menu) => ({
      children: menu.children().length,
      orientation: menu.attr('data-orientation')
    })
  },
  {
    name: 'vSubMenu / 嵌套菜单',
    build: () =>
      api.vMenu((menu) => {
        menu.vSubMenu((submenu) => {
          submenu.label('更多操作');
          submenu.menuContent((nested) => nested.vMenuItem('导出'));
        });
      }),
    probe: (menu) => ({ children: menu.children().length })
  },
  {
    name: 'vSidebar / 标题 + 菜单',
    build: () =>
      api.vSidebar({
        ariaLabel: '后台主导航',
        title: '运维中心',
        menuContent(menu) {
          menu.vMenuItem({ active: true, text: '概览' });
        }
      }),
    probe: (sidebar) => ({ tag: sidebar.tagName() })
  },
  {
    name: 'vAnchor / 三条锚点',
    build: () =>
      api.vAnchor({ ariaLabel: '页面锚点', offset: 64 }, (anchor) => {
        anchor.vAnchorItem({ href: '#intro', title: '介绍' });
        anchor.vAnchorItem({ href: '#usage', title: '用法' });
      }),
    probe: (anchor) => ({
      offset: anchor.offset(),
      active: anchor.active(),
      count: anchor.items().length
    })
  },
  {
    name: 'vAnchorItem / 独立项',
    build: () => api.vAnchorItem({ href: '#alone', title: '独立项' }),
    probe: (item) => ({ href: item.href(), active: item.attr('data-active') ?? null })
  },
  {
    name: 'vScroll / 静态列表',
    build: () =>
      api.vScroll((scroll) => {
        scroll.items([1, 2, 3]);
        scroll.renderItem((item) => api.div((row) => row.span(`第 ${item} 行`)));
        scroll.itemHeight(40);
        scroll.threshold(120);
      }),
    probe: (scroll) => ({
      itemHeight: scroll.itemHeight(),
      threshold: scroll.threshold(),
      virtual: scroll.virtual(),
      page: scroll.page()
    })
  },
  {
    // 注意：带自增 id 的用例一律追加在末尾——插在中间会让后面用例的 id 计数漂移
    name: 'vTree / 多级节点（可勾选）',
    build: () =>
      api.vTree({
        checkable: true,
        nodes: [
          {
            id: 'group-a',
            label: '分组一',
            children: [
              { id: 'leaf-a1', label: '叶子一' },
              { id: 'leaf-a2', label: '叶子二' }
            ]
          },
          { id: 'group-b', label: '分组二', children: [{ id: 'leaf-b1', label: '叶子三' }] }
        ]
      }),
    probe: (tree) => ({
      nodes: tree.nodes().length,
      checked: tree.checkedKeys().length,
      expanded: tree.expandedKeys().length,
      selected: tree.selectedKeys().length
    })
  },
  {
    name: 'vTree / 展开全部 + 选中叶子',
    build: () => {
      const tree = api.vTree({
        nodes: [{ id: 'p', label: '父节点', children: [{ id: 'c', label: '子节点' }] }]
      });
      tree.expandAll();
      tree.select('c');
      return tree;
    },
    probe: (tree) => ({
      expanded: tree.expandedKeys(),
      selected: tree.selectedKeys()
    })
  },
  {
    name: 'vTable / 声明式 thead + tbody + tfoot',
    build: () =>
      api.vTable((table) => {
        table.caption('季度报表');
        table.vThead((head) => head.vTr((row) => row.vTh('列一').vTh('列二')));
        table.vTbody((body) => body.vTr((row) => row.vTd('甲').vTd('乙')));
        table.vTfoot((foot) => foot.vTr((row) => row.vTd('合计').vTd('2')));
      }),
    // 声明式表格不装数据：行数只能从 DOM 读（数据驱动那层在 vTableWrapper）
    probe: (table, host) => ({
      caption: table.caption(),
      bodyRows: host.querySelectorAll('tbody tr').length
    })
  },
  {
    name: 'vTableWrapper / 数据驱动列 + 行',
    build: () =>
      api.vTableWrapper({
        columns: [
          { key: 'name', title: '名称' },
          { key: 'value', title: '数值' }
        ],
        rows: [
          { id: '甲', name: '甲', value: 1 },
          { id: '乙', name: '乙', value: 2 }
        ]
      }),
    probe: (table) => ({
      columns: table.columns().length,
      rows: table.rows().length,
      emptyText: table.emptyText()
    })
  },
  {
    name: 'vTabs / 两个页签 + 激活项',
    build: () =>
      api.vTabs({
        items: [
          { key: 'overview', label: '概览', content: '概览面板' },
          { key: 'config', label: '配置', content: '配置面板' }
        ]
      }),
    probe: (tabs) => ({
      active: tabs.active(),
      index: tabs.activeIndex(),
      orientation: tabs.orientation(),
      variant: tabs.variant()
    })
  },
  {
    name: 'vCarousel / 三张幻灯片',
    build: () =>
      api.vCarousel({
        slides: ['甲', '乙', '丙'],
        renderItem: (item) => api.div((slide) => slide.span(String(item)))
      }),
    probe: (carousel) => ({
      active: carousel.active(),
      slides: carousel.slides().length,
      loop: carousel.loop(),
      autoplay: carousel.autoplay()
    })
  },
  {
    name: 'vSteps / 三步 + 当前项',
    build: () =>
      api.vSteps({ current: 1 }, (steps) => {
        steps.vStep({ title: '填写信息' });
        steps.vStep({ title: '确认信息' });
        steps.vStep({ title: '完成' });
      }),
    probe: (steps) => ({
      current: steps.current(),
      items: steps.items().length,
      status: steps.status()
    })
  },
  {
    name: 'vTimeline / 两条记录',
    build: () =>
      api.vTimeline((timeline) => {
        timeline.vTimelineItem({ status: 'success', title: '已创建', time: '09:00' });
        timeline.vTimelineItem({ status: 'processing', title: '部署中', time: '09:30' });
      }),
    probe: (timeline) => ({ children: timeline.children().length })
  },
  {
    name: 'vTreeTable / 两层节点',
    build: () =>
      api.vTreeTable({
        columns: [
          { key: 'name', title: '名称' },
          { key: 'count', title: '数量' }
        ],
        nodes: [
          {
            id: 'root',
            name: '根节点',
            count: 2,
            children: [{ id: 'child', name: '子节点', count: 2 }]
          }
        ]
      }),
    probe: (treeTable) => ({
      visible: treeTable.visibleRowCount(),
      expanded: treeTable.expandedKeys()
    })
  },
  {
    name: 'vTooltip / 内容 + 位置',
    build: () => api.vTooltip({ content: '提示文字', placement: 'top' }),
    // 只读属性：`content()` / `placement()` 是链式写方法（无参不返回文本）
    probe: (tooltip) => ({
      role: tooltip.attr('role') ?? null,
      'data-placement': tooltip.attr('data-placement') ?? null
    })
  },
  {
    name: 'vMessageContainer / 空容器',
    build: () => api.vMessageContainer({ placement: 'top-right' }),
    probe: (container) => ({
      'data-placement': container.attr('data-placement') ?? null,
      'data-inline': container.attr('data-inline') ?? null
    })
  },
  {
    name: 'vSplitPanel / 两块面板',
    build: () =>
      api.vSplitPanel((panel) => {
        panel.first((first) => first.p('左'));
        panel.second((second) => second.p('右'));
      }),
    probe: (panel) => ({ direction: panel.direction(), size: panel.size() })
  },
  {
    name: 'vInput / 值 + 占位 + 禁用',
    build: () =>
      api.vInput({
        disabled: true,
        name: 'service',
        placeholder: '请输入服务名',
        value: '网关'
      }),
    probe: (input) => ({
      disabled: input.isDisabled(),
      placeholder: input.attr('placeholder') ?? null,
      value: input.value()
    })
  },
  {
    name: 'vTextarea / 多行 + 行数',
    build: () => api.vTextarea({ name: 'note', rows: 3, value: '第一行\n第二行' }),
    probe: (node) => ({ rows: node.rows(), value: node.value() })
  },
  {
    name: 'vSelect / 选项 + 选中值',
    build: () =>
      api.vSelect({
        options: [
          { label: '甲', value: 'a' },
          { label: '乙', value: 'b' }
        ],
        value: 'b'
      }),
    probe: (node) => ({ options: node.options().length, value: node.value() })
  },
  {
    name: 'vCheckbox / 标签 + 选中态',
    build: () => api.vCheckbox({ checked: true, label: '启用自动部署', value: 'auto' }),
    probe: (node) => ({ checked: node.checked(), value: node.value() })
  },
  {
    name: 'vSwitch / 开关 + 选中态',
    build: () => api.vSwitch({ checked: true, label: '自动发布' }),
    probe: (node) => ({ checked: node.checked(), value: node.value() })
  },
  {
    name: 'vRadio / 标签 + 说明 + 选中态',
    build: () =>
      api.vRadio({
        checked: true,
        description: '发布后自动执行',
        label: '自动部署',
        value: 'auto'
      }),
    probe: (node) => ({ checked: node.checked(), value: node.value() })
  },
  {
    name: 'vRadios / 互斥单选组',
    build: () =>
      api.vRadios({
        name: 'env',
        options: [
          { label: '开发', value: 'dev' },
          { label: '生产', value: 'prod' }
        ],
        value: 'dev'
      }),
    probe: (node) => ({ value: node.value() })
  },
  {
    name: 'vCheckboxes / 多选组',
    build: () =>
      api.vCheckboxes({
        multiple: true,
        name: 'targets',
        options: [
          { label: '甲', value: 'a' },
          { label: '乙', value: 'b' }
        ],
        value: ['a']
      }),
    probe: (node) => ({ value: node.value() })
  },
  {
    name: 'vField / 展示态 + 编辑器',
    build: () =>
      api.vField((field) => {
        field.label('状态');
        field.control((editor) => editor.vInput({ name: 'status', value: '运行中' }));
        field.value('运行中');
      }),
    probe: (field) => ({ display: field.display(), mode: field.mode(), value: field.value() })
  },
  {
    name: 'vFormItem / 必填 + 提示',
    build: () =>
      api.vFormItem({
        hint: '用于接收通知',
        label: '邮箱',
        name: 'email',
        required: '该项为必填'
      }),
    // `required()` 有默认值（写方法），读态走属性，避免探针把节点自己串进 JSON
    probe: (item) => ({ name: item.name(), 'data-required': item.attr('data-required') ?? null })
  },
  {
    name: 'vForm / 必填校验（空值报错）',
    build: () =>
      api.vForm((form) => {
        form.vFormItem((item) => {
          item.label('邮箱').name('email').required('该项为必填');
          item.control((editor) => editor.vInput({ name: 'email' }));
        });
      }),
    probe: (form) => ({ values: form.values(), valid: form.validate() })
  },
  {
    name: 'vTimer / 日期时间模式',
    build: () =>
      api.vTimer({ mode: 'datetime-local', name: 'scheduledAt', value: '2026-08-19T14:30' }),
    probe: (node) => ({ mode: node.mode(), value: node.value() })
  },
  {
    name: 'vTimerRange / 起止值',
    build: () => api.vTimerRange({ end: '2026-08-20', name: 'window', start: '2026-08-19' }),
    probe: (node) => ({ mode: node.mode(), name: node.name(), value: node.value() })
  },
  {
    name: 'vButtons / 选项 + 单选联动',
    build: () =>
      api.vButtons({
        options: [
          { label: '全部', value: 'all' },
          { label: '运行中', value: 'running' }
        ],
        selectable: true,
        value: 'running',
        variant: 'secondary'
      }),
    probe: (group) => ({ count: group.options().length, value: group.value() })
  },
  {
    name: 'vFloatButton / 图标 + 标签 + 固定定位',
    build: () =>
      api.vFloatButton({
        fixed: true,
        icon: '＋',
        label: '新建',
        position: 'bottom-right',
        size: 'large',
        variant: 'primary'
      }),
    probe: (node) => ({ position: node.position(), size: node.size(), variant: node.variant() })
  },
  {
    name: 'vSymbolButton / 图标 + 无障碍标签',
    build: () => api.vSymbolButton({ ariaLabel: '复制', icon: '⧉', title: '复制内容' }),
    probe: (node) => ({ ariaLabel: node.ariaLabel() })
  },
  {
    name: 'vGlowButton / 流光参数 + 继承按钮态',
    build: () =>
      api.vGlowButton('立即部署', (button) => {
        button.glow({ direction: 'rtl', motion: 'always', play: 'hover', ripple: 'off' });
        button.size('small');
      }),
    probe: (button) => ({ glow: button.glow(), size: button.size() })
  },
  {
    name: 'vSlider / 范围 + 当前值',
    build: () =>
      api.vSlider({ max: 10, min: 0, name: 'weight', step: 2, value: 6, vertical: true }),
    probe: (slider) => ({
      max: slider.max(),
      min: slider.min(),
      step: slider.step(),
      value: slider.value(),
      vertical: slider.vertical()
    })
  },
  {
    name: 'vRate / 半星 + 只读',
    build: () =>
      api.vRate((rate) => {
        rate.count(5).allowHalf(true).value(3.5);
        rate.name('score').readonly(true);
      }),
    probe: (rate) => ({ count: rate.count(), readonly: rate.readonly(), value: rate.value() })
  },
  {
    name: 'vTagsInput / 标签 + 占位',
    build: () =>
      api.vTagsInput({ name: 'labels', placeholder: '输入后回车添加', value: ['甲', '乙'] }),
    probe: (node) => ({ name: node.name(), placeholder: node.placeholder(), value: node.value() })
  },
  {
    name: 'vUpload / 拖拽区 + 文件列表',
    build: () =>
      api.vUpload({
        accept: '.txt,.png',
        files: [new File(['content'], 'a.txt', { type: 'text/plain' })],
        multiple: true,
        name: 'attachments'
      }),
    probe: (upload) => ({
      accept: upload.accept(),
      multiple: upload.multiple(),
      names: upload.files().map((file) => file.name)
    })
  },
  {
    name: 'vUpload / 回调写法（multiple 提示跟上）',
    build: () =>
      api.vUpload((upload) => {
        upload.multiple(true).accept('.txt');
      }),
    probe: (upload) => ({
      accept: upload.accept(),
      hint: upload.attr('data-multiple') ?? null,
      multiple: upload.multiple()
    })
  },
  {
    name: 'vAvatarUpload / 空态 + 方形尺寸',
    build: () => api.vAvatarUpload({ name: 'avatar', shape: 'square', size: 72 }),
    probe: (upload) => ({
      accept: upload.accept(),
      shape: upload.shape(),
      size: upload.size(),
      value: upload.value()
    })
  },
  {
    name: 'vAvatarUpload / 禁用 + 自定义 accept',
    build: () => api.vAvatarUpload({ accept: '.png', disabled: true, name: 'avatar' }),
    probe: (upload) => ({ accept: upload.accept(), disabled: upload.disabled() })
  },
  {
    name: 'vSvgIconPicker / 触发器 + 自选图标',
    build: () =>
      api.vSvgIconPicker({
        icons: ['BellOutlined', 'CalendarOutlined'],
        name: 'icon',
        value: 'BellOutlined'
      }),
    probe: (picker) => ({ icons: picker.icons(), name: picker.name(), value: picker.value() })
  },
  {
    name: 'vSvgIconPicker / 打开弹窗',
    build: () =>
      api.vSvgIconPicker((picker) => {
        picker.icons(['BellOutlined']).open(true);
      }),
    probe: (picker) => ({ expanded: picker.attr('aria-expanded') ?? null })
  },
  {
    name: 'vColorPicker / 色板 + 透明度',
    build: () => api.vColorPicker({ alpha: 40, palette: ['#123456', '#abcdef'], value: '#123456' }),
    probe: (picker) => ({ alpha: picker.alpha(), rgba: picker.rgba(), value: picker.value() })
  },
  {
    name: 'vColorPicker / 未选择 + 打开弹窗',
    build: () =>
      api.vColorPicker((picker) => {
        picker.open(true);
      }),
    probe: (picker) => ({ expanded: picker.attr('aria-expanded') ?? null, value: picker.value() })
  },
  {
    name: 'vCascader / 两级选项 + 选中路径',
    build: () =>
      api.vCascader({
        options: [
          { children: [{ label: '杭州', value: 'hz' }], label: '华东', value: 'east' },
          { children: [{ label: '北京', value: 'bj' }], label: '华北', value: 'north' }
        ],
        placeholder: '选择区域',
        value: ['east', 'hz']
      }),
    probe: (cascader) => ({
      levels: cascader.options().length,
      placeholder: cascader.placeholder(),
      value: cascader.value()
    })
  },
  {
    name: 'vCascader / 打开面板',
    build: () =>
      api.vCascader((cascader) => {
        cascader
          .options([{ children: [{ label: '甲一', value: 'a1' }], label: '甲', value: 'a' }])
          .open(true);
      }),
    probe: (cascader) => ({ expanded: cascader.attr('aria-expanded') ?? null })
  },
  {
    name: 'vAutocomplete / 建议来源 + 限制条数',
    build: () =>
      api.vAutocomplete({
        limit: 2,
        name: 'stack',
        placeholder: '搜索技术栈',
        source: ['JavaScript', 'TypeScript', 'Vue'],
        value: 's'
      }),
    probe: (ac) => ({
      limit: ac.limit(),
      name: ac.name(),
      placeholder: ac.placeholder(),
      value: ac.value()
    })
  },
  {
    name: 'vAutocomplete / 回调写法',
    build: () =>
      api.vAutocomplete((ac) => {
        ac.source(['Vue', 'React']).value('v').limit(5);
      }),
    probe: (ac) => ({ source: ac.source().length, value: ac.value() })
  },
  {
    name: 'vChart / 适配器 + 尺寸',
    build: () =>
      api.vChart({
        adapter: { init: () => ({ ready: true }) },
        data: [1, 2, 3],
        height: 180,
        options: { theme: 'light' },
        width: 320
      }),
    probe: (chart) => ({
      data: chart.data(),
      height: chart.height(),
      options: chart.options(),
      width: chart.width()
    })
  },
  {
    name: 'vLazyImage / 延迟加载',
    build: () => api.vLazyImage({ alt: '缩略图', defer: true, src: '/img/a.png' }),
    probe: (image) => ({ alt: image.alt(), defer: image.defer(), state: image.loadState() })
  },
  {
    name: 'vThemeShell / 常规容器',
    build: () =>
      api.vThemeShell((shell) => {
        shell.background('#0f172a').radius('10px').scrollable();
        shell.child(api.p('内容'));
      }),
    probe: (shell) => ({ background: shell.background(), radius: shell.radius() })
  },
  {
    name: 'vThemeShell / 虚拟节点模式',
    build: () =>
      api.vThemeShell((shell) => {
        shell.virtual().background('#ffffff');
        shell.child(api.div((inner) => inner.p('子节点')));
      }),
    probe: (shell) => ({ background: shell.background(), virtual: true })
  },
  {
    name: 'vTreeRanger / 两列（未加载）',
    build: () =>
      api.vTreeRanger({
        ariaLabel: '数据字典',
        columns: [{ title: '第一列' }, { title: '第二列' }],
        minSize: 200
      }),
    probe: (browser) => ({ current: browser.current(), selected: browser.selectedKeys() })
  },
  {
    name: 'vLanguageSwitch / 两种语言',
    build: () =>
      api.vLanguageSwitch({
        languages: [
          { label: '中文', value: 'zh-CN' },
          { label: 'English', value: 'en' }
        ],
        locale: api.createI18n({ language: 'zh-CN' })
      }),
    probe: (control) => ({
      active: control.activeLanguage(),
      size: control.size(),
      variant: control.variant()
    })
  },
  {
    name: 'vAvatar / 文本 + 形状尺寸',
    build: () => api.vAvatar({ color: '#2563eb', shape: 'square', size: 'large', text: '张' }),
    probe: (avatar) => ({ color: avatar.color(), shape: avatar.shape(), size: avatar.size() })
  },
  {
    name: 'vAvatar / 图标 + 状态',
    build: () => api.vAvatar({ icon: '★', status: 'success', text: '服务' }),
    // `text()` 只有写路径（无参返回节点），读态走 aria-label
    probe: (avatar) => ({ label: avatar.attr('aria-label'), status: avatar.status() })
  },
  {
    name: 'vDetail / 三列 + 两条',
    build: () =>
      api.vDetail({
        column: 3,
        items: [
          { label: '服务名称', value: 'api-gateway' },
          { label: '状态', value: '运行中' }
        ]
      }),
    probe: (detail) => ({ columns: detail.columns(), items: detail.items().length })
  },
  {
    name: 'vDetailItem / 标签 + 值（两参写法）',
    build: () => api.vDetailItem('版本', '0.6.13'),
    probe: (item) => ({ label: item.label(), value: item.value() })
  }
];

const runCase = (item) => {
  const host = document.createElement('div');
  document.body.appendChild(host);

  // 形态 B / 返回组件对象的工厂不是 ViewNode：统一用 `child()` 包一层，四种形态都跑得通
  const built = item.build();
  const node = typeof built?.bindTo === 'function' ? built : api.div((root) => root.child(built));
  node.bindTo(host);

  const lines = [`### ${item.name}`];
  lines.push(`dom:      ${signature(host.firstElementChild ?? host)}`);
  lines.push(`toHTML:   ${normalizeHtml(node.toHTML())}`);
  // 命令探测针对**工厂返回的那个把手**（形态 B 返回对象、其余返回节点）——与使用端一致
  lines.push(`probe:    ${JSON.stringify(item.probe ? item.probe(built, host) : null)}`);

  node.destroy();
  lines.push(`residue:  ${host.innerHTML === '' ? '(空)' : host.innerHTML}`);
  lines.push('');
  host.remove();

  return lines.join('\n');
};

/** 金标文件与测试同目录；迁移前后必须逐字一致。 */
const GOLDEN_FILE = join(dirname(fileURLToPath(import.meta.url)), 'migration-golden.txt');

/** 换行与末尾空白不参与比较（不同编辑器 / 平台的差异不该算行为变化）。 */
const normalizeGolden = (text) => text.replace(/\r\n/g, '\n').trimEnd();

describe('组件迁移等价性金标（票 10 夹具升级）', () => {
  it('每个用例的 DOM / toHTML / 命令 / 销毁残留都与金标一致', () => {
    const actual = `${CASES.map(runCase).join('\n')}`.trimEnd();

    if (process.env.UPDATE_MIGRATION_GOLDEN === '1') {
      writeFileSync(GOLDEN_FILE, `${normalizeGolden(actual)}\n`, 'utf8');
      console.log(`金标已写入 ${GOLDEN_FILE}`);
      return;
    }

    expect(
      actual,
      '迁移改变了可观察行为——要么修回等价，要么确认这是有意变更后用 UPDATE_MIGRATION_GOLDEN=1 更新金标'
    ).toBe(normalizeGolden(readFileSync(GOLDEN_FILE, 'utf8')));
  });
});
