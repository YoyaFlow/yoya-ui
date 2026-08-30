import {
  codeBlock,
  vBreadcrumb,
  vCard,
  vCheckbox,
  vCheckboxes,
  vInput,
  vMessageContainer,
  vRate,
  vSelect,
  vSwitch,
  vTextarea,
  vText,
  vUpload
} from '../index.js';
import { DeploymentTaskCard } from './demos/actions.js';
import { DynamicModuleCard } from './demos/async.js';
import {
  ChartAdapterCard,
  PagedServiceTableCard,
  ServiceDetailCard,
  ServiceTableCard
} from './demos/data-display.js';
import { LocalMessageManagerCard } from './demos/feedback.js';
import {
  OwnerFieldCard,
  ScheduleTimerCard,
  ServiceFormCard,
  TimerRangeCard
} from './demos/form.js';
import { BodyPageCard } from './demos/layout.js';
import { AnchorStandaloneDemo } from './demos/anchor.js';
import { CommandMenuCard } from './demos/navigation.js';
import { RouterNavigationCard, RouterViewsEditorStandalone } from './demos/router.js';
import {
  DigitalBoardDemo,
  GaugeDemo,
  RingStatDemo,
  SparklineDemo,
  TimelineDemo,
  TrendCardDemo
} from './demos/board.js';
import {
  detailSourceRegistry,
  DropdownMenuExample1,
  ScrollExample1,
  TabsExample1
} from './detail-sources.js';

function DividerDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('分割线');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('divider 和 spacer 负责整理行内信息，适合工具栏、卡片和状态条。');
            content.div((group) => {
              group.style('display', 'grid');
              group.style('gap', '10px');
              group.p('上方内容');
              group.divider();
              group.p('下方内容');
            });
            content.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('左侧');
              row.spacer();
              row.span('右侧');
            });
            content.divider();
            content.hstack((row) => {
              row.style('gap', '12px');
              row.span('开始');
              row.divider({ orientation: 'vertical' });
              row.span('结束');
            });
          });
        });
      });
    }
  };
}

function FlexDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('弹性布局');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('flex、stack、hstack、vstack 和 center 是最常用的页面排版积木。');
            content.flex((row) => {
              row.style({ gap: '10px', flexWrap: 'wrap' });
              ['flex', 'stack', 'hstack', 'vstack', 'center'].forEach((name) => {
                row.span((pill) => {
                  pill.className('detail-pill');
                  pill.text(name);
                });
              });
            });
            content.grid((examples) => {
              examples.styles({ gap: '12px', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' });
              examples.vCard((sample) => {
                sample.vCardBody((area) => {
                  area.stack((block) => {
                    block.style('gap', '8px');
                    block.h3('stack');
                    block.p('纵向排列');
                  });
                });
              });
              examples.vCard((sample) => {
                sample.vCardBody((area) => {
                  area.center((block) => {
                    block.style('minHeight', '88px');
                    block.p('center');
                  });
                });
              });
              examples.vCard((sample) => {
                sample.vCardBody((area) => {
                  area.hstack((block) => {
                    block.style({ alignItems: 'center', gap: '8px' });
                    block.span('hstack');
                    block.spacer();
                    block.span('对齐');
                  });
                });
              });
            });
          });
        });
      });
    }
  };
}

function GridDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('栅格');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('grid 适合固定轨道，responsiveGrid 会根据视口自动切换列数。');
            content.grid((fixed) => {
              fixed.style('gap', '12px');
              fixed.style('gridTemplateColumns', 'repeat(3, minmax(0, 1fr))');
              ['A', 'B', 'C'].forEach((label) => {
                fixed.div((cell) => {
                  cell.className('detail-grid-cell');
                  cell.strong(label);
                  cell.span('固定轨道');
                });
              });
            });
            content.responsiveGrid((adaptive) => {
              adaptive.minColumnWidth(160);
              adaptive.style('gap', '12px');
              ['自适应 1', '自适应 2', '自适应 3', '自适应 4'].forEach((label) => {
                adaptive.div((cell) => {
                  cell.className('detail-grid-cell');
                  cell.strong(label);
                  cell.span('自动换列');
                });
              });
            });
          });
        });
      });
    }
  };
}

function SpacerDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('间距');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('spacer 会吸收剩余空间，常用来把行尾动作推到最右侧。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('服务状态');
              row.spacer();
              row.span((tag) => {
                tag.className('detail-pill');
                tag.text('在线');
              });
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('批量操作');
              row.spacer();
              row.vButton((button) => {
                button.label('同步');
                button.variant('secondary');
              });
              row.vButton((button) => {
                button.label('发布');
                button.variant('primary');
              });
            });
          });
        });
      });
    }
  };
}

function InputDemo() {
  const valueState = vText('yoya-ui');
  const input = vInput({
    placeholder: '输入关键字',
    value: 'yoya-ui'
  });

  input.on('input', (event) => {
    valueState.textContent(event.target.value || '未输入');
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('输入框');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vInput 适合单行文本输入，value() 和 input 事件都可以更新状态。');
            content.child(input);
            content.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('当前值');
              row.spacer();
              row.output((output) => output.child(valueState));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('写回示例值');
            button.on('click', () => {
              input.value('service-gateway');
              valueState.textContent(input.value());
            });
          });
        });
      });
    }
  };
}

function SelectDemo() {
  const valueState = vText('运行中');
  const select = vSelect({
    options: ['运行中', '维护中', '已停用'],
    value: '运行中'
  });

  select.on('change', (event) => {
    valueState.textContent(event.target.value);
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('选择框');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vSelect 适合枚举型选项，当前值可以通过 change 事件回写。');
            content.child(select);
            content.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('当前状态');
              row.spacer();
              row.output((output) => output.child(valueState));
            });
          });
        });
      });
    }
  };
}

function CheckboxDemo() {
  const singleState = vText('开启');
  const groupState = vText('sh, hz');
  const single = vCheckbox({ checked: true, label: '启用自动保存' });
  const group = vCheckboxes({
    name: 'regions',
    options: [
      { checked: true, label: '上海', value: 'sh' },
      { checked: true, label: '杭州', value: 'hz' },
      { label: '北京', value: 'bj' }
    ]
  });

  single.on('change', () => {
    singleState.textContent(single.checked() ? '开启' : '关闭');
  });

  group.on('change', () => {
    groupState.textContent(group.value().join(', ') || '无');
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('多选框');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vCheckbox 适合单一布尔项，vCheckboxes 适合多项选择。');
            content.child(single);
            content.child(group);
            content.grid((summary) => {
              summary.styles({ gap: '12px', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' });
              summary.div((cardNode) => {
                cardNode.className('detail-grid-cell');
                cardNode.span('单项状态');
                cardNode.strong(singleState);
              });
              summary.div((cardNode) => {
                cardNode.className('detail-grid-cell');
                cardNode.span('多项状态');
                cardNode.strong(groupState);
              });
            });
          });
        });
      });
    }
  };
}

function TextareaDemo() {
  const valueState = vText('初始说明');
  const textarea = vTextarea({ value: '初始说明', rows: 4 });

  textarea.on('input', (event) => {
    valueState.textContent(event.target.value || '空');
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('文本域');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vTextarea 适合较长说明，通常和字数提示一起出现。');
            content.child(textarea);
            content.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('当前内容');
              row.spacer();
              row.output((output) => output.child(valueState));
            });
          });
        });
      });
    }
  };
}

function SwitchDemo() {
  const valueState = vText('开启');
  const toggle = vSwitch({ checked: true, label: '自动部署' });

  toggle.on('change', () => {
    valueState.textContent(toggle.checked() ? '开启' : '关闭');
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('开关');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vSwitch 适合开/关型配置，视觉上比复选框更像状态开关。');
            content.child(toggle);
            content.hstack((row) => {
              row.style('alignItems', 'center');
              row.span('当前状态');
              row.spacer();
              row.output((output) => output.child(valueState));
            });
          });
        });
      });
    }
  };
}

