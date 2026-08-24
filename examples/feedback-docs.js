import { section, toast, vCard, vMessage, vMessageContainer, vText } from '../src/index.js';
import { ComponentSource } from './component-source.js';

const feedbackDocsDefinitions = Object.freeze({
  message: createFeedbackDocsDefinition({
    apiIntro:
      'vMessage 负责单条反馈，vMessageContainer 负责消息队列、自动关闭、同 ID 替换和摆放位置，toast 是全局快捷入口。',
    apiRows: [
      [
        'vMessage({ type, content, text, closable })',
        '创建一条消息。',
        "vMessage({ type: 'success', text: '保存成功' })"
      ],
      ['message.type(value)', '设置 success、error、warning 或 info。', "message.type('warning')"],
      ['message.content(content)', '替换消息主体内容。', "message.content('已同步')"],
      ['message.closable(value)', '显示或隐藏关闭按钮。', 'message.closable(true)'],
      [
        'message.countdown(duration, enabled)',
        '显示倒计时，计时结束自动关闭。',
        'message.countdown(3000)'
      ],
      ['message.close()', '主动关闭并触发 onClose。', 'message.close()'],
      [
        'vMessageContainer({ placement })',
        '创建消息容器。',
        "vMessageContainer({ placement: 'top-right' })"
      ],
      [
        'container.show(content, options)',
        '显示消息并返回 id；支持 duration 和 countdown。',
        "container.show('保存成功', { duration: 3000 })"
      ],
      [
        'container.success/error/warning/info(content, options)',
        '按语义显示消息。',
        "container.success('保存成功')"
      ],
      ['container.close(id) / clear()', '关闭单条或清空全部。', 'container.clear()'],
      ['toast.use(container)', '指定全局 toast 容器。', 'toast.use(host)']
    ],
    apiSignature: `const host = vMessageContainer({ placement: 'top-right' });
const id = host.success('保存成功', { duration: 3000, countdown: true });
toast.use(host);`,
    examples: [
      {
        component: MessageTypesExample1,
        description: '用 type 区分成功、错误、警告和普通提示，适合静态状态说明或局部反馈。',
        id: 'types',
        imports: ['vCard', 'vMessage'],
        sourceTitle: '消息类型核心源码',
        title: '消息类型'
      },
      {
        component: MessageContainerExample1,
        description: '局部容器把消息限制在当前区域内，可用 id 替换同一条业务状态。',
        id: 'container',
        imports: ['vCard', 'vMessageContainer', 'vText'],
        sourceTitle: '局部消息容器核心源码',
        title: '局部容器'
      },
      {
        component: ToastExample1,
        description: 'toast 适合页面级反馈，不需要把消息容器一层层传给业务组件。',
        id: 'toast',
        imports: ['toast', 'vCard', 'vText'],
        sourceTitle: '全局 toast 核心源码',
        title: '全局 toast'
      },
      {
        component: CountdownMessageExample1,
        description: '默认显示倒计时和进度条，计时结束自动关闭；也可以只保留自动关闭。',
        id: 'countdown',
        imports: ['vCard', 'vMessageContainer', 'vText'],
        sourceTitle: '计时消息核心源码',
        title: '计时消息'
      }
    ],
    examplesIntro: '下面四个示例分别展示单条消息、局部消息容器、全局 toast 和计时消息。',
    heading: 'vMessage 消息',
    intro:
      '消息组件用于反馈一次操作的结果或状态变化。它既可以作为局部组件放在卡片中，也可以交给全局 toast 容器统一显示。',
    key: 'message',
    routeItem: 'feedback:0',
    title: '消息',
    usageItems: [
      '表单保存、发布、同步这类短反馈，优先用 toast 或局部消息容器。',
      '页面内需要保留上下文的状态提示，用 vMessage 放在相关区域旁边。',
      '同一业务状态反复变化时，给消息设置 id，让容器替换旧消息而不是堆叠。'
    ]
  })
});

export function MessageDocumentationPage() {
  return createFeedbackDocumentationPage(feedbackDocsDefinitions.message);
}

function createFeedbackDocsDefinition(config) {
  return Object.freeze({
    apiIntro: config.apiIntro ?? '',
    apiRows: Object.freeze(config.apiRows ?? []),
    apiSignature: config.apiSignature ?? '',
    examples: Object.freeze(config.examples ?? []),
    examplesIntro: config.examplesIntro ?? '下面的示例可以直接复制到自己的对象组件中。',
    heading: config.heading,
    intro: config.intro,
    key: config.key,
    routeItem: config.routeItem,
    title: config.title,
    usageItems: Object.freeze(config.usageItems ?? []),
    usageIntro: config.usageIntro ?? '',
    usageTitle: config.usageTitle ?? '何时使用',
    apiTitle: config.apiTitle ?? '常用 API'
  });
}

