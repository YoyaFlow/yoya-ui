import { section, vClientOnly, vText } from '../index.js';
import { ComponentSource } from './component-source.js';

export function InteropExampleSection(options) {
  const live = options.component();
  const output = vText(options.outputText ?? '');
  const clientOnlyHost = vClientOnly(() => live.render());

  return {
    render() {
      return section((example) => {
        example.className('components-interop-demo');
        example.attr('data-third-party-demo', options.id);
        example.h3(options.title);
        example.p(options.description);

        if (options.controls.length > 0) {
          example.div((toolbar) => {
            toolbar.className('components-interop-demo-toolbar');
            options.controls.forEach((control) => {
              toolbar.vButton(control.label, (button) => {
                button.on('click', () => control.run(live, output));
              });
            });
            toolbar.child(output);
          });
        }

        example.div((liveBox) => {
          liveBox.className('components-interop-demo-live');
          liveBox.attr('data-third-party-demo-live', 'true');
          liveBox.child(clientOnlyHost);
        });

        example.child(
          ComponentSource({
            component: options.component,
            extraSource: options.extraSource,
            imports: options.imports,
            sourceComponent: options.sourceComponent,
            title: options.sourceTitle
          })
        );
      });
    }
  };
}

export function interopPageFrame({ docsKey, heading, lead, usage, note, demos }) {
  return {
    render() {
      return section((page) => {
        page.className('components-route-page components-third-party-docs');
        page.attr('data-third-party-docs', docsKey);
        page.header((header) => {
          header.className('components-third-party-docs-header');
          header.h1(heading);
          header.p(lead);
        });

        page.section((usageSection) => {
          usageSection.h2('何时使用');
          usageSection.ul((list) => {
            usage.forEach((item) => list.li(item));
          });
        });

        page.section((noteSection) => {
          noteSection.className('components-third-party-note');
          noteSection.h2('集成要点');
          noteSection.p(note);
          noteSection.pre((pre) => {
            pre.className('interop-policy-signature');
            pre.code(
              [
                '// 第三方库不需要支持服务端渲染：',
                '// 用 vClientOnly 包住 live demo，服务端只输出占位。',
                "import { vClientOnly } from '@yoyaflow/yoya-ui';",
                '',
                'page.child(vClientOnly(() => demo.render()));'
              ].join('\n')
            );
          });
        });

        page.section((examples) => {
          examples.h2('代码演示');
          demos.forEach((demo) => {
            examples.child(InteropExampleSection(demo));
          });
        });
      });
    }
  };
}
