import { div, vCard, vForm, vStateNode, vText } from '../../index.js';
import { componentSource } from '../component-source.js';

export function StateCounterExample1() {
  return vStateNode({
    state: () => ({ count: 0 }),
    render(state, api) {
      return vCard((card) => {
        card.vCardHeader('函数值绑定');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('vText 接收 (state) => value，setState 后自动求值写回。');
            stack.output((out) => {
              out.attr('data-state-counter-output', 'true');
              out.child(vText((s) => `当前计数：${s.count}`));
            });
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
    }
  });
}

export function StateInputExample1() {
  return vStateNode({
    state: () => ({ name: '' }),
    render(state, api) {
      return vCard((card) => {
        card.vCardHeader('输入保持焦点');
        card.vCardBody((body) => {
          body.vstack({ gap: '14px' }, (stack) => {
            stack.p('value 与输出文本都是函数值绑定，节点不被替换，焦点不会丢失。');
            stack.input((field) => {
              field.attr({
                'data-state-demo-input': 'true',
                placeholder: '输入内容',
                type: 'text',
                value: (s) => s.name
              });
              field.on('input', (event) => {
                api.setState({ name: event.target.value });
              });
            });
            stack.output((out) => {
              out.attr('data-state-input-output', 'true');
              out.child(vText((s) => `当前输入：${s.name || '（空）'}，长度：${s.name.length}`));
            });
            stack.vButton('保存', (button) => {
              button
                .variant('primary')
                .attr('disabled', (s) => !s.name)
                .style('opacity', (s) => (s.name ? null : '0.5'));
            });
          });
        });
      });
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
  return vStateNode({
    state: () => ({ count: 0 }),
    render() {
      return div((body) => {
        body.div((row) => {
          row.span('当前计数：');
          row.span((el) => {
            el.attr('data-state-methods-count', 'true');
            el.child(vText((s) => String(s.count)));
          });
        });
      });
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
