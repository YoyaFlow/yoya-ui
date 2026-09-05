import { section, vClientOnly, vText } from '../index.js';
import { ComponentSource } from './component-source.js';
import './interop-theme.css';

export function InteropExampleSection(options) {
  const controls = options.controls ?? [];
  const live = options.component();
  const output = vText(options.outputText ?? '');
  const clientOnlyHost = vClientOnly(() => live.render());

  return {
    render() {
      return section((example) => {
        example.className('components-interop-demo');
        example.attr('data-third-party-demo', options.id);
        if (options.kicker) {
          example.div((meta) => {
            meta.className('components-interop-demo-kicker');
            meta.strong(options.kicker);
          });
        }
        if (options.title) {
          example.h3(options.title);
        }
        example.p(options.description);

        if (controls.length > 0) {
          example.div((toolbar) => {
            toolbar.className('components-interop-demo-toolbar');
            controls.forEach((control) => {
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

        if (options.glue !== false) {
          example.child(
            ComponentSource({
              component: options.component,
              extraSource: options.extraSource,
              imports: options.imports,
              sourceComponent: options.sourceComponent,
              title: options.sourceTitle
            })
          );
        }

        if (options.usageTitle) {
          example.child(
            ComponentSource({
              component: options.component,
              imports: options.usageImports,
              sourceComponent: options.usageComponent ?? options.component,
              title: options.usageTitle
            })
          );
        }
      });
    }
  };
}

export function interopPageFrame({
  demos,
  docsKey,
  gluePanel = null,
  heading,
  lead,
  note,
  pageClass = '',
  usage
}) {
  return {
    render() {
      return section((page) => {
        const fullClass = [
          'components-route-page',
          'components-third-party-docs',
          pageClass
        ]
          .filter(Boolean)
          .join(' ');
        page.className(fullClass);
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
          noteSection.h2('集成方式');
          noteSection.p(note);
        });

        page.section((examples) => {
          examples.h2('代码演示');
          if (gluePanel) {
            examples.child(gluePanel);
          }
          demos.forEach((demo) => {
            examples.child(InteropExampleSection(demo));
          });
        });
      });
    }
  };
}
