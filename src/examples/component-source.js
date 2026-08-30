import { aside } from '../index.js';

function buildImportBlock(imports = []) {
  const importSource = imports
    .map((entry) => {
      if (typeof entry === 'string') {
        return `import { ${entry} } from 'yoya-ui';`;
      }

      return `import { ${entry.names.join(', ')} } from '${entry.from}';`;
    })
    .join('\n');
  return importSource ? `${importSource}\n\n` : '';
}

function buildFunctionSource(Component) {
  return dedentFunctionSource(
    Component.toString()
      .replace(/\(0,\s*__vite_ssr_import_\d+__\.([A-Za-z_$][\w$]*)\)/g, '$1')
      .replace(/__vite_ssr_import_\d+__\.([A-Za-z_$][\w$]*)/g, '$1')
  );
}

export function componentSource(Component, imports = []) {
  const importBlock = buildImportBlock(imports);
  const functionSource = buildFunctionSource(Component);

  return `${importBlock}export ${functionSource}`;
}

export function ComponentSource({
  component,
  sourceComponent = component,
  imports = [],
  title = `${sourceComponent.name} 源码`,
  extraSource = ''
}) {
  const importBlock = buildImportBlock(imports);
  const functionSource = buildFunctionSource(sourceComponent);
  const extraBlock = extraSource ? `${extraSource}\n\n` : '';
  const fullSource = `${importBlock}${extraBlock}export ${functionSource}`;

  return {
    source() {
      return fullSource;
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
            code.text(fullSource);
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
