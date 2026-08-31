import {
  createI18n,
  div,
  initYoyaTheme,
  vDialog,
  vForm,
  vFormItem,
  vInput,
  vMessageContainer,
  vStateNode,
  vText,
  vThemeModeSwitch
} from '../../index.js';
import { hydrate, mount, parseState, renderToString } from '../../yoya.ssr.js';

const messages = {
  'zh-CN': {
    title: 'SSR 独立演示',
    subtitle: '服务端渲染 + Hydration：按钮、弹窗、表单等内容。',
    buttonTitle: '按钮',
    counter: '点击次数：{count}',
    increment: '点击 +1',
    dialogSection: '弹窗',
    dialogTitle: '详情弹窗',
    dialogBody: '弹窗内容由服务端输出到 HTML，hydration 后在客户端绑定打开/关闭事件。',
    openDialog: '打开弹窗',
    closeDialog: '关闭',
    formTitle: '注册表单',
    nameLabel: '姓名',
    emailLabel: '邮箱',
    submit: '提交',
    reset: '重置',
    submitSuccess: '提交成功：{name} / {email}'
  },
  'en-US': {
    title: 'SSR Standalone Demo',
    subtitle: 'Server rendering + hydration: buttons, dialog, form and more.',
    buttonTitle: 'Button',
    counter: 'Clicks: {count}',
    increment: 'Click +1',
    dialogSection: 'Dialog',
    dialogTitle: 'Detail Dialog',
    dialogBody: 'The dialog content is server-rendered into HTML and bound on hydration.',
    openDialog: 'Open Dialog',
    closeDialog: 'Close',
    formTitle: 'Sign-up Form',
    nameLabel: 'Name',
    emailLabel: 'Email',
    submit: 'Submit',
    reset: 'Reset',
    submitSuccess: 'Submitted: {name} / {email}'
  }
};

const LOCALE_STORAGE_KEY = 'yoya-ui:ssr-demo-locale';

/** 按请求语言创建 I18n 实例，页面内 ".s()" 显式传该实例，交互路径也保持同语言。 */
export const createLocale = (initial = {}) =>
  createI18n({ language: initial.locale || 'zh-CN', messages });

/**
 * SSR 页面工厂：服务端与客户端共用。包含按钮、弹窗、表单与消息容器，
 * 全部由 renderToString 输出 HTML，hydration 后绑定交互。
 */
export function createDemoPage(initial = {}) {
  const locale = createLocale(initial);
  const counter = vStateNode({
    state: { count: 0 },
    render(state, component) {
      return div((root) => {
        root.className('ssr-demo-counter');
        root.attr('data-ssr-counter', 'true');
        root.p('点击次数：{count}'.s('counter', { count: state.count }, locale));
        root.vButton('点击 +1'.s('increment', locale), (button) => {
          button.on('click', () => component.setState({ count: state.count + 1 }));
        });
      });
    }
  });

  const dialog = vDialog();
  dialog.attr('data-ssr-dialog', 'true');
  dialog.content((content) => {
    content.h3('详情弹窗'.s('dialogTitle', locale));
    content.p('弹窗内容由服务端输出到 HTML，hydration 后在客户端绑定打开/关闭事件。'.s('dialogBody', locale));
    content.vButton('关闭'.s('closeDialog', locale), (button) => {
      button.on('click', () => dialog.close());
    });
  });

  const form = vForm();
  form.attr('data-ssr-form', 'true');
  const nameItem = vFormItem({
    label: '姓名'.s('nameLabel', locale),
    name: 'name',
    required: true
  });
  nameItem.control(
    vInput({ name: 'name', placeholder: '姓名'.s('nameLabel', locale) })
  );
  const emailItem = vFormItem({
    label: '邮箱'.s('emailLabel', locale),
    name: 'email',
    required: true
  });
  emailItem.control(
    vInput({ name: 'email', type: 'email', placeholder: '邮箱'.s('emailLabel', locale) })
  );
  form.child(nameItem, emailItem);
  form.validate(); // 服务端把必填错误烘焙进 HTML，客户端同规则校验

  const messagesHost = vMessageContainer({ placement: 'top-right' }).attr(
    'data-ssr-messages',
    'true'
  );

  return div((root) => {
    root.className('ssr-demo-live');
    root.attr('data-ssr-live', 'true');
    root.vCard((card) => {
      card.vCardHeader('SSR 独立演示'.s('title', locale));
      card.vCardBody((body) => {
        body.p('服务端渲染 + Hydration：按钮、弹窗、表单等内容。'.s('subtitle', locale));
        body.h3('按钮'.s('buttonTitle', locale));
        body.child(counter);
        body.h3('弹窗'.s('dialogSection', locale));
        body.vButton('打开弹窗'.s('openDialog', locale), (button) => {
          button.attr('data-ssr-dialog-open', 'true');
          button.on('click', () => dialog.open());
        });
        body.child(dialog);
        body.h3('表单'.s('formTitle', locale));
        body.child(form);
        body.hstack((row) => {
          row.style({ gap: '8px' });
          row.vButton('提交'.s('submit', locale), (button) => {
            button.attr('data-ssr-submit', 'true');
            button.variant('primary');
            button.on('click', () => {
              if (form.validate()) {
                const values = form.values();
                messagesHost.success(
                  '提交成功：{name} / {email}'.s(
                    'submitSuccess',
                    { name: values.name, email: values.email },
                    locale
                  )
                );
              }
            });
          });
          row.vButton('重置'.s('reset', locale), (button) => {
            button.attr('data-ssr-reset', 'true');
            button.on('click', () => form.reset());
          });
        });
      });
    });
    root.child(messagesHost);
  });
}