function CardSurfaceDemo() {
  const statusState = vText('在线');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('卡片');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vCardHeader / vCardBody / vCardFooter 能组合出完整的面板结构。');
            content.vCard((sample) => {
              sample.vCardHeader('服务总览');
              sample.vCardBody((section) => {
                section.vstack((stackNode) => {
                  stackNode.style('gap', '8px');
                  stackNode.h3('api-gateway');
                  stackNode.p('当前状态稳定，最近一次发布距今 12 分钟。');
                  stackNode.hstack((row) => {
                    row.style('alignItems', 'center');
                    row.span('运行状态');
                    row.spacer();
                    row.output((output) => output.child(statusState));
                  });
                });
              });
              sample.vCardFooter((footer) => {
                footer.vButton((button) => {
                  button.label('刷新');
                  button.variant('secondary');
                  button.on('click', () => {
                    statusState.textContent(
                      statusState.textContent() === '在线' ? '维护中' : '在线'
                    );
                  });
                });
                footer.vButton((button) => {
                  button.label('查看详情');
                  button.variant('primary');
                });
              });
            });
          });
        });
      });
    }
  };
}

function CodeDisplayDemo() {
  const logBlock = codeBlock({
    content:
      '2026-08-20T12:00:00Z level=info request_id=api-42 status=ready\n' +
      '2026-08-20T12:00:01Z level=warn request_id=api-42 retry=1',
    copyLabel: '复制长块',
    language: 'log'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('代码');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vCode 适合短片段，codeBlock 适合日志和长文本。');
            content.vCode({
              content: 'SELECT id, name, state FROM services ORDER BY updated_at DESC;',
              copyLabel: '复制 SQL',
              language: 'sql'
            });
            content.child(logBlock);
          });
        });
      });
    }
  };
}

function MessageDemo() {
  const messageHost = vMessageContainer({ placement: 'top-right' });
  messageHost.styles({
    maxWidth: 'none',
    position: 'static',
    right: null,
    top: null,
    width: '100%'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('消息');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('toast 适合全局反馈，vMessageContainer 适合局部消息区域。');
            content.child(messageHost);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('成功');
            button.variant('primary');
            button.on('click', () => messageHost.success('保存成功', { duration: 0 }));
          });
          footer.vButton((button) => {
            button.label('提示');
            button.on('click', () => messageHost.info('当前是示例消息', { duration: 0 }));
          });
          footer.vButton((button) => {
            button.label('清空');
            button.variant('secondary');
            button.on('click', () => messageHost.clear());
          });
        });
      });
    }
  };
}

function BreadcrumbDemo() {
  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('面包屑');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('链接层级可以返回上级，当前页通过 aria-current 标记。');
            content.child(
              vBreadcrumb((breadcrumb) => {
                breadcrumb.ariaLabel('服务导航');
                breadcrumb.separator('/');
                breadcrumb.vBreadcrumbItem((item) => {
                  item.label('控制台');
                  item.href('/console');
                });
                breadcrumb.vBreadcrumbItem((item) => {
                  item.label('服务列表');
                  item.href('/services');
                });
                breadcrumb.vBreadcrumbItem((item) => {
                  item.label('api-gateway');
                  item.active(true);
                });
              })
            );
          });
        });
      });
    }
  };
}

function UploadDemo() {
  const upload = vUpload({ multiple: true });
  const status = vText('等待选择文件');

  upload.on('change', () => {
    status.textContent(`已选择 ${upload.files().length} 个文件`);
  });

  const simulate = () => {
    const count = upload.files().length;
    if (count === 0) {
      status.textContent('请先选择文件');
      return;
    }

    upload.items().forEach((entry, index) => {
      upload.progress(index, 30);
      upload.status(index, 'uploading');
    });
    status.textContent('上传中');

    setTimeout(() => {
      upload.items().forEach((entry, index) => {
        upload.progress(index, 100);
        upload.status(index, 'success');
      });
      status.textContent(`上传完成：${count} 个文件`);
    }, 700);
  };

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('文件上传');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('支持点击选择、拖拽上传、删除文件和展示上传进度。');
            content.child(upload);
            content.hstack((actions) => {
              actions.style({ flexWrap: 'wrap', gap: '10px' });
              actions.vButton((button) => {
                button.label('模拟上传');
                button.variant('primary');
                button.on('click', simulate);
              });
              actions.vButton((button) => {
                button.label('清空');
                button.variant('secondary');
                button.on('click', () => upload.clear());
              });
            });
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('状态');
              row.spacer();
              row.output((output) => output.child(status));
            });
          });
        });
      });
    }
  };
}

