import { computed, ref, section, vText } from '../index.js';
import { KeyedTableExample } from './demos/keyed-table.js';
import { ComponentSource } from './component-source.js';

function HtmlNativeExample1() {
  const draft = ref('');
  const saved = ref('等待');
  const outputText = computed(() => `原生输入：${saved.value || '空'}`);

  return {
    render() {
      return section((page) => {
        page.className('html-native-demo');
        page.h3('HTML 原生元素');
        page.p(
          'button、input、output 等原生元素可以直接组合，状态用 ref 持有、值位置直接传句柄，适合底层自由拼装。'
        );
        page.div((box) => {
          box.className('html-native-box');
          box.input((field) => {
            field.id('html-native-name');
            field.attr({ placeholder: '输入名称', type: 'text' });
            // 视图 → 信号：事件回调里写回，不查 document
            field.on('input', (event) => {
              draft.value = event.target.value;
            });
          });
          box.button((button) => {
            button.className('html-native-button');
            button.text('更新');
            // 属性也接句柄：输入为空时按钮禁用
            button.attr(
              'disabled',
              computed(() => !draft.value.trim())
            );
            button.on('click', () => {
              saved.value = draft.value.trim();
            });
          });
          // 信号 → 视图：computed 派生文本，写入信号即原地更新
          box.output((output) => output.child(vText(outputText)));
        });
      });
    }
  };
}

const htmlNativeNotes = [
  '原生工厂覆盖 WHATWG 全部 conforming 标签，例如 div、button、input、output、a、table。',
  '遇到 JS 关键字或节点方法冲突时提供别名：style → styleTag、var → varTag。',
  '原生元素提供 attr / styles / text / on / child 等节点方法，适合底层自由拼装。',
  '子工厂快捷方法返回父节点；绑定事件请用回调参数：box.button("文字", (btn) => btn.on("click", ...))。'
];

