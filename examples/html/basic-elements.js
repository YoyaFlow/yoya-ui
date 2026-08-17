import { section, vText } from '../../src/index.js';

const sampleImageSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="160" viewBox="0 0 320 160">
  <rect width="320" height="160" fill="#eef5ff"/>
  <path d="M36 116h248" stroke="#246bfe" stroke-width="6" stroke-linecap="round"/>
  <circle cx="90" cy="82" r="30" fill="#246bfe"/>
  <rect x="142" y="54" width="108" height="56" rx="8" fill="#ffffff" stroke="#246bfe" stroke-width="4"/>
</svg>
`.trim();

const sampleImageSrc = `data:image/svg+xml,${encodeURIComponent(sampleImageSvg)}`;

/**
 * 渲染基础 HTML 元素示例，用于验证 html 模块工厂的常见用法。
 */
export function renderBasicElementsExample(target = '#app') {
  const previewText = vText('预览：未填写');
  const statusText = vText('状态：等待编辑');
  let profileNameInput = null;
  let saveProgress = null;

  const readProfileName = () => {
    const value = profileNameInput?.renderDom().value.trim();
    return value || '未填写';
  };

  const root = section((page) => {
    page.id('basic-elements').className('example-shell');

    page.header((header) => {
      header.className('example-header');
      header.h1('HTML 高频元素');
      header.p('按页面结构、文本、列表导航、表单、表格和媒体状态分组演示常用 HTML 工厂。');
    });

    page.section((block) => {
      block.className('example-block');
      block.attr('data-example-kind', 'structure');
      block.h2('页面结构');
      block.header((intro) => {
        intro.h3('结构化区域');
        intro.p('header / nav / article / aside / footer 是后台页面和局部模块最常用的结构骨架。');
      });
      block.nav((nav) => {
        nav.a((link) => {
          link.attr('href', '#form-demo');
          link.text('跳到表单');
        });
        nav.a((link) => {
          link.attr('href', '#table-demo');
          link.text('跳到表格');
        });
      });
      block.article((article) => {
        article.h3('内容主体');
        article.p('article 适合承载一块完整业务内容。');
      });
      block.aside((aside) => {
        aside.p('aside 可以放筛选摘要、帮助信息或侧栏提示。');
      });
      block.footer('footer 用于放操作说明或辅助链接。');
    });

    page.section((block) => {
      block.className('example-block');
      block.attr('data-example-kind', 'text');
      block.h2('文本语义');
      block.p((line) => {
        line.strong('ViewNode');
        line.text(' 是基础节点，');
        line.em('字符串输入');
        line.text(' 会在构建阶段转成 ');
        line.code('VTextNode');
        line.text('。');
      });
      block.p((line) => {
        line.mark('mark');
        line.text(' 可标记重点，');
        line.small('small 适合辅助说明。');
      });
      block.time((date) => {
        date.attr('datetime', '2026-08-17');
        date.text('2026-08-17');
      });
    });

    page.section((block) => {
      block.className('example-block');
      block.attr('data-example-kind', 'lists');
      block.h2('列表与导航');
      block.ul((list) => {
        list.li('section / div / article：组织页面区域');
        list.li('h1-h6 / p / strong / code：表达文本层级');
        list.li('form / input / select / textarea：收集用户输入');
        list.li('table / thead / tbody / tr / td：展示结构化数据');
      });
    });

    page.section((block) => {
      block.className('example-block');
      block.attr('data-example-kind', 'form');
      block.id('form-demo');
      block.h2('表单');
      block.form((profileForm) => {
        profileForm.attr('method', 'post').attr('aria-label', '资料表单示例');
        profileForm.fieldset((group) => {
          group.legend('资料表单');
          group.label((fieldLabel) => {
            fieldLabel.attr('for', 'profile-name');
            fieldLabel.text('姓名');
          });
          group.input((nameInput) => {
            profileNameInput = nameInput;
            nameInput.id('profile-name');
            nameInput.name('displayName');
            nameInput.attr('type', 'text');
            nameInput.attr('placeholder', '输入姓名');
            nameInput.on('input', (event) => {
              const value = event.target.value.trim();
              previewText.textContent(`预览：${value || '未填写'}`);
              statusText.textContent(value ? `状态：正在编辑 ${value}` : '状态：等待编辑');
              saveProgress.attr('value', value ? 60 : 20);
            });
          });
          group.label((fieldLabel) => {
            fieldLabel.attr('for', 'profile-role');
            fieldLabel.text('角色');
          });
          group.select((roleSelect) => {
            roleSelect.id('profile-role');
            roleSelect.name('role');
            roleSelect.option((option) => {
              option.attr('value', 'backend');
              option.text('后端工程师');
            });
            roleSelect.option((option) => {
              option.attr('value', 'fullstack');
              option.text('全栈工程师');
            });
          });
          group.label((fieldLabel) => {
            fieldLabel.attr('for', 'profile-note');
            fieldLabel.text('备注');
          });
          group.textarea((note) => {
            note.id('profile-note');
            note.name('note');
            note.attr('rows', 3);
            note.attr('placeholder', '补充说明');
          });
        });
        profileForm.output((preview) => {
          preview.id('profile-preview');
          preview.attr('for', 'profile-name profile-role');
          preview.child(previewText);
        });
        profileForm.button((saveButton) => {
          saveButton.id('save-profile');
          saveButton.attr('type', 'button');
          saveButton.text('保存');
          saveButton.on('click', () => {
            const profileName = readProfileName();
            statusText.textContent(`状态：已保存 ${profileName}`);
            saveProgress.attr('value', 100);
          });
        });
      });
    });

    page.section((block) => {
      block.className('example-block');
      block.attr('data-example-kind', 'table');
      block.id('table-demo');
      block.h2('表格');
      block.table((grid) => {
        grid.caption('核心节点职责');
        grid.thead((head) => {
          head.tr((row) => {
            row.th('名称');
            row.th('说明');
          });
        });
        grid.tbody((body) => {
          body.tr((row) => {
            row.td('ViewNode');
            row.td('视图节点底座');
          });
          body.tr((row) => {
            row.td('ElementNode');
            row.td('真实 DOM 元素节点');
          });
          body.tr((row) => {
            row.td('VTextNode');
            row.td('文本节点包装');
          });
        });
      });
    });

    page.section((block) => {
      block.className('example-block');
      block.attr('data-example-kind', 'media');
      block.h2('媒体与状态');
      block.figure((figure) => {
        figure.img((image) => {
          image.attr('src', sampleImageSrc);
          image.attr('alt', 'HTML 工厂示例图');
          image.attr('width', 320);
          image.attr('height', 160);
        });
        figure.figcaption('figure / img / figcaption 适合承载图文说明。');
      });
      block.details((details) => {
        details.summary('查看状态元素');
        details.p((status) => {
          status.id('save-status');
          status.child(statusText);
        });
        details.progress((progress) => {
          saveProgress = progress;
          progress.id('save-progress');
          progress.attr('max', 100);
          progress.attr('value', 20);
        });
        details.meter((meter) => {
          meter.attr('min', 0);
          meter.attr('max', 100);
          meter.attr('value', 72);
          meter.text('72%');
        });
      });
    });
  });

  root.bindTo(target);
  return root;
}

if (typeof document !== 'undefined' && document.querySelector('#app')) {
  renderBasicElementsExample('#app');
}