function RateDemo() {
  const rate = vRate({
    allowHalf: true,
    count: 5,
    name: 'quality',
    value: 4
  });
  const state = vText('当前评分：4');
  const syncState = () => state.textContent(`当前评分：${rate.value()}`);

  rate.on('change', syncState);

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('评分');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('vRate 支持整数和半星评分，可清空、禁用并跟随 vForm 收集。');
            content.child(rate);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('评分状态');
              row.spacer();
              row.output((output) => output.child(state));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('重置为 3.5');
              button.variant('secondary');
              button.on('click', () => {
                rate.value(3.5);
                syncState();
              });
            });
            actions.vButton((button) => {
              button.label('清空');
              button.on('click', () => rate.clear());
            });
          });
        });
      });
    }
  };
}

const detailEntries = new Map([
  [
    'general:0',
    freezeEntry({
      behavior: [
        '默认是 type="button"，不会误触发表单提交。',
        'loading 和 disabled 都会直接体现在按钮状态上。'
      ],
      component: DeploymentTaskCard,
      imports: ['vCard', 'vText'],
      notes: ['按钮状态适合演示 loading、disabled 和完成态。'],
      sourceTitle: '按钮状态核心源码',
      summary: '按钮状态、加载反馈与完成态。',
      title: '按钮'
    })
  ],
  [
    'layout:0',
    freezeEntry({
      behavior: ['横向与纵向分割都能处理，spacer 可以吸收剩余空间。'],
      component: DividerDemo,
      imports: ['divider', 'hstack', 'spacer', 'vCard'],
      notes: ['适合工具条、卡片分区和状态条。'],
      sourceTitle: '分割线核心源码',
      summary: '分割页面区域和横向排版。',
      title: '分割线'
    })
  ],
  [
    'layout:1',
    freezeEntry({
      behavior: ['flex 负责横向弹性排版，stack/vstack 负责纵向堆叠，center 适合空状态。'],
      component: FlexDemo,
      imports: ['center', 'flex', 'grid', 'hstack', 'stack', 'vCard', 'vstack'],
      notes: ['布局组件本身是最基础的组合积木。'],
      sourceTitle: '弹性布局核心源码',
      summary: '弹性布局与堆叠排版。',
      title: '弹性布局'
    })
  ],
  [
    'layout:2',
    freezeEntry({
      behavior: ['grid 适合固定列，responsiveGrid 会根据视口宽度自动换列。'],
      component: GridDemo,
      imports: ['grid', 'responsiveGrid', 'vCard'],
      notes: ['更适合仪表盘、摘要卡和密集信息区。'],
      sourceTitle: '栅格核心源码',
      summary: '固定栅格与响应式栅格。',
      title: '栅格'
    })
  ],
  [
    'layout:3',
    freezeEntry({
      behavior: ['vBody 负责页面背景、内容宽度和统一留白。'],
      component: BodyPageCard,
      imports: ['vCard'],
      notes: ['内部还可以继续组合响应式网格。'],
      sourceTitle: '页面容器核心源码',
      summary: '页面容器与响应式网格。',
      title: '布局'
    })
  ],
  [
    'layout:4',
    freezeEntry({
      behavior: ['spacer 会撑满剩余空间，最适合一行的左右对齐。'],
      component: SpacerDemo,
      imports: ['hstack', 'spacer', 'vButton', 'vCard'],
      notes: ['常见于列表行、卡片底部和工具栏。'],
      sourceTitle: '间距核心源码',
      summary: '吸收剩余空间的占位组件。',
      title: '间距'
    })
  ],
  [
    'navigation:2',
    freezeEntry({
      behavior: ['下拉菜单和上下文菜单都属于浮层操作入口。'],
      component: DropdownMenuExample1,
      imports: ['vCard', 'vDropdownMenu', 'vText'],
      notes: ['按钮触发和右键触发共用同一套菜单能力。'],
      sourceTitle: '浮层菜单核心源码',
      summary: '按钮触发和右键触发菜单。',
      title: '下拉菜单'
    })
  ],
  [
    'navigation:3',
    freezeEntry({
      behavior: ['方向键会自动跳过分组标题、分隔线和禁用项。'],
      component: CommandMenuCard,
      imports: ['vCard'],
      notes: ['适合命令面板、工具菜单和管理后台操作入口。'],
      sourceTitle: '命令菜单核心源码',
      summary: '命令菜单和分组导航。',
      title: '菜单'
    })
  ],
  [
    'navigation:4',
    freezeEntry({
      behavior: ['分页状态可以直接驱动表格切片。'],
      component: PagedServiceTableCard,
      imports: ['vCard', 'vPagination', 'vTable'],
      notes: ['适合大列表的页码浏览。'],
      sourceTitle: '分页表格核心源码',
      summary: '分页驱动的表格示例。',
      title: '分页'
    })
  ],
  [
    'navigation:6',
    freezeEntry({
      behavior: ['vTabs 提供语义化 tablist/tabpanel 和键盘切换。'],
      component: TabsExample1,
      imports: ['vTabs'],
      notes: ['适合详情页、设置页等分区内容。'],
      sourceTitle: '标签页核心源码',
      summary: '语义化标签页切换。',
      title: '标签页'
    })
  ],
  [
    'navigation:7',
    freezeEntry({
      behavior: ['vLink 负责导航，vRouterView 负责承载路由结果。'],
      component: RouterNavigationCard,
      imports: ['div', 'router', 'vCard'],
      notes: ['声明式路由和命令式路由都能在这里看见。'],
      sourceTitle: '路由链接与视图核心源码',
      summary: '路由链接、参数和视图切换。',
      title: '路由'
    })
  ],
  [
    'navigation:8',
    freezeEntry({
      behavior: ['访问过的路由会保留为文件标签。'],
      component: RouterViewsEditorStandalone,
      imports: ['div', 'vContainer', 'vRoute', 'vRouter', 'vRouterViews'],
      notes: ['适合把路由视图当成文件标签页来用。'],
      sourceTitle: 'IDE 风格路由视图核心源码',
      summary: '路由视图与标签页管理。',
      title: '路由视图'
    })
  ],
  [
    'form:0',
    freezeEntry({
      behavior: ['表单提交和字段状态由调用方掌控。'],
      component: ServiceFormCard,
      imports: ['vCard', 'vText'],
      notes: ['适合真实的资料编辑页面。'],
      sourceTitle: '基础表单核心源码',
      summary: '基础表单采集与提交。',
      title: '表单'
    })
  ],
  [
    'form:1',
    freezeEntry({
      behavior: ['输入后会即时同步到右侧状态。'],
      component: InputDemo,
      imports: ['vButton', 'vCard', 'vInput', 'vText'],
      notes: ['适合单行编辑和搜索框。'],
      sourceTitle: '输入框核心源码',
      summary: '单行文本输入。',
      title: '输入框'
    })
  ],
  [
    'form:2',
    freezeEntry({
      behavior: ['选项变化后会即时回写。'],
      component: SelectDemo,
      imports: ['vCard', 'vSelect', 'vText'],
      notes: ['适合枚举值和状态筛选。'],
      sourceTitle: '选择框核心源码',
      summary: '枚举型选项选择。',
      title: '选择框'
    })
  ],
  [
    'form:3',
    freezeEntry({
      behavior: ['vCheckbox 适合单一布尔项，vCheckboxes 适合多项选择。'],
      component: CheckboxDemo,
      imports: ['vCard', 'vCheckbox', 'vCheckboxes', 'vText'],
      notes: ['多选项可以直接收集成数组。'],
      sourceTitle: '多选框核心源码',
      summary: '单选布尔项与多项选择。',
      title: '多选框'
    })
  ],
  [
    'form:5',
    freezeEntry({
      behavior: ['输入较长内容时更适合用文本域。'],
      component: TextareaDemo,
      imports: ['vCard', 'vTextarea', 'vText'],
      notes: ['适合备注、说明和长文本。'],
      sourceTitle: '文本域核心源码',
      summary: '长文本输入。',
      title: '文本域'
    })
  ],
  [
    'form:6',
    freezeEntry({
      behavior: ['布尔状态开关比复选框更直观。'],
      component: SwitchDemo,
      imports: ['vCard', 'vSwitch', 'vText'],
      notes: ['适合自动化开关和功能开闭。'],
      sourceTitle: '开关核心源码',
      summary: '布尔状态开关。',
      title: '开关'
    })
  ],
  [
    'form:7',
    freezeEntry({
      behavior: ['查看态和编辑态共用一份字段节点。'],
      component: OwnerFieldCard,
      imports: ['vCard', 'vText'],
      notes: ['很适合详情页里的字段编辑。'],
      sourceTitle: '字段模式核心源码',
      summary: '字段查看态与编辑态切换。',
      title: '字段'
    })
  ],
  [
    'form:8',
    freezeEntry({
      behavior: ['date、datetime-local 和 time 三种模式可以切换。'],
      component: ScheduleTimerCard,
      imports: ['vCard'],
      notes: ['常用于调度和计划任务。'],
      sourceTitle: '日期时间核心源码',
      summary: '日期和时间输入。',
      title: '日期时间'
    })
  ],
  [
    'form:9',
    freezeEntry({
      behavior: ['结束值早于开始值时会显示错误。'],
      component: TimerRangeCard,
      imports: ['vCard', 'vText'],
      notes: ['适合查询条件和维护窗口。'],
      sourceTitle: '日期范围核心源码',
      summary: '日期区间选择。',
      title: '日期范围'
    })
  ],
  [
    'form:10',
    freezeEntry({
      behavior: ['支持点击选择、拖拽上传、删除文件和模拟上传进度。'],
      component: UploadDemo,
      imports: ['vCard', 'vUpload', 'vText'],
      notes: ['适合资料上传、附件管理和导入任务。'],
      sourceTitle: '文件上传核心源码',
      summary: '文件选择、拖拽上传与进度展示。',
      title: '文件上传'
    })
  ],
  [
    'form:11',
    freezeEntry({
      behavior: [
        '点击星星评分，再次点击当前值会清空。',
        'allowHalf 支持半星，方向键和 Home/End 可以微调评分。'
      ],
      component: RateDemo,
      imports: ['vCard', 'vRate', 'vText'],
      notes: ['适合满意度、服务质量和任务优先级评分。'],
      sourceTitle: '评分核心源码',
      summary: '整数与半星评分输入。',
      title: '评分'
    })
  ],
  [
    'data-display:2',
    freezeEntry({
      behavior: ['只读信息适合用 label/value 的结构来展示。'],
      component: ServiceDetailCard,
      imports: ['vCard', 'vText'],
      notes: ['适合详情页、资料页和卡片摘要。'],
      sourceTitle: '详情面板核心源码',
      summary: '只读详情信息展示。',
      title: '详情'
    })
  ],
  [
    'data-display:3',
    freezeEntry({
      behavior: ['短片段和长日志各自有更合适的展示组件。'],
      component: CodeDisplayDemo,
      imports: ['codeBlock', 'vCard', 'vCode'],
      notes: ['短代码用 vCode，长文本用 codeBlock。'],
      sourceTitle: '代码展示核心源码',
      summary: '短代码与长代码展示。',
      title: '代码'
    })
  ],
  [
    'data-display:4',
    freezeEntry({
      behavior: ['列定义、空状态和行操作都可以放在同一个表格组件里。'],
      component: ServiceTableCard,
      imports: ['vButton', 'vCard'],
      notes: ['适合服务清单和管理列表。'],
      sourceTitle: '表格操作核心源码',
      summary: '表格列和行级操作。',
      title: '表格'
    })
  ],
  [
    'data-display:5',
    freezeEntry({
      behavior: ['vCardHeader/body/footer 能组合成完整的卡片页面。'],
      component: CardSurfaceDemo,
      imports: ['vButton', 'vCard', 'vCardBody', 'vCardFooter', 'vCardHeader', 'vText'],
      notes: ['适合需要明显容器边界的内容。'],
      sourceTitle: '卡片核心源码',
      summary: '卡片表面结构组合。',
      title: '卡片'
    })
  ],
  [
    'data-display:6',
    freezeEntry({
      behavior: ['图表绘制由 adapter 负责，组件只管理宿主生命周期。'],
      component: ChartAdapterCard,
      imports: ['vCard', 'vChart'],
      notes: ['适合接入第三方图表库。'],
      sourceTitle: '图表宿主核心源码',
      summary: '图表宿主与适配器。',
      title: '图表'
    })
  ],
  [
    'data-display:9',
    freezeEntry({
      behavior: ['滚动到接近底部时会自动加载下一页，loop 可循环加载，block 可停止请求。'],
      component: ScrollExample1,
      imports: ['div', 'vScroll'],
      notes: ['loop 可以持续循环加载，block 可以停止后续请求。'],
      sourceTitle: '滚动组件核心源码',
      summary: '滚动到底部自动加载更多数据。',
      title: '滚动组件'
    })
  ],
  [
    'async:0',
    freezeEntry({
      behavior: ['失败后可以重试，成功后会保持缓存状态。'],
      component: DynamicModuleCard,
      imports: ['div', 'vCard', 'vDynamicLoader'],
      notes: ['适合延迟加载和错误兜底。'],
      sourceTitle: '动态模块加载核心源码',
      summary: '异步模块加载与重试。',
      title: '动态加载'
    })
  ],
  [
    'feedback:0',
    freezeEntry({
      behavior: ['局部消息区域和全局 toast 都属于反馈层。'],
      component: MessageDemo,
      imports: ['vButton', 'vCard', 'vMessageContainer'],
      notes: ['局部消息区域更容易和页面绑定。'],
      sourceTitle: '消息核心源码',
      summary: '局部消息容器和 toast 反馈。',
      title: '消息'
    })
  ],
  [
    'feedback:1',
    freezeEntry({
      behavior: ['消息管理器会接管消息容器的完整生命周期。'],
      component: LocalMessageManagerCard,
      imports: ['vCard', 'vMessageManager'],
      notes: ['适合需要显式销毁的局部消息区。'],
      sourceTitle: '局部消息管理器核心源码',
      summary: '局部消息管理器。',
      title: '消息管理器'
    })
  ],
  [
    'navigation:1',
    freezeEntry({
      behavior: ['链接层级可以返回上级，当前层级通过 aria-current 标记。'],
      component: BreadcrumbDemo,
      imports: ['vBreadcrumb', 'vCard'],
      notes: ['适合详情页、管理后台和文档站点的位置提示。'],
      sourceTitle: '面包屑核心源码',
      summary: '页面层级与当前位置提示。',
      title: '面包屑'
    })
  ],
  [
    'general:1',
    freezeEntry({
      planned: true,
      summary: '按钮组仍在排期中。',
      title: '按钮组'
    })
  ],
  [
    'general:2',
    freezeEntry({
      planned: true,
      summary: '悬浮按钮仍在排期中。',
      title: '悬浮按钮'
    })
  ],
  [
    'layout:5',
    freezeEntry({
      planned: true,
      summary: '分隔面板仍在排期中。',
      title: '分隔面板'
    })
  ],
  [
    'navigation:0',
    freezeEntry({
      behavior: ['点击链接会平滑滚动，滚动时自动高亮当前章节。'],
      component: AnchorStandaloneDemo,
      imports: ['section', 'vContainer'],
      notes: ['适合长文档和帮助中心的章节导航。'],
      sourceTitle: '锚点核心源码',
      summary: '页面章节导航与滚动高亮。',
      title: '锚点'
    })
  ],
  [
    'navigation:5',
    freezeEntry({
      planned: true,
      summary: '步骤条目前仍在排期中。',
      title: '步骤条'
    })
  ],
  [
    'data-display:0',
    freezeEntry({
      planned: true,
      summary: '头像目前仍在排期中。',
      title: '头像'
    })
  ],
  [
    'data-display:1',
    freezeEntry({
      planned: true,
      summary: '徽标数目前仍在排期中。',
      title: '徽标数'
    })
  ],
  [
    'board:0',
    freezeEntry({
      behavior: ['数字看板用响应式卡片网格展示关键指标，支持数值、单位、趋势和主题色。'],
      component: DigitalBoardDemo,
      imports: ['vCard', 'vDigitalBoard', 'vDigitalBoardItem'],
      notes: ['适合首页概览、监控大屏和管理统计。'],
      sourceTitle: '数字看板核心源码',
      summary: '关键指标卡片网格。',
      title: '数字看板'
    })
  ],
  [
    'board:1',
    freezeEntry({
      behavior: ['趋势卡组合数值、涨跌和迷你走势，适合放在看板顶部。'],
      component: TrendCardDemo,
      imports: ['vCard', 'vTrendCard'],
      notes: ['走势数据可以随时更新。'],
      sourceTitle: '趋势卡核心源码',
      summary: '组合趋势的统计卡。',
      title: '趋势卡'
    })
  ],
  [
    'board:2',
    freezeEntry({
      behavior: ['vSparkline 为无坐标轴的轻量折线图，支持面积填充和主题色。'],
      component: SparklineDemo,
      imports: ['vCard', 'vSparkline'],
      notes: ['适合卡片底部的趋势缩略图。'],
      sourceTitle: '迷你走势核心源码',
      summary: '无坐标轴轻量折线图。',
      title: '迷你走势'
    })
  ],
  [
    'board:3',
    freezeEntry({
      behavior: ['环形统计用圆环展示占比，中心默认显示百分比。'],
      component: RingStatDemo,
      imports: ['vCard', 'vRingStat'],
      notes: ['适合成功率、容量占用等比例指标。'],
      sourceTitle: '环形统计核心源码',
      summary: '圆环占比与中心值。',
      title: '环形统计'
    })
  ],
  [
    'board:4',
    freezeEntry({
      behavior: ['仪表盘用半圆刻度与指针展示区间指标。'],
      component: GaugeDemo,
      imports: ['vCard', 'vGauge'],
      notes: ['适合负载、使用率等区间指标。'],
      sourceTitle: '仪表盘核心源码',
      summary: '半圆仪表盘与指针。',
      title: '仪表盘'
    })
  ],
  [
    'board:5',
    freezeEntry({
      behavior: ['时间线用节点状态色区分成功、失败和进行中。'],
      component: TimelineDemo,
      imports: ['vCard', 'vTimeline', 'vTimelineItem'],
      notes: ['适合执行历史、告警事件流。'],
      sourceTitle: '时间线核心源码',
      summary: '竖向事件流。',
      title: '时间线'
    })
  ]
]);

export function getComponentDetail(categoryId, itemIndex, item) {
  const key = `${categoryId}:${itemIndex}`;
  const detail = detailEntries.get(key);
  const source = detailSourceRegistry[key];

  if (detail) {
    if (!source) {
      return detail;
    }

    return freezeEntry({
      ...detail,
      imports: source.imports,
      sourceComponent: source.component
    });
  }

  return freezeEntry({
    imports: source?.imports,
    planned: item.status === 'planned',
    sourceComponent: source?.component,
    summary:
      item.status === 'planned' ? '该条目已预留，后续补上真实演示。' : item.details || '暂无说明。',
    title: item.label
  });
}

function freezeEntry(entry) {
  return Object.freeze({
    behavior: Object.freeze([...(entry.behavior ?? [])]),
    component: entry.component ?? null,
    imports: Object.freeze([...(entry.imports ?? [])]),
    notes: Object.freeze([...(entry.notes ?? [])]),
    planned: Boolean(entry.planned),
    sourceComponent: entry.sourceComponent ?? null,
    sourceTitle: entry.sourceTitle ?? `${entry.title} 核心源码`,
    summary: entry.summary ?? '',
    title: entry.title ?? ''
  });
}