const outputStyles = {
  background: 'var(--yoya-color-surface-hover, #f6f8fa)',
  border: '1px solid var(--yoya-color-border, #d8dee8)',
  borderRadius: '8px',
  boxSizing: 'border-box',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0',
  maxHeight: '220px',
  overflow: 'auto',
  padding: '10px 12px',
  whiteSpace: 'pre-wrap',
  width: '100%',
  color: 'var(--yoya-color-text, #172033)'
};

/**
 * 独立演示页：浏览器内模拟服务端渲染——renderToString 输出 HTML 与状态，
 * 再注入容器 hydrate；可切换到纯客户端 mount 模式，并切换语言。
 */
export function SsrDemoPage() {
  const hostId = 'ssr-demo-host';
  const state = {
    locale: readPersistedLocale() || 'zh-CN',
    renderMode: 'ssr'
  };
  const htmlText = vText('');
  const stateText = vText('');
  const modeText = vText('');
  let serverResult = null;

  initYoyaTheme({ persist: true });

  const currentState = () => ({ locale: state.locale });

  const renderServer = () => {
    serverResult = renderToString(createDemoPage, { state: currentState() });
    htmlText.textContent(serverResult.html);
    stateText.textContent(serverResult.state);
    modeText.textContent('当前模式：服务端渲染（renderToString → hydrate）');
  };

  const renderClient = () => {
    htmlText.textContent('客户端模式：页面由 mount() 直接渲染，不经过服务端。');
    stateText.textContent(JSON.stringify(currentState()));
    modeText.textContent('当前模式：纯客户端渲染（mount）');
  };

  const renderLive = () => {
    const host = document.getElementById(hostId);
    if (!host) {
      return;
    }

    if (state.renderMode === 'ssr') {
      host.innerHTML = serverResult.html;
      hydrate(createDemoPage, host, parseState(serverResult.state));
    } else {
      mount(createDemoPage, host, currentState());
    }
  };

  const sync = () => {
    if (state.renderMode === 'ssr') {
      renderServer();
    } else {
      renderClient();
    }
    renderLive();
  };

  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(sync);
  }

  const component = {
    render() {
      return div((page) => {
        page.className('ssr-demo-page');
        page.styles({
          background: 'var(--yoya-color-bg, #f5f7fa)',
          boxSizing: 'border-box',
          color: 'var(--yoya-color-text, #172033)',
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          lineHeight: '1.5',
          minHeight: '100vh',
          padding: '24px'
        });
        page.h1('SSR 独立演示');
        page.p(
          '在浏览器内模拟服务端渲染：renderToString 输出 HTML 与序列化状态，再 hydrate 收养并绑定交互。'
        );
        page.div((controls) => {
          controls.className('ssr-demo-controls');
          controls.style({ display: 'flex', flexWrap: 'wrap', gap: '8px', margin: '12px 0' });
          controls.vButton('SSR 模式', (button) => {
            button.variant(state.renderMode === 'ssr' ? 'primary' : 'secondary');
            button.on('click', () => component.setRenderMode('ssr'));
          });
          controls.vButton('客户端模式', (button) => {
            button.variant(state.renderMode === 'client' ? 'primary' : 'secondary');
            button.on('click', () => component.setRenderMode('client'));
          });
          controls.vButton('中文', (button) => {
            button.variant(state.locale === 'zh-CN' ? 'primary' : 'secondary');
            button.on('click', () => component.setLocale('zh-CN'));
          });
          controls.vButton('English', (button) => {
            button.variant(state.locale === 'en-US' ? 'primary' : 'secondary');
            button.on('click', () => component.setLocale('en-US'));
          });
          controls.child(
            vThemeModeSwitch((switchNode) => {
              switchNode.attr('data-ssr-theme-switch', 'true');
            })
          );
        });
        page.p(modeText);
        page.h2('renderToString 输出的 HTML');
        page.pre((pre) => {
          pre.className('ssr-demo-output');
          pre.attr('data-ssr-live-output', 'true');
          pre.styles(outputStyles);
          pre.code(htmlText);
        });
        page.h2('序列化状态 __YOYA_DATA__');
        page.pre((pre) => {
          pre.className('ssr-demo-output');
          pre.attr('data-ssr-live-output', 'true');
          pre.styles(outputStyles);
          pre.code(stateText);
        });
        page.h2('Hydration 后的实时应用');
        page.div((host) => {
          host.id(hostId);
          host.className('ssr-demo-host');
          host.styles({
            background: 'var(--yoya-color-surface, #ffffff)',
            border: '1px solid var(--yoya-color-border, #d8dee8)',
            borderRadius: '8px',
            boxSizing: 'border-box',
            minHeight: '120px',
            overflow: 'auto',
            padding: '12px',
            width: '100%'
          });
          host.span('等待 hydration…');
        });
      });
    },
    setLocale(locale) {
      state.locale = locale;
      persistLocale(locale);
      sync();
      return component;
    },
    setRenderMode(mode) {
      state.renderMode = mode === 'client' ? 'client' : 'ssr';
      sync();
      return component;
    }
  };

  return component;
}

function readPersistedLocale() {
  try {
    return globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function persistLocale(locale) {
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // 存储不可用时保持静默，不阻止切换。
  }
}
