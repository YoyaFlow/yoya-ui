import { div, hstack, section, vCard, vGlowButton, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

// 核心组件：只包含流光按钮内容，不包含 Card。
function GlowButtonBasicExample() {
  const output = vText('等待点击');
  const button = vGlowButton('立即部署').variant('primary').glow({ motion: 'always' });

  button.on('click', () => {
    output.textContent('已启动部署');
  });

  return {
    render() {
      return div((body) => {
        body.hstack({ gap: '14px' }, (row) => {
          row.style('alignItems', 'center');
          row.child(button);
          row.span((el) => el.attr('data-glow-button-output', 'true').child(output));
        });
      });
    }
  };
}

function GlowButtonSpeedDirectionExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    row.child(
      vGlowButton('慢速 · 从左到右').glow({ motion: 'always', speed: 'slow', direction: 'ltr' })
    );
    row.child(
      vGlowButton('快速 · 从右到左').glow({ motion: 'always', speed: 'fast', direction: 'rtl' })
    );
  });
}

function GlowButtonHoverExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    row.child(vGlowButton('悬停触发流光').glow({ motion: 'always', play: 'hover' }));
    row.child(vGlowButton('关闭流光').glow({ play: 'off' }));
  });
}

function GlowButtonVariantsExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    ['primary', 'secondary', 'danger', 'ghost'].forEach((variant) => {
      row.child(vGlowButton(variant).variant(variant).glow({ motion: 'always' }));
    });
  });
}

function GlowButtonStatesExample() {
  return hstack({ gap: '12px' }, (row) => {
    row.style('alignItems', 'center');
    row.child(vGlowButton('执行中').variant('primary').loading(true).glow({ motion: 'always' }));
    row.child(vGlowButton('不可用').disabled(true));
  });
}

// 页面壳：负责 Card 和说明文字，不进入演示源码面板。
function GlowButtonBasicDemo() {
  const content = GlowButtonBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础流光');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p(
              '流光带自动扫过按钮表面，是按钮自带的常驻特效；点击时按钮表面泛起一圈光波涟漪，只产生按钮自身的变化。'
            );
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonSpeedDirectionDemo() {
  const content = GlowButtonSpeedDirectionExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('速度与方向');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('speed 控制流光快慢，direction 控制扫过方向。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonHoverDemo() {
  const content = GlowButtonHoverExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('悬停触发');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('play 为 hover 时只有悬停或键盘聚焦才显示流光，off 则完全关闭。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonVariantsDemo() {
  const content = GlowButtonVariantsExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('变体');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('沿用 vButton 的 primary / secondary / danger / ghost 语义。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function GlowButtonStatesDemo() {
  const content = GlowButtonStatesExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('状态');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('loading 与 disabled 状态下流光暂停隐藏，按压反馈由 vButton 保留。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const glowButtonDemos = [
  {
    id: 'basic',
    title: '基础流光',
    component: GlowButtonBasicDemo,
    sourceComponent: GlowButtonBasicExample,
    imports: ['div', 'vGlowButton', 'vText'],
    sourceTitle: '基础流光源码'
  },
  {
    id: 'speed-direction',
    title: '速度与方向',
    component: GlowButtonSpeedDirectionDemo,
    sourceComponent: GlowButtonSpeedDirectionExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '速度与方向源码'
  },
  {
    id: 'hover',
    title: '悬停触发',
    component: GlowButtonHoverDemo,
    sourceComponent: GlowButtonHoverExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '悬停触发源码'
  },
  {
    id: 'variants',
    title: '变体',
    component: GlowButtonVariantsDemo,
    sourceComponent: GlowButtonVariantsExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '变体源码'
  },
  {
    id: 'states',
    title: '状态',
    component: GlowButtonStatesDemo,
    sourceComponent: GlowButtonStatesExample,
    imports: ['hstack', 'vGlowButton'],
    sourceTitle: '状态源码'
  }
];

function GlowButtonDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    sourceComponent: demo.sourceComponent,
    imports: demo.imports,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-glow-button-demo');
        example.attr('data-glow-button-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-glow-button-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function GlowButtonDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-glow-button-docs');
        page.attr('data-component-route-item', 'effects:0');
        page.attr('data-glow-button-docs', 'true');
        page.h1('vGlowButton 流光按钮');
        page.p('在 vButton 语义上叠加流光扫过、悬停加速、按压光影反馈与点击光波涟漪。');

        page.section((usage) => {
          usage.className('components-glow-button-usage');
          usage.attr('data-glow-button-usage', 'true');
          usage.h2('何时使用');
          usage.ul((list) => {
            list.li('需要吸引注意力的主操作入口（部署、发布、购买）。');
            list.li('希望按钮带光影质感，同时保留标准按钮交互语义时。');
          });
        });

        page.section((api) => {
          api.className('components-glow-button-api');
          api.attr('data-glow-button-api', 'true');
          api.h2('常用 API');
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              [
                [
                  "vGlowButton('部署').variant('primary')",
                  '创建流光按钮，继承 vButton 全部能力。',
                  "vGlowButton('立即部署')"
                ],
                [
                  'button.glow({ motion, play, speed, direction, strength, ripple })',
                  '批量配置流光与点击涟漪参数。',
                  "button.glow({ speed: 'fast', direction: 'rtl' })"
                ],
                [
                  "button.motion('auto' | 'always')",
                  '动画策略：auto 遵循系统减少动态效果（无动画时保留静态光影），always 强制流光动画。',
                  "button.motion('always')"
                ],
                [
                  "button.play('auto' | 'hover' | 'off')",
                  '流光自身运行方式：常驻自动循环、仅悬停/聚焦显示、关闭。',
                  "button.play('hover')"
                ],
                ["button.speed('slow' | 'normal' | 'fast')", '流光速度。', "button.speed('fast')"],
                ["button.direction('ltr' | 'rtl')", '流光扫过方向。', "button.direction('rtl')"],
                ["button.strength('soft' | 'strong')", '流光亮度。', "button.strength('soft')"],
                [
                  "button.ripple('on' | 'off')",
                  '点击光波涟漪开关（默认开启，涟漪只在按钮内部扩散，属于按钮自身特效）。',
                  "button.ripple('off')"
                ],
                [
                  'button.variant() / size() / disabled() / loading()',
                  '外观与状态，继承自 vButton。',
                  "button.variant('danger').size('small')"
                ]
              ].forEach(([name, purpose, example]) => {
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
          examples.className('components-glow-button-examples');
          examples.h2('代码演示');
          glowButtonDemos.forEach((demo) => {
            examples.child(GlowButtonDemoSection(demo));
          });
        });
      });
    }
  };
}
