import { aside } from '../../src/index.js';

export function componentSource(Component, imports = []) {
  const importSource = imports.length ? `import { ${imports.join(', ')} } from 'yoya-ui';\n\n` : '';
  const functionSource = dedentFunctionSource(
    Component.toString()
      .replace(/\(0,\s*__vite_ssr_import_\d+__\.([A-Za-z_$][\w$]*)\)/g, '$1')
      .replace(/__vite_ssr_import_\d+__\.([A-Za-z_$][\w$]*)/g, '$1')
  );

  return `${importSource}export ${functionSource}`;
}

export function ComponentSource({ component, imports = [], title = `${component.name} 源码` }) {
  const source = componentSource(component, imports);

  return {
    source() {
      return source;
    },
    render() {
      return aside((panel) => {
        panel.className('source-panel');
        panel.style('width', '100%');
        panel.h2(title);
        panel.pre((pre) => {
          pre.className('source-code');
          pre.code((code) => {
            code.attr('data-source-example', title);
            code.text(source);
          });
        });
      });
    }
  };
}

function dedentFunctionSource(source) {
  const lines = source.split(/\r?\n/);
  const bodyIndents = lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => line.match(/^\s*/)[0].length);
  const indent = bodyIndents.length ? Math.min(...bodyIndents) : 0;

  return [
    lines[0],
    ...lines.slice(1).map((line) => line.slice(Math.min(indent, line.length)))
  ].join('\n');
}
