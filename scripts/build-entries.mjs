import { build } from 'vite';
import { cpSync } from 'node:fs';

const entries = [
  ['echart', 'src/yoya.echart.js'],
  ['ui', 'src/yoya.ui.js'],
  ['core', 'src/yoya.core.js']
];

for (const [name, entry] of entries) {
  await build({
    configFile: false,
    logLevel: 'info',
    build: {
      emptyOutDir: name === 'ui',
      outDir: 'dist',
      lib: {
        entry,
        formats: ['es'],
        fileName: () => `yoya.${name}.js`
      }
    }
  });
}

cpSync('src/yoya.ui.css', 'dist/yoya.ui.css');
