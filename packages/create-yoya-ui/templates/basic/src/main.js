import { div, toast, vBody, vForm, vText } from '@yoyaflow/yoya-ui';
import '@yoyaflow/yoya-ui/ui.css';

// 页面壳：消费主题 token，明暗切换自动跟随
const page = vBody({
  maxWidth: 860,
  children: [
    div((root) => {
      root.h1('yoya-ui 快速开始');
      root.p('声明式组件、表单收集、主题切换一条命令跑通。');

      // 示例卡片：按钮 + 事件（快捷方法返回父节点，事件用回调参数）
      const output = vText('未点击');
      root.vCard((card) => {
        card.vCardHeader('按钮示例');
        card.vCardBody((body) => {
          body.vstack({ gap: '12px' }, (stack) => {
            stack.p('点击按钮，事件绑定在回调参数里。');
            stack.hstack((row) => {
              row.vButton('点击我', (btn) => {
                btn.variant('primary');
                btn.on('click', () => {
                  output.textContent('已点击：' + new Date().toLocaleTimeString());
                });
              });
              row.vButton('提示', (btn) => btn.on('click', () => toast.info('yoya-ui 已就绪')));
              row.spacer();
              row.child(output);
            });
          });
        });
      });

      // 表单示例：vForm + vFormItem 收集与校验
      const form = vForm((form) => {
        form.vFormItem((item) => {
          item.label('服务名').name('service').required({ message: '请填写服务名' });
          item.control((editor) => editor.vInput({ name: 'service', value: 'api-gateway' }));
        });
        form.vFormItem((item) => {
          item.label('环境').name('env').required({ message: '请选择环境' });
          item.control((editor) => editor.vSelect({ name: 'env', options: ['dev', 'prod'] }));
        });
        form.vButton('提交', (btn) => {
          btn.variant('primary');
          btn.on('click', () => {
            if (form.validate()) {
              toast.success('提交成功：' + JSON.stringify(form.values()));
            }
          });
        });
      });
      root.vCard((card) => {
        card.vCardHeader('表单示例');
        card.vCardBody((body) => body.child(form));
      });

      // 主题切换：明暗模式
      root.vCard((card) => {
        card.vCardHeader('主题');
        card.vCardBody((body) => {
          body.hstack((row) => {
            row.vButton('深色模式', (btn) => btn.on('click', () => setMode('dark')));
            row.vButton('浅色模式', (btn) => btn.on('click', () => setMode('light')));
            row.vButton('跟随系统', (btn) => btn.on('click', () => setMode('system')));
          });
        });
      });
    })
  ]
});

page.bindTo('#app');

function setMode(mode) {
  document.documentElement.setAttribute('data-yoya-mode', mode);
}