// API 清单按职责分组；每组一张 API / 用途 / 示例 表，方法链一律返回节点本身。
const htmlNativeApiGroups = [
  {
    title: '创建与结构',
    rows: [
      [
        'div(setup?)',
        '原生工厂创建元素：div(setup)、div("文本")、div(句柄)（等价 child(handle)，动态文本）、div({ ...config }) 四种写法。',
        'div(count)'
      ],
      [
        'div({ ...config })',
        '配置对象写法：class / attrs / style / children / onXxx，其余键按同名方法或属性处理。',
        "div({ attrs: { role: 'note' } })"
      ],
      [
        'node.child(...children)',
        '追加子节点：ViewNode、组件对象、字符串或数字；返回父节点，方便继续追加。',
        "box.span('状态')"
      ],
      [
        'node.addChild(key, child)',
        '带 key 追加子节点，元素子节点会把 key 镜像成 data-row-key。',
        "list.addChild('row-1', row)"
      ],
      [
        'node.getChild(key) / removeChild(key)',
        '按 key 取用或移除；removeChild 会销毁该子树。',
        "list.removeChild('row-1')"
      ],
      [
        'node.insertBefore(key, child, beforeKey?)',
        '在 beforeKey 之前插入 keyed 子节点，beforeKey 为空则追加；重复 key 或 beforeKey 不存在会抛错。',
        "list.insertBefore('row-2', row, 'row-3')"
      ],
      [
        'node.insertAfter(key, child, afterKey?)',
        '在 afterKey 之后插入 keyed 子节点，afterKey 为空则插到开头；afterKey 不存在会抛错。',
        "list.insertAfter('row-0', row, null)"
      ],
      [
        'node.moveBefore(key, beforeKey?) / moveAfter(key, afterKey?)',
        '移动已有 keyed 子节点，节点身份与 DOM 状态保持；参考为空时分别移到末尾 / 开头。',
        "list.moveBefore('row-3', 'row-1')"
      ],
      [
        'node.replaceChild(key, child)',
        '同 key 原位换新：旧节点销毁、新节点占同一槽位，邻居节点不受影响。',
        "list.replaceChild('row-2', row)"
      ],
      ['node.children()', '返回子节点数组快照，改快照不影响内部结构。', 'node.children().length'],
      ['node.clearChildren()', '清空子节点，旧节点在下一次提交时销毁。', 'box.clearChildren()']
    ]
  },
  {
    title: '文本：text 与 textContent',
    rows: [
      [
        'node.text(content)',
        '追加一个文本节点，等价 child(vText(content))；它不是「设置文案」，反复调用会越堆越多。',
        "p.text('共 ')"
      ],
      [
        'node.textContent()',
        '只读：返回本元素子树的聚合文本；元素上不能用它写入文案。',
        'p.textContent()'
      ],
      [
        'vText(content)',
        '创建文本节点句柄，渲染为真实 Text 节点，SSR 输出自动转义。',
        "const label = vText('A')"
      ],
      [
        'textNode.textContent(value)',
        '读写并原地替换文本：同一处文案反复同步，用它的替换语义。',
        "label.textContent('B')"
      ],
      [
        'node.child(handle) / node.child(vText(handle))',
        '文本跟随状态：传 ref / computed 句柄（或零参闭包），原地更新、不替换元素、不丢焦点；工厂 setup 位置写 div(handle) 等价。',
        'line.child(count)'
      ]
    ],
    sample: `// 追加：元素 text() 每次都加一个文本节点，反复同步会堆叠
p.text('状态：已同步');
p.text('状态：已跳过'); // 结果是两段文案拼在一起

// 替换：持有文本节点句柄，textContent(value) 原地更新
const statusText = vText('状态：已同步');
p.child(statusText);
statusText.textContent('状态：已跳过');`
  },
  {
    title: '属性、类名与样式',
    rows: [
      [
        'node.attr(name) / attr(name, value)',
        '读写属性；值为 null / undefined / false 时移除，函数值登记为绑定。',
        "input.attr('placeholder', '搜索')"
      ],
      ['node.attr({ ... })', '批量写属性。', "link.attr({ href: '/docs' })"],
      ['node.id(value) / name(value)', 'id / name 属性快捷读写。', "input.id('user-name')"],
      [
        'node.className(...names) / class(...)',
        '追加类名，支持空格分隔与数组；无参调用返回当前类名字符串。',
        "box.className('card', 'is-open')"
      ],
      [
        'node.replaceClassName(old, next, tolerate?)',
        '替换预设类名：old 不存在时默认不动，tolerate 为 true 则只加 next。',
        "box.replaceClassName('yoya-vtable', 'my-table')"
      ],
      [
        'node.style(name, value)',
        '读写行内样式；值为 null / 空串时移除，函数值登记为绑定。',
        "box.style('gap', '8px')"
      ],
      ['node.styles({ ... })', '批量写行内样式。', "box.styles({ display: 'flex' })"]
    ]
  },
  {
    title: '事件、状态（信号）与生命周期',
    rows: [
      [
        'node.on(event, handler, options?)',
        '绑定事件；同节点同事件只保留最新 handler，options 支持 once 等原生选项。',
        "btn.on('click', save)"
      ],
      ['node.off(event)', '解绑事件并移除转发适配器。', "btn.off('click')"],
      [
        'ref(initial) / computed(fn)',
        '组件内状态用句柄持有：值位置直接传句柄，写入即写回；派生值用 computed。',
        "box.attr('data-count', count)"
      ],
      [
        'handle.value / handle.update(fn)',
        '写信号：值变化时绑定原地更新，区域读到过的信号按谓词重建；同值写入不通知。',
        'count.value += 1'
      ],
      [
        'node.flushAll()',
        '非信号数据源的值级更新入口：区域按谓词重建，普通节点只刷绑定（结构不变）。',
        'box.flushAll()'
      ],
      [
        'node.rebuildable(predicate?)',
        '把节点声明为可重建区域，内容由它自己的 setup 产出。',
        'box.rebuildable(() => !locked)'
      ],
      [
        'node.rebuild(options?) / flush()',
        '结构变化用 rebuild()（清空子节点重跑 setup），值变化用 flush()；谓词为假只刷值并记 rebuildPending()。',
        'box.rebuild({ force: true })'
      ],
      [
        'node.renderDom() / commit()',
        '创建或复用真实 DOM 节点并提交子树，commit() 与 renderDom() 等价。',
        'node.renderDom()'
      ],
      ['node.toHTML()', '序列化为 HTML 字符串，SSR 路径不依赖 DOM。', 'node.toHTML()'],
      [
        'node.bindTo(target) / destroy()',
        '挂载到选择器或元素；destroy 解绑事件、递归销毁子节点并从 DOM 移除。',
        "node.bindTo('#app')"
      ],
      [
        'node.access(spec)',
        '声明权限码，读/写级别由当前用户权限决定。',
        "card.access('system:member')"
      ]
    ],
    sample: `// 以下都在 div((ele) => { ... }) 的 setup 里

// ① 值来源是信号：ref 持有状态，值位置直接传句柄（属性 / 文本 / 组件 props 都行）
const count = ref(0);
ele.attr('data-count', count);
ele.child(vText(computed(() => \`count=\${count.value}\`)));

// ② 写入即写回：绑定原地更新，不需要手动 flush
ele.on('click', () => {
  count.value += 1;
});

// ③ 结构随数据变化：声明区域后，构建期读到的信号会按谓词重建子树
ele.rebuildable(() => count.value < 10);
ele.span(\`\${count.value} 项\`);

// ④ 非信号数据源（外部对象）才需要手动刷新：flush() 只刷值，flushAll() 区域重建
ele.flush();`
  },
  {
    title: '列表协调、条件挂载与容错',
    rows: [
      [
        'node.keyed(rows, keyFn, build)',
        '信号驱动 keyed 子项：同 key 且行引用未变复用节点（build 不重跑）、行引用变原位换新、排序保身份。',
        'list.keyed(rows, (row) => row.id, (row) => li(row.title))'
      ],
      [
        'node.keyed(rows, build)',
        '省略 keyFn 时用行引用本身做 key；重复 key 直接抛错，不会静默覆盖。',
        'list.keyed(rows, (row) => li(row.title))'
      ],
      [
        'node.mountable(cond) / isMounted()',
        '条件挂载：为假脱离文档、为真按槽位回归，ViewNode 与控件状态保留；div({ mountable: cond }) 等价。',
        'panel.mountable(visible)'
      ],
      [
        'node.whenFailed(handler)',
        '子树错误边界：返回节点降级替换、返回 null 仅上报；捕获必发 console.error，从不静默。',
        'box.whenFailed((error, info) => span(`${info.phase} 失败`))'
      ]
    ],
    sample: `// 以下都在 setup 里

// ① 列表按 key 对账：增删 / 排序保持节点身份，行内值绑定原地刷值
ul.keyed(rows, (row) => row.id, (row) => li(row.title));

// ② 条件挂载：为假脱离文档但状态保留，为真按子节点槽位回归
panel.mountable(visible);

// ③ 子树错误边界：返回节点降级替换，返回 null 只上报并保持现状
box.whenFailed((error, info) => span(\`\${info.phase} 失败：\${error.message}\`));`
  }
];

