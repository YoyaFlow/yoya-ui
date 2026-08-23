# HTML 基础元素示例

这个目录用于测试 `src/html/index.js` 导出的基础 HTML 工厂函数的常用写法。

全量 HTML 元素覆盖由 `src/html/html.test.js` 保障；这里保留轻量示例，便于在浏览器中验证父元素快捷 DSL。

覆盖内容按高频场景分组：

- 页面结构：`header`、`nav`、`section`、`article`、`aside`、`footer`
- 文本语义：`h1`、`h2`、`h3`、`p`、`strong`、`em`、`code`、`mark`、`small`、`time`
- 列表导航：`ul`、`li`、`a`
- 表单交互：`form`、`fieldset`、`legend`、`label`、`input`、`select`、`option`、`textarea`、`output`、`button`
- 数据表格：`table`、`caption`、`thead`、`tbody`、`tr`、`th`、`td`
- 媒体状态：`figure`、`img`、`figcaption`、`details`、`summary`、`progress`、`meter`

事件和动态效果：

- `input` 的 `input` 事件实时更新 `output` 预览和状态文案。
- `button` 的 `click` 事件更新保存状态，并把 `progress` 推到完成值。

下面是一个可以直接复制到 `profile-editor.js` 的完整模块。它同时演示结构、表单、表格、媒体、状态节点和事件处理；页面只需要有 `<div id="app"></div>`。

```js
import { section, vText } from 'yoya-ui';

const previewImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="240" height="100"%3E%3Crect width="240" height="100" fill="%23eef5ff"%2F%3E%3Ccircle cx="56" cy="50" r="26" fill="%23246bfe"%2F%3E%3Crect x="104" y="30" width="104" height="40" rx="6" fill="%23fff" stroke="%23246bfe" stroke-width="3"%2F%3E%3C%2Fsvg%3E';

export function renderProfileEditorExample(target = '#app') {
  const previewText = vText('预览：未填写');
  const statusText = vText('状态：等待编辑');
  let profileName = '';
  let saveProgress = null;

  const readProfileName = () => profileName || '未填写';

  const root = section((page) => {
    page.id('profile-editor').className('example-shell');

    page.header((header) => {
      header.h1('资料编辑器');
      header.p('一个可直接复用的 HTML 表单模块。');
    });

    page.nav((nav) => {
      nav.a((link) => {
        link.attr('href', '#profile-form');
        link.text('表单');
      });
      nav.a((link) => {
        link.attr('href', '#profile-table');
        link.text('表格');
      });
    });

    page.section((block) => {
      block.id('profile-form').className('example-block');
      block.h2('表单与状态');
      block.form((form) => {
        form.attr('method', 'post').attr('aria-label', '资料表单');
        form.fieldset((group) => {
          group.legend('基本资料');
          group.label((label) => {
            label.attr('for', 'profile-name');
            label.text('姓名');
          });
          group.input((input) => {
            input.id('profile-name').name('displayName');
            input.attr('type', 'text').attr('placeholder', '输入姓名');
        input.on('input', (event) => {
          const value = event.target.value.trim();
          profileName = value;
              previewText.textContent(`预览：${value || '未填写'}`);
              statusText.textContent(value ? `状态：正在编辑 ${value}` : '状态：等待编辑');
              saveProgress.attr('value', value ? 60 : 20);
            });
          });
          group.label((label) => {
            label.attr('for', 'profile-role');
            label.text('角色');
          });
          group.select((select) => {
            select.id('profile-role').name('role');
            select.option((option) => option.attr('value', 'backend').text('后端工程师'));
            select.option((option) => option.attr('value', 'fullstack').text('全栈工程师'));
          });
          group.label((label) => {
            label.attr('for', 'profile-note');
            label.text('备注');
          });
          group.textarea((textarea) => {
            textarea.id('profile-note').name('note');
            textarea.attr('rows', 3).attr('placeholder', '补充说明');
          });
        });
        form.output((output) => {
          output.id('profile-preview').child(previewText);
        });
        form.button((button) => {
          button.attr('type', 'button');
          button.text('保存');
          button.on('click', () => {
            statusText.textContent(`状态：已保存 ${readProfileName()}`);
            saveProgress.attr('value', 100);
          });
        });
      });
      block.p((status) => status.child(statusText));
      block.progress((progress) => {
        saveProgress = progress;
        progress.attr('max', 100).attr('value', 20);
      });
    });

    page.section((block) => {
      block.id('profile-table').className('example-block');
      block.h2('表格与媒体');
      block.table((table) => {
        table.caption('团队成员');
        table.thead((head) => {
          head.tr((row) => {
            row.th('姓名');
            row.th('角色');
            row.th('状态');
          });
        });
        table.tbody((body) => {
          body.tr((row) => {
            row.td('Ada');
            row.td('后端工程师');
            row.td('在线');
          });
          body.tr((row) => {
            row.td('Lin');
            row.td('全栈工程师');
            row.td('休假');
          });
        });
      });
      block.figure((figure) => {
        figure.img((image) => {
          image.attr('src', previewImage).attr('alt', '资料卡片示意图');
        });
        figure.figcaption('figure / img / figcaption 组合媒体说明。');
      });
      block.details((details) => {
        details.summary('查看 meter 状态');
        details.meter((meter) => {
          meter.attr('min', 0).attr('max', 100).attr('value', 72);
          meter.text('72%');
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderProfileEditorExample('#app');
}
```

命名约定：

- `varTag()` 创建 `<var>`，避免和 JS `var` 关键字冲突。
- `page.styleTag()` 创建子 `<style>`，避免覆盖节点已有的 `.style()` 样式设置方法。

运行方式：

```bash
npm run examples:html
```

然后打开 Vite 输出的地址，访问 `/examples/html/index.html`。
