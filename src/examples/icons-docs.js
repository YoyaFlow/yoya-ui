import {
  CloseOutlined,
  codeBlock,
  CodeOutlined,
  CopyOutlined,
  section,
  toast,
  vCard,
  vDialog
} from '../index.js';
import { applyDemoStyles } from './demo-styles.js';
import * as icons from '../index.js';

const iconDescriptions = Object.freeze({
  ArrowDownOutlined: '向下箭头',
  ArrowLeftOutlined: '向左箭头',
  ArrowRightOutlined: '向右箭头',
  ArrowUpOutlined: '向上箭头',
  BellOutlined: '通知提醒',
  CalendarOutlined: '日期日历',
  CheckOutlined: '勾选确认',
  ChevronDownOutlined: '向下展开',
  ChevronLeftOutlined: '向左返回',
  ChevronRightOutlined: '向右进入',
  ChevronUpOutlined: '向上收起',
  CloseOutlined: '关闭取消',
  CodeOutlined: '代码',
  CopyOutlined: '复制',
  DownloadOutlined: '下载',
  EditOutlined: '编辑',
  ExternalOutlined: '外部链接',
  EyeOutlined: '查看',
  FileOutlined: '文件',
  FolderOutlined: '文件夹',
  FolderOpenOutlined: '文件夹打开',
  HeartOutlined: '收藏',
  HomeOutlined: '首页',
  ImageOutlined: '图片',
  InfoOutlined: '信息提示',
  LockOutlined: '锁定',
  LogoutOutlined: '退出登录',
  MailOutlined: '邮件',
  MenuOutlined: '菜单',
  MinusOutlined: '减少',
  MoreHorizontalOutlined: '更多操作',
  PlusOutlined: '增加',
  RefreshOutlined: '刷新',
  SearchOutlined: '搜索',
  SettingsOutlined: '设置',
  StarOutlined: '星标',
  TrashOutlined: '删除',
  UploadOutlined: '上传',
  UserOutlined: '用户',
  WarningOutlined: '警告'
});

const iconEntries = Object.keys(icons)
  .filter((name) => /^[A-Z].*Outlined$/.test(name) && typeof icons[name] === 'function')
  .sort()
  .map((name) => ({
    description: iconDescriptions[name] ?? '常用图标',
    factory: icons[name],
    name
  }));

const exampleSource = `import { SearchOutlined, SettingsOutlined, UploadOutlined } from '@yoyaflow/yoya-ui';

div((page) => {
  page.child(SearchOutlined());
  page.child(SettingsOutlined());
  page.child(UploadOutlined());
});`;

function formatIconSource(factory) {
  return `export ${factory
    .toString()
    .replace(/\(0,\s*__vite_ssr_import_\d+__\.([A-Za-z_$][\w$]*)\)/g, '$1')
    .replace(/__vite_ssr_import_\d+__\.([A-Za-z_$][\w$]*)/g, '$1')}`;
}

async function copyIconUsage(name) {
  const text = `${name}()`;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    }

    toast.success(`已复制 ${text}`);
  } catch {
    // Clipboard access can be unavailable in restricted contexts.
  }

  return text;
}