function HtmlNativeApiSection() {
  return {
    render() {
      return section((api) => {
        api.className('components-html-native-api');
        api.attr('data-html-native-api', 'true');
        api.h2('常用 API');
        api.p(
          '原生元素节点在通用节点能力之上提供以下方法，全部返回节点本身、可继续链式调用；' +
            '文本有两套语义，text() 是追加、textContent() 才是替换。'
        );
        htmlNativeApiGroups.forEach((group) => {
          api.h3(group.title);
          api.table((table) => {
            table.thead((head) => {
              head.tr((row) => {
                row.th('API');
                row.th('用途');
                row.th('示例');
              });
            });
            table.tbody((body) => {
              group.rows.forEach(([name, purpose, example]) => {
                body.tr((row) => {
                  row.td((cell) => cell.code(name));
                  row.td(purpose);
                  row.td((cell) => cell.code(example));
                });
              });
            });
          });
          if (group.sample) {
            api.pre((pre) => {
              pre.className('guide-code');
              pre.code(group.sample);
            });
          }
        });
      });
    }
  };
}

function HtmlNativeUsageNote() {
  return {
    render() {
      return section((usage) => {
        usage.className('components-html-native-usage');
        usage.attr('data-html-native-usage', 'true');
        usage.h2('事件绑定约定');
        usage.p(
          'box.button(...) 这类子工厂快捷方法返回父节点，用于继续追加元素；' +
            'click 等事件要绑定在按钮自身，使用回调参数，不要在快捷方法后面链 .on()。'
        );
        usage.pre((pre) => {
          pre.className('guide-code');
          pre.code(`// 正确：回调参数里绑定按钮自身的事件
box.button('保存', (btn) => btn.on('click', save));

// 错误：.on() 实际挂到了 box 容器上，点击容器内任意按钮都会触发
box.button('保存').on('click', save);`);
        });
      });
    }
  };
}

function KeyedTableDemoSection() {
  const liveDemo = KeyedTableExample();
  const sourcePanel = ComponentSource({
    component: KeyedTableExample,
    imports: ['ref', 'th', 'tr', 'vstack'],
    sourceComponent: KeyedTableExample,
    title: 'keyed 表格协调源码'
  });

  return {
    render() {
      return section((example) => {
        example.className('components-html-native-demo components-html-native-keyed-demo');
        example.attr('data-native-demo', 'keyed');
        example.h2('keyed 表格协调');
        example.p(
          'table.keyed(rows, keyFn, build) 用信号驱动原生表格：状态列是 ref 字段，写句柄只刷那一格；' +
            '任务 / 负责人是普通字段，换新行对象才刷新。追加 / 反转按 key 对账，行节点身份保持。'
        );
        example.div((live) => {
          live.className('components-html-native-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

function HtmlNativeDemoSection() {
  const liveDemo = HtmlNativeExample1();
  const sourcePanel = ComponentSource({
    component: HtmlNativeExample1,
    imports: ['computed', 'ref', 'section', 'vText'],
    sourceComponent: HtmlNativeExample1,
    title: 'HTML 原生源码'
  });

  return {
    render() {
      return section((example) => {
        example.className('components-html-native-demo');
        example.h2('实时演示');
        example.div((live) => {
          live.className('components-html-native-demo-live');
          live.child(liveDemo);
        });
        example.child(sourcePanel);
      });
    }
  };
}

export function HtmlNativeDocumentationPage() {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-html-native-page');
        page.attr('data-html-native-page', 'true');
        page.h1('HTML 原生元素');
        page.p('原生元素可以直接组合，适合底层自由拼装；所有组件最终都建立在原生元素节点之上。');
        page.ul((list) => {
          htmlNativeNotes.forEach((note) => list.li(note));
        });
        page.child(HtmlNativeApiSection());
        page.child(HtmlNativeUsageNote());
        page.child(HtmlNativeDemoSection());
        page.child(KeyedTableDemoSection());
      });
    }
  };
}
