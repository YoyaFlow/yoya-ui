import { div, vForm, vStateNode, vTable, vText, vTr, vstack } from '../../index.js';
import { componentSource } from '../component-source.js';

export function StateCounterExample1() {
  return vStateNode({
    state: () => ({ count: 0 }),
    render(state, api) {
      return vstack({ gap: '12px' }, (stack) => {
        stack.output((out) => {
          out.attr('data-state-counter-output', 'true');
          out.child(vText((s) => `当前计数：${s.count}`));
        });
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('+1', (button) => {
            button.variant('primary');
            button.on('click', () => api.setState({ count: state.count + 1 }));
          });
          row.vButton('重置', (button) => {
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
      return vstack({ gap: '12px' }, (stack) => {
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
    }
  });
}

export function StateRebuildExample1() {
  return vStateNode({
    state: () => ({ attempts: 0, status: 'idle' }),
    render(state, api) {
      const nextState = { attempts: state.attempts + 1, status: 'running' };

      return vstack({ gap: '12px' }, (stack) => {
        stack.styles({ boxSizing: 'border-box', maxWidth: '640px', width: '100%' });
        stack.p(`状态：${state.status}`);
        stack.p(`次数：${state.attempts}`);
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('执行', (button) => {
            button.variant('primary');
            button.on('click', () => {
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
      return vstack({ gap: '12px' }, (stack) => {
        stack.styles({ boxSizing: 'border-box', maxWidth: '640px', width: '100%' });
        stack.p(state.visible ? '当前显示内容。' : '当前内容已隐藏。');
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton(state.visible ? '隐藏' : '显示', (button) => {
            button.variant('primary');
            button.on('click', () => {
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

export function StateFragmentExample1() {
  return vStateNode({
    state: () => ({ names: ['Ada', 'Bob'] }),
    render(state) {
      return vTable((table) => {
        table.vTbody((tbody) => {
          tbody.child(
            vStateNode({
              state: () => ({ names: state.names }),
              render(s) {
                return s.names.map((name) => vTr((tr) => tr.vTd(name)));
              }
            })
          );
        });
      });
    }
  });
}

export function StateKeyedExample1() {
  let box = null;
  let sequence = 2;
  let keys = ['k1', 'k2'];

  const itemNode = (key, label) =>
    div((item) => {
      item.styles({
        backgroundColor: 'rgba(37, 99, 235, 0.08)',
        borderRadius: '999px',
        color: '#2563eb',
        display: 'inline-block',
        margin: '4px',
        padding: '2px 10px'
      });
      item.text(label);
    });

  const api = {
    add() {
      sequence += 1;
      const key = `k${sequence}`;
      keys.push(key);
      box.addChild(key, itemNode(key, `条目 ${sequence}`));
      return api;
    },
    removeFirst() {
      const key = keys.shift();
      if (key) {
        box.removeChild(key);
      }
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.div((list) => {
          box = list;
          keys.forEach((key, index) => {
            list.addChild(key, itemNode(key, `条目 ${index + 1}`));
          });
        });
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('追加', (button) => {
            button.variant('primary');
            button.on('click', () => api.add());
          });
          row.vButton('移除第一条', (button) => {
            button.on('click', () => api.removeFirst());
          });
        });
      });
    }
  };

  return api;
}

export function StateEventOverwriteExample1() {
  let target = null;
  let outputElement = null;
  let textNode = null;

  const api = {
    registerA() {
      target.on('click', () => {
        outputElement.style('color', '#2563eb');
        textNode.textContent('A 处理器已响应');
      });
      return api;
    },
    registerB() {
      target.on('click', () => {
        outputElement.style('color', '#dc2626');
        textNode.textContent('B 处理器已响应');
      });
      return api;
    },
    render() {
      return vstack({ gap: '12px' }, (stack) => {
        stack.div((area) => {
          target = area;
          area.attr('data-event-target', 'true');
          area.className('yoya-event-target');
          area.styles({
            border: '1px dashed #cbd5e1',
            borderRadius: '8px',
            color: '#475569',
            cursor: 'pointer',
            padding: '16px',
            textAlign: 'center'
          });
          area.text('点击区域');
        });
        stack.output((out) => {
          outputElement = out;
          out.attr('data-event-output', 'true');
          out.styles({
            fontWeight: '600',
            minHeight: '1.4em'
          });
          textNode = vText('尚无处理器');
          out.child(textNode);
        });
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('注册 A', (button) => {
            button.variant('primary');
            button.on('click', () => api.registerA());
          });
          row.vButton('注册 B', (button) => {
            button.on('click', () => api.registerB());
          });
        });
      });
    }
  };

  return api;
}

export function StateDynamicAttrsExample1() {
  const tone = {
    error: '#dc2626',
    idle: '#64748b',
    saving: '#2563eb',
    success: '#16a34a'
  };
  const panelTone = {
    error: 'rgba(220, 38, 38, 0.1)',
    idle: 'transparent',
    saving: 'rgba(37, 99, 235, 0.1)',
    success: 'rgba(22, 163, 74, 0.12)'
  };

  return vStateNode({
    state: () => ({ status: 'idle' }),
    render(state, api) {
      return vstack({ gap: '12px' }, (stack) => {
        stack.div((panel) => {
          panel.attr('data-dynamic-status', (s) => s.status);
          panel.styles({
            backgroundColor: (s) => panelTone[s.status] || panelTone.idle,
            borderRadius: '8px',
            color: (s) => tone[s.status] || tone.idle,
            fontWeight: '600',
            padding: '8px 12px'
          });
          panel.child(vText((s) => (s.status === 'saving' ? '保存中…' : '已就绪')));
        });
        stack.hstack({ gap: '8px' }, (row) => {
          row.vButton('保存', (button) => {
            button
              .variant('primary')
              .attr('disabled', (s) => s.status === 'saving')
              .attr('aria-busy', (s) => (s.status === 'saving' ? 'true' : null))
              .style('opacity', (s) => (s.status === 'saving' ? '0.6' : null))
              .style('cursor', (s) => (s.status === 'saving' ? 'wait' : null))
              .on('click', () => api.startSave());
          });
          row.vButton('完成', (button) => {
            button.variant('primary');
            button.on('click', () => api.finish());
          });
          row.vButton('失败', (button) => {
            button.on('click', () => api.fail());
          });
        });
      });
    },
    startSave() {
      this.setState({ status: 'saving' });
      return this;
    },
    finish() {
      this.setState({ status: 'success' });
      return this;
    },
    fail() {
      this.setState({ status: 'error' });
      return this;
    }
  });
}