export function IconsDocumentationPage() {
  let sourceDialog = null;

  const showIconSource = (name, factory) => {
    sourceDialog.content((content) => {
      content.child(
        vCard((card) => {
          card.vCardHeader((header) => {
            header.className('components-icon-source-dialog-header');
            header.styles({
              alignItems: 'center',
              display: 'flex',
              gap: '10px',
              justifyContent: 'space-between'
            });
            header.hstack((title) => {
              title.className('components-icon-source-dialog-title');
              title.styles({
                alignItems: 'center',
                display: 'flex',
                gap: '8px',
                minWidth: '0'
              });
              title.strong('图标源码');
              title.span(name);
            });
            header.child(
              CloseOutlined()
                .styles({
                  background: 'transparent',
                  border: '0',
                  boxShadow: 'none',
                  color: 'var(--yoya-color-text-muted, #64748b)',
                  cursor: 'pointer',
                  height: '16px',
                  outline: 'none',
                  width: '16px'
                })
                .attr({
                  'aria-label': '关闭',
                  role: 'button',
                  tabindex: '0',
                  title: '关闭'
                })
                .on('click', () => sourceDialog.close())
                .on('keydown', (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    sourceDialog.close();
                  }
                })
            );
          });
          card.vCardBody((body) => {
            body.pre((source) => {
              source.className('components-icon-source-dialog-code');
              source.code((code) => code.text(formatIconSource(factory)));
            });
          });
        })
      );
    });
    applyDemoStyles(sourceDialog);
    sourceDialog.open(true);
  };

  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-icons-page');
        page.attr('data-icons-page', 'true');
        page.h1('SVG 图标');
        page.p('统一使用 24x24 viewBox、currentColor 描边，可以按名称直接引入。');

        const sourceBlock = codeBlock({
          content: exampleSource,
          copyLabel: '复制示例代码',
          language: 'js'
        });
        const copySource = sourceBlock.copy.bind(sourceBlock);
        sourceBlock.copy = async () => {
          const content = await copySource();
          toast.success('源码已复制');
          return content;
        };
        page.section((sourceSection) => {
          sourceSection.className('components-icons-source-section');
          sourceSection.attr('data-icons-source-section', 'true');
          sourceSection.h2('源码示例');
          sourceSection.p('下面这段代码演示三个常用图标的引入和渲染方式。');
          sourceSection.child(sourceBlock);
        });

        page.section((api) => {
          api.className('components-icons-api');
          api.attr('data-icons-api', 'true');
          api.h2('API 说明');
          api.p('每个图标都是独立函数，调用后返回一个 SvgElementNode。');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('函数');
                row.th('说明');
                row.th('返回');
              });
            });
            table.tbody((body) => {
              [
                ['ArrowDownOutlined()', '向下箭头', 'SvgElementNode'],
                ['SearchOutlined()', '搜索图标', 'SvgElementNode'],
                ['UploadOutlined()', '上传图标', 'SvgElementNode'],
                ['其余 XxxOutlined()', '与上述图标保持相同结构', 'SvgElementNode']
              ].forEach(([name, purpose, returns]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td(returns);
                });
              });
            });
          });
          api.ul((list) => {
            [
              '默认尺寸为 24x24。',
              '默认 fill 为 none。',
              '默认 stroke 为 currentColor。',
              '默认 aria-hidden 为 true。'
            ].forEach((item) => list.li(item));
          });
        });

        sourceDialog = vDialog({ open: false });
        sourceDialog.attr('data-icon-source-dialog', 'true');
        sourceDialog.className('components-icon-source-dialog');
        page.child(sourceDialog);

        page.div((grid) => {
          grid.className('components-icons-grid');
          grid.attr('data-icons-grid', 'true');
          iconEntries.forEach(({ description, factory, name }) => {
            const icon = factory();
            grid.article((cell) => {
              cell.className('components-icon-cell');
              cell.attr('data-icon-name', name);
              cell.div((symbol) => {
                symbol.className('components-icon-symbol');
                symbol.child(icon);
              });
              cell.strong(name);
              cell.span((descriptionNode) => {
                descriptionNode.className('components-icon-description');
                descriptionNode.text(description);
              });
              cell.vSymbolButton((sourceButton) => {
                sourceButton.className('components-icon-source-trigger');
                sourceButton.ariaLabel('查看源码定义');
                sourceButton.attr('title', '源码定义');
                sourceButton.icon(CodeOutlined());
                sourceButton.on('click', (event) => {
                  event.stopPropagation();
                  showIconSource(name, factory);
                });
              });
              cell.vSymbolButton((button) => {
                button.className('components-icon-copy');
                button.ariaLabel(`复制 ${name} 代码`);
                button.icon(CopyOutlined());
                button.on('click', (event) => {
                  event.stopPropagation();
                  void copyIconUsage(name);
                });
              });
            });
          });
        });
      });
    }
  };
}
