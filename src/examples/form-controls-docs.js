import {
  div,
  section,
  vAutocomplete,
  vCard,
  vCascader,
  vSlider,
  vTagsInput,
  vText
} from '../index.js';
import { ComponentSource } from './component-source.js';

const regionOptions = [
  {
    label: '浙江',
    value: 'zhejiang',
    children: [
      { label: '杭州', value: 'hangzhou' },
      { label: '宁波', value: 'ningbo' }
    ]
  },
  {
    label: '广东',
    value: 'guangdong',
    children: [{ label: '深圳', value: 'shenzhen' }]
  }
];

const frameworkSource = ['Vue', 'React', 'Svelte', 'Solid', 'Angular'];

// ---------- vSlider ----------

function SliderBasicExample() {
  const output = vText('40');
  const slider = vSlider({
    max: 100,
    min: 0,
    onChange(value) {
      output.textContent(String(value));
    },
    step: 5,
    value: 40
  });

  return {
    render() {
      return div((body) => {
        body.child(slider);
        body.div((row) => {
          row.span('当前值');
          row.spacer();
          row.code((el) => el.attr('data-slider-output', 'true').child(output));
        });
      });
    }
  };
}

function SliderStateExample() {
  const slider = vSlider((el) => el.max(100).min(0).step(10).value(60));

  return {
    render() {
      return div((body) => {
        body.child(slider);
        body.div((row) => {
          row.button('禁用 / 启用', (btn) =>
            btn.on('click', () => slider.disabled(!slider.disabled()))
          );
          row.button('显示 / 隐藏数值', (btn) =>
            btn.on('click', () => slider.showValue(!slider.showValue()))
          );
        });
      });
    }
  };
}

function SliderVerticalExample() {
  const output = vText('80');
  const slider = vSlider({
    max: 100,
    min: 0,
    onChange(value) {
      output.textContent(String(value));
    },
    value: 80,
    vertical: true
  });

  return {
    render() {
      return div((body) => {
        body.hstack((row) => {
          row.child(slider);
          row.span('当前值');
          row.spacer();
          row.code((el) => el.attr('data-slider-vertical-output', 'true').child(output));
        });
      });
    }
  };
}

function SliderBasicDemo() {
  const content = SliderBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础用法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vSlider 提供 min/max/step 约束，change 回调返回当前数值。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function SliderStateDemo() {
  const content = SliderStateExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('状态控制');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('动态切换禁用状态和数值标签显示。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function SliderVerticalDemo() {
  const content = SliderVerticalExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('竖向滑动条');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('设置 vertical 后滑动条竖向排列，适合音量、温度等纵向取值场景。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const sliderDemos = [
  {
    component: SliderBasicDemo,
    id: 'basic',
    imports: ['div', 'vSlider', 'vText'],
    sourceComponent: SliderBasicExample,
    sourceTitle: '基础用法源码',
    title: '基础用法'
  },
  {
    component: SliderStateDemo,
    id: 'state',
    imports: ['div', 'vSlider'],
    sourceComponent: SliderStateExample,
    sourceTitle: '状态控制源码',
    title: '状态控制'
  },
  {
    component: SliderVerticalDemo,
    id: 'vertical',
    imports: ['div', 'vSlider', 'vText'],
    sourceComponent: SliderVerticalExample,
    sourceTitle: '竖向滑动条源码',
    title: '竖向滑动条'
  }
];

// ---------- vCascader ----------

function CascaderBasicExample() {
  const output = vText('浙江 / 杭州');
  const cascader = vCascader({
    onChange(value) {
      output.textContent(value.join(' / '));
    },
    options: regionOptions,
    value: ['zhejiang', 'hangzhou']
  });

  return {
    render() {
      return div((body) => {
        body.child(cascader);
        body.div((row) => {
          row.span('已选路径');
          row.spacer();
          row.code((el) => el.attr('data-cascader-output', 'true').child(output));
        });
      });
    }
  };
}

function CascaderStateExample() {
  const cascader = vCascader((el) => el.options(regionOptions));

  return {
    render() {
      return div((body) => {
        body.child(cascader);
        body.div((row) => {
          row.button('禁用 / 启用', (btn) =>
            btn.on('click', () => cascader.disabled(!cascader.disabled()))
          );
          row.button('回填广东', (btn) =>
            btn.on('click', () => cascader.value(['guangdong', 'shenzhen']))
          );
        });
      });
    }
  };
}

function CascaderBasicDemo() {
  const content = CascaderBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础用法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vCascader 按层级逐级选择，选中路径以数组形式返回。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function CascaderStateDemo() {
  const content = CascaderStateExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('回填与禁用');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('通过 value 数组回填选中路径，并支持禁用整个控件。');
            stack.child(content);
          });
        });
      });
    }
  };
}

