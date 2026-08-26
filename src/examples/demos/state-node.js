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
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('提供 update 时，setState 只做局部文本更新，不重建视图树。');
            stack.output((out) => out.child(output));
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('+1');
            button.variant('primary');
            button.on('click', () => api.setState({ count: state.count + 1 }));
          });
          footer.vButton((button) => {
            button.label('重置');
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

export function StateRebuildExample1() {
  return vStateNode({
    state: () => ({ attempts: 0, status: 'idle' }),
    render(state, api) {
      return vCard((card) => {
        card.vCardHeader('全量重建');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p('不提供 update 时，setState 会销毁旧内容并重新调用 render。');
            stack.p(`状态：${state.status}`);
            stack.p(`次数：${state.attempts}`);
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label('执行');
            button.variant('primary');
            button.on('click', () =>
              api.setState({
                attempts: state.attempts + 1,
                status: 'running'
              })
            );
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
        card.vCardHeader('结构切换');
        card.vCardBody((body) => {
          body.vstack((stack) => {
            stack.style('gap', '14px');
            stack.p(state.visible ? '当前显示内容。' : '当前内容已隐藏。');
          });
        });
        card.vCardFooter((footer) => {
          footer.vButton((button) => {
            button.label(state.visible ? '隐藏' : '显示');
            button.variant('primary');
            button.on('click', () => api.setState({ visible: !state.visible }));
          });
        });
      });
    },
    update(state, api, changed) {
      if (changed.has('visible')) {
        return true;
      }

      return false;
    }
  });
}
