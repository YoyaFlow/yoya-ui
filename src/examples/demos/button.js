import { hstack, vButton, vForm, vText } from '../../index.js';

export function ButtonExample1() {
  return {
    render() {
      return vButton('OK')
        .variant('primary')
        .on('click', () => {
          console.log('clicked');
        });
    }
  };
}

export function ButtonVariantsExample1() {
  return {
    render() {
      return hstack((row) => {
        row.style('gap', '10px');
        row.vButton('主要按钮', (button) => button.variant('primary'));
        row.vButton('默认按钮');
        row.vButton('危险按钮', (button) => button.variant('danger'));
        row.vButton('幽灵按钮', (button) => button.variant('ghost'));
      });
    }
  };
}

export function ButtonSizesExample1() {
  return {
    render() {
      return hstack((row) => {
        row.style({ alignItems: 'center', gap: '10px' });
        ['small', 'medium', 'large'].forEach((size) => {
          row.vButton(size, (button) => button.size(size));
        });
      });
    }
  };
}

export function ButtonStatesExample1() {
  const state = vText('等待点击');

  return {
    render() {
      return hstack((row) => {
        row.style('gap', '10px');
        row.vButton('执行任务', (button) => {
          button.variant('primary');
          button.on('click', () => {
            state.textContent('执行中');
            button.loading(true);
            setTimeout(() => {
              button.loading(false);
              state.textContent('已完成');
            }, 600);
          });
        });
        row.vButton('不可用', (button) => button.disabled(true));
        row.child(state);
      });
    }
  };
}

export function ButtonFormExample1() {
  const result = vText('尚未提交');

  return {
    render() {
      return vForm((form) => {
        form.style('gap', '12px');
        form.hstack((row) => {
          row.style('gap', '10px');
          row.vButton('提交表单', (button) => {
            button.variant('primary');
            button.formType('submit');
          });
          row.vButton('重置', (button) => button.formType('reset'));
        });
        form.output((output) => output.child(result));
        form.on('submit', (event) => {
          event.preventDefault();
          result.textContent('已提交');
        });
        form.on('reset', () => result.textContent('已重置'));
      });
    }
  };
}