const cascaderDemos = [
  {
    component: CascaderBasicDemo,
    id: 'basic',
    imports: ['div', 'vCascader', 'vText'],
    sourceComponent: CascaderBasicExample,
    sourceTitle: '基础用法源码',
    title: '基础用法'
  },
  {
    component: CascaderStateDemo,
    id: 'state',
    imports: ['div', 'vCascader'],
    sourceComponent: CascaderStateExample,
    sourceTitle: '回填与禁用源码',
    title: '回填与禁用'
  }
];

// ---------- vTagsInput ----------

function TagsBasicExample() {
  const output = vText('');
  const tags = vTagsInput({
    onChange(value) {
      output.textContent(value.join(', '));
    }
  });

  return {
    render() {
      return div((body) => {
        body.child(tags);
        body.div((row) => {
          row.span('已添加');
          row.spacer();
          row.code((el) => el.attr('data-tags-output', 'true').child(output));
        });
      });
    }
  };
}

function TagsPresetExample() {
  const tags = vTagsInput((el) => el.value(['vue', 'react']));

  return {
    render() {
      return div((body) => {
        body.p('回车或逗号添加，退格或点击 × 移除，已存在的标签自动去重。');
        body.child(tags);
      });
    }
  };
}

function TagsBasicDemo() {
  const content = TagsBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础用法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('输入后回车或逗号添加标签，change 回调返回标签数组。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function TagsPresetDemo() {
  const content = TagsPresetExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('预设值');
        card.vCardBody((body) => body.child(content));
      });
    }
  };
}

const tagsDemos = [
  {
    component: TagsBasicDemo,
    id: 'basic',
    imports: ['div', 'vTagsInput', 'vText'],
    sourceComponent: TagsBasicExample,
    sourceTitle: '基础用法源码',
    title: '基础用法'
  },
  {
    component: TagsPresetDemo,
    id: 'preset',
    imports: ['div', 'vTagsInput'],
    sourceComponent: TagsPresetExample,
    sourceTitle: '预设值源码',
    title: '预设值'
  }
];

// ---------- vAutocomplete ----------

function AutocompleteBasicExample() {
  const output = vText('');
  const autocomplete = vAutocomplete({
    onChange(value) {
      output.textContent(value);
    },
    source: frameworkSource
  });

  return {
    render() {
      return div((body) => {
        body.child(autocomplete);
        body.div((row) => {
          row.span('已选择');
          row.spacer();
          row.code((el) => el.attr('data-autocomplete-output', 'true').child(output));
        });
      });
    }
  };
}

function AutocompleteFilterExample() {
  const autocomplete = vAutocomplete((el) => {
    el.source((query) =>
      frameworkSource.filter((item) => item.toLowerCase().includes(String(query).toLowerCase()))
    );
  });

  return {
    render() {
      return div((body) => {
        body.p('source 也支持过滤函数，适合远程数据在本地预过滤的场景。');
        body.child(autocomplete);
      });
    }
  };
}

function AutocompleteBasicDemo() {
  const content = AutocompleteBasicExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('基础用法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('输入时从 source 过滤建议，键盘上下选择、回车或鼠标点选确认。');
            stack.child(content);
          });
        });
      });
    }
  };
}

function AutocompleteFilterDemo() {
  const content = AutocompleteFilterExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('函数过滤');
        card.vCardBody((body) => body.child(content));
      });
    }
  };
}

const autocompleteDemos = [
  {
    component: AutocompleteBasicDemo,
    id: 'basic',
    imports: ['div', 'vAutocomplete', 'vText'],
    sourceComponent: AutocompleteBasicExample,
    sourceTitle: '基础用法源码',
    title: '基础用法'
  },
  {
    component: AutocompleteFilterDemo,
    id: 'filter',
    imports: ['div', 'vAutocomplete'],
    sourceComponent: AutocompleteFilterExample,
    sourceTitle: '函数过滤源码',
    title: '函数过滤'
  }
];

