import { div, vCard, vForm, vStateNode, vText } from '../../index.js';
import { componentSource } from '../component-source.js';

export function StateCounterExample1() {
  let output = null;

  return vStateNode({
    state: () => ({ count: 0 }),
    render(state, api) {
      output = vText(String(state.count));

      return vCard((card) => {
        card.vCardHeader('局部更新');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('提供 update 时，setState 只做局部文本更新，不重建视图树。');
            stack.output((out) => out.child(output));
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton('+1', (button) => {
            button
              .variant('primary')
              .on('click', () => {
                api.setState({ count: state.count + 1 });
              });
          });
          footer.vButton('重置', (button) => {
            button.on('click', () => api.setState({ count: 0 }));
          });
        });
      });
    },
    update(state) {
      output.textContent(String(state.count));
    }
  });
}

export function StateInputExample1() {
  let output = null;
  const format = (state) => `当前输入：${state.name || '（空）'}，长度：${state.length}`;

  return vStateNode({
    state: () => ({ name: '', length: 0 }),
    render(state, api) {
      output = vText(format(state));

      return vCard((card) => {
        card.vCardHeader('输入保持焦点');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('update 只同步输出文本，输入框 DOM 不被替换，焦点不会丢失。');
            stack.input((field) => {
              field.attr({
                'data-state-demo-input': 'true',
                placeholder: '输入内容',
                type: 'text',
                value: state.name
              });
              field.on('input', (event) => {
                const value = event.target.value;
                api.setState({ length: value.length, name: value });
              });
            });
            stack.output((out) => out.attr('data-state-input-output', 'true').child(output));
          });
        });
      });
    },
    update(state) {
      output.textContent(format(state));
    }
  });
}

export function StateRebuildExample1() {
  return vStateNode({
    state: () => ({ attempts: 0, status: 'idle' }),
    render(state, api) {
      const nextState = { attempts: state.attempts + 1, status: 'running' };

      return vCard((card) => {
        card.styles({ boxSizing: 'border-box', maxWidth: '640px', width: '100%' });
        card.vCardHeader('全量重建');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('不提供 update 时，setState 会销毁旧内容并重新调用 render。');
            stack.p(`状态：${state.status}`);
            stack.p(`次数：${state.attempts}`);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton('执行', (button) => {
            button
              .variant('primary')
              .on('click', () => {
                api.setState(nextState);
              });
          });
        });
      });
    }
  });
}

export function StateToggleExample1() {
  return vStateNode({
    state: () => ({ visible: true }),
    render(state, api) {
      return vCard((card) => {
        card.styles({ boxSizing: 'border-box', maxWidth: '640px', width: '100%' });
        card.vCardHeader('结构切换');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p(state.visible ? '当前显示内容。' : '当前内容已隐藏。');
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton(state.visible ? '隐藏' : '显示', (button) => {
            button
              .variant('primary')
              .on('click', () => {
                api.setState({ visible: !state.visible });
              });
          });
        });
      });
    },
    update(state, api, changed) {
      return changed.has('visible');
    }
  });
}

// 动态字段部分：不导出的独立组件函数，只被 StateDynamicFormExample 组合使用。
function DynamicFormFields() {
  const schemas = {
    text: [{ name: 'content', label: '文本内容', placeholder: '输入文本', type: 'text' }],
    number: [
      { name: 'min', label: '最小值', placeholder: '0', type: 'number' },
      { name: 'max', label: '最大值', placeholder: '100', type: 'number' }
    ],
    date: [{ name: 'date', label: '日期', type: 'date' }]
  };

  return vStateNode({
    state: () => ({ type: 'text', values: {} }),
    render(state, api) {
      return div((body) => {
        (schemas[state.type] || []).forEach((field) => {
          body.vFormItem((item) => {
            item.label(field.label);
            item.control((editor) => {
              editor.vInput((input) => {
                input.attr({
                  name: field.name,
                  placeholder: field.placeholder || '',
                  type: field.type || 'text'
                });
                input.on('input', (event) => {
                  api.setState({
                    values: { ...state.values, [field.name]: event.target.value }
                  });
                });
              });
            });
          });
        });
      });
    },
    update(state, api, changed) {
      return changed.has('type');
    },
    setType(next) {
      this.setState({ type: next });
      return this;
    }
  });
}

export const dynamicFormFieldsSource = componentSource(DynamicFormFields, []);

export function StateDynamicFormExample() {
  const dynamicForm = DynamicFormFields();

  return {
    render() {
      return vForm((form) => {
        form.vFormItem((item) => {
          item.label('类型');
          item.control((editor) => {
            editor.vSelect((select) => {
              select.attr('data-state-dynamic-select', 'true');
              select.options(['text', 'number', 'date']);
              select.on('change', (event) => {
                dynamicForm.setType(event.target.value);
              });
            });
          });
        });
        form.child(dynamicForm);
      });
    }
  };
}

export function StateDynamicFormDemo() {
  const form = StateDynamicFormExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('动态表单');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('切换类型重建字段；输入值只写入 state，不重建输入框。');
            stack.child(form);
          });
        });
      });
    }
  };
}

export function StateMethodsExample() {
  let countText = null;

  return vStateNode({
    state: () => ({ count: 0 }),
    render(state) {
      countText = vText(String(state.count));

      return div((body) => {
        body.div((row) => {
          row.span('当前计数：');
          row.span((el) => el.attr('data-state-methods-count', 'true').child(countText));
        });
      });
    },
    update(state) {
      countText.textContent(String(state.count));
    },
    increment() {
      this.setState({ count: this.state().count + 1 });
      return this;
    },
    decrement() {
      this.setState({ count: this.state().count - 1 });
      return this;
    },
    reset() {
      this.setState({ count: 0 });
      return this;
    }
  });
}

export function StateMethodsDemo() {
  const counter = StateMethodsExample();

  return {
    render() {
      return vCard((card) => {
        card.vCardHeader('自定义方法');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('config 上定义的操作方法会挂到组件对象，外部按钮直接调用。');
            stack.child(counter);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton('+1', (button) => {
            button.variant('primary').on('click', () => counter.increment());
          });
          footer.vButton('-1', (button) => {
            button.on('click', () => counter.decrement());
          });
          footer.vButton('重置', (button) => {
            button.on('click', () => counter.reset());
          });
        });
      });
    }
  };
}
