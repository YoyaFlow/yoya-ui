import { vCard, vStateNode, vText } from '../../index.js';

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