// ---------- 页面壳 ----------

function createDemoSection(demo) {
  const liveDemo = demo.component();
  const sourcePanel = ComponentSource({
    component: demo.component,
    imports: demo.imports,
    sourceComponent: demo.sourceComponent,
    title: demo.sourceTitle
  });

  return {
    render() {
      return section((example) => {
        example.className('components-form-demo');
        example.attr('data-form-demo', demo.id);
        example.h3(demo.title);
        example.div((live) => {
          live.className('components-form-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

function createDocsPage({ apiRows, demos, docsKey, heading, intro, routeKey }) {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page');
        page.attr('data-form-docs', docsKey);
        page.attr('data-component-route-item', routeKey);
        page.h1(heading);
        page.p(intro);

        page.section((usage) => {
          usage.attr('data-form-usage', docsKey);
          usage.h2('何时使用');
          usage.ul((list) => {
            [
              '需要让用户在一组连续或离散取值中选择时。',
              '选项存在多级层级关系、需要逐级定位时。',
              '需要让用户自由追加多个短文本条目时。',
              '需要在输入过程中即时给出可选建议时。'
            ].forEach((item) => list.li(item));
          });
        });

        page.section((api) => {
          api.className('components-form-api');
          api.attr('data-form-api', docsKey);
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
              apiRows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
        });

        demos.forEach((demo) => page.child(createDemoSection(demo)));
      });
    }
  };
}

export function SliderDocumentationPage() {
  return createDocsPage({
    apiRows: [
      ['value(next)', '读写当前数值。', 'slider.value(60)'],
      ['min() / max() / step()', '读写取值范围与步长。', 'slider.max(200).step(5)'],
      ['showValue(next)', '控制数值标签显示。', 'slider.showValue(false)'],
      ['onChange(handler)', '数值变化回调（value, slider）。', 'slider.onChange((v) => ...)']
    ],
    demos: sliderDemos,
    docsKey: 'slider',
    heading: 'vSlider 滑动条',
    intro: 'min/max/step 约束的滑动输入，可放入 vFormItem 参与表单收集。',
    routeKey: 'form:13'
  });
}

export function CascaderDocumentationPage() {
  return createDocsPage({
    apiRows: [
      ['options(list)', '设置多级选项树。', 'cascader.options(regionOptions)'],
      ['value(path)', '读写选中路径数组。', 'cascader.value(["gd", "sz"])'],
      ['placeholder(next)', '设置未选中时的提示。', 'cascader.placeholder("请选择")'],
      ['onChange(handler)', '路径变化回调（path, cascader）。', 'cascader.onChange((p) => ...)']
    ],
    demos: cascaderDemos,
    docsKey: 'cascader',
    heading: 'vCascader 级联选择',
    intro: '按层级从选项树中逐级选择，选中路径以数组形式取值。',
    routeKey: 'form:14'
  });
}

export function TagsInputDocumentationPage() {
  return createDocsPage({
    apiRows: [
      ['value(list)', '读写标签数组。', 'tags.value(["vue", "react"])'],
      ['placeholder(next)', '设置输入框提示。', 'tags.placeholder("回车添加")'],
      ['disabled(next)', '切换禁用状态。', 'tags.disabled(true)'],
      ['onChange(handler)', '标签变化回调（tags, tagsInput）。', 'tags.onChange((t) => ...)']
    ],
    demos: tagsDemos,
    docsKey: 'tags-input',
    heading: 'vTagsInput 标签输入',
    intro: '回车或逗号添加标签、退格或 × 移除，值以字符串数组收集。',
    routeKey: 'form:15'
  });
}

export function AutocompleteDocumentationPage() {
  return createDocsPage({
    apiRows: [
      ['source(list | fn)', '设置建议来源或过滤函数。', 'ac.source(loadOptions)'],
      ['limit(next)', '限制建议显示条数。', 'ac.limit(6)'],
      ['value(next)', '读写当前输入值。', 'ac.value("Vue")'],
      ['onChange(handler)', '取值变化回调（value, ac）。', 'ac.onChange((v) => ...)']
    ],
    demos: autocompleteDemos,
    docsKey: 'autocomplete',
    heading: 'vAutocomplete 自动完成',
    intro: '输入时过滤建议，支持键盘选择，可放入 vFormItem 参与表单收集。',
    routeKey: 'form:16'
  });
}