function createFeedbackDocumentationPage(definition) {
  return {
    render() {
      return section((page) => {
        page.className(
          `components-route-page components-feedback-docs components-feedback-docs--${definition.key}`
        );
        page.attr('data-component-route-item', definition.routeItem);
        page.attr('data-feedback-docs', definition.key);

        page.header((header) => {
          header.className('components-feedback-docs-header');
          header.h1(definition.heading);
          header.p(definition.intro);
        });

        page.section((usage) => {
          usage.className('components-feedback-docs-usage');
          usage.attr('data-feedback-usage', definition.key);
          usage.h2(definition.usageTitle);
          if (definition.usageIntro) {
            usage.p(definition.usageIntro);
          }
          usage.ul((list) => {
            definition.usageItems.forEach((itemText) => {
              list.li(itemText);
            });
          });
        });

        page.section((api) => {
          api.className('components-feedback-docs-api');
          api.h2(definition.apiTitle);
          if (definition.apiIntro) {
            api.p(definition.apiIntro);
          }
          api.pre((pre) => {
            pre.className('feedback-api-signature');
            pre.code(definition.apiSignature);
          });
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              definition.apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        page.section((examples) => {
          examples.className('components-feedback-docs-examples');
          examples.h2('代码演示');
          examples.p(definition.examplesIntro);
          definition.examples.forEach((demo) => {
            examples.child(FeedbackExampleSection(demo));
          });
        });
      });
    }
  };
}

function FeedbackExampleSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent ?? demo.component,
    imports: demo.imports ?? [],
    title: demo.sourceTitle ?? `${demo.title} 核心源码`
  });

  return {
    render() {
      return section((example) => {
        example.className('components-feedback-demo');
        example.attr('data-feedback-demo', demo.id);
        example.h3(demo.title);
        example.p(demo.description);
        example.div((live) => {
          live.className('components-feedback-demo-live');
          live.attr('data-feedback-demo-live', 'true');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

function MessageTypesExample1() {
  const messages = [
    vMessage({ type: 'success', content: '保存成功，配置已经写入。', closable: false }),
    vMessage({ type: 'error', content: '发布失败，请检查审批状态。', closable: false }),
    vMessage({ type: 'warning', content: '存在未保存修改，离开前请确认。', closable: false }),
    vMessage({ type: 'info', content: '任务已经进入队列，请稍后查看结果。', closable: false })
  ];

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('消息类型');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '10px');
            messages.forEach((message) => {
              content.child(message);
            });
          });
        });
      });
    }
  };
}

function MessageContainerExample1() {
  const host = vMessageContainer({ placement: 'top-right' });
  const status = vText('等待消息');

  host.styles({
    bottom: null,
    left: null,
    maxWidth: 'none',
    position: 'static',
    right: null,
    top: null,
    transform: null,
    width: '100%'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('局部消息容器');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('容器可以放在局部区域里，消息只影响当前卡片。');
            content.child(host);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('最近动作');
              row.spacer();
              row.output((output) => output.child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('显示成功');
              button.variant('primary');
              button.on('click', () => {
                host.success('保存成功', { id: 'local-status', duration: 0 });
                status.textContent('显示成功消息');
              });
            });
            actions.vButton((button) => {
              button.label('替换同 ID');
              button.on('click', () => {
                host.warning('同 ID 消息已替换', { id: 'local-status', duration: 0 });
                status.textContent('替换为警告消息');
              });
            });
            actions.vButton((button) => {
              button.label('清空');
              button.variant('secondary');
              button.on('click', () => {
                host.clear();
                status.textContent('已清空');
              });
            });
          });
        });
      });
    }
  };
}

function ToastExample1() {
  const status = vText('尚未发送');

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('全局 toast');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('toast 会使用当前全局容器，适合跨组件的即时反馈。');
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('最近 toast');
              row.spacer();
              row.output((output) => output.child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('成功 toast');
              button.variant('primary');
              button.on('click', () => {
                toast.success('全局保存成功', { duration: 0 });
                status.textContent('已发送成功 toast');
              });
            });
            actions.vButton((button) => {
              button.label('错误 toast');
              button.variant('danger');
              button.on('click', () => {
                toast.error('接口返回异常', { duration: 0 });
                status.textContent('已发送错误 toast');
              });
            });
            actions.vButton((button) => {
              button.label('清空 toast');
              button.variant('secondary');
              button.on('click', () => {
                toast.clear();
                status.textContent('已清空全局 toast');
              });
            });
          });
        });
      });
    }
  };
}

function CountdownMessageExample1() {
  const host = vMessageContainer({ placement: 'top-right' });
  const status = vText('等待计时消息');

  host.styles({
    bottom: null,
    left: null,
    maxWidth: 'none',
    position: 'static',
    right: null,
    top: null,
    transform: null,
    width: '100%'
  });

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('计时消息');
        card.vCardBody((body) => {
          body.vstack((content) => {
            content.style('gap', '14px');
            content.p('设置 duration 后消息会显示剩余秒数和进度条，计时结束自动关闭。');
            content.child(host);
            content.hstack((row) => {
              row.style({ alignItems: 'center', gap: '10px' });
              row.span('最近动作');
              row.spacer();
              row.output((output) => output.child(status));
            });
          });
        });
        card.vCardFooter((footer) => {
          footer.hstack((actions) => {
            actions.style({ alignItems: 'center', flexWrap: 'wrap', gap: '10px' });
            actions.vButton((button) => {
              button.label('3 秒成功');
              button.variant('primary');
              button.on('click', () => {
                host.success('保存成功', { duration: 3000 });
                status.textContent('已发送 3 秒成功消息');
              });
            });
            actions.vButton((button) => {
              button.label('5 秒警告');
              button.on('click', () => {
                host.warning('配额即将用完', { duration: 5000 });
                status.textContent('已发送 5 秒警告消息');
              });
            });
            actions.vButton((button) => {
              button.label('仅自动关闭');
              button.variant('secondary');
              button.on('click', () => {
                host.info('自动关闭但不显示倒计时', { countdown: false, duration: 3000 });
                status.textContent('已发送隐藏倒计时的消息');
              });
            });
            actions.vButton((button) => {
              button.label('常驻消息');
              button.variant('ghost');
              button.on('click', () => {
                host.show('常驻消息，点击关闭', { duration: 0 });
                status.textContent('已发送常驻消息');
              });
            });
            actions.vButton((button) => {
              button.label('清空');
              button.variant('secondary');
              button.on('click', () => {
                host.clear();
                status.textContent('已清空计时消息');
              });
            });
          });
        });
      });
    }
  };
}
