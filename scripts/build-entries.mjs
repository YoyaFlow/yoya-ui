import { build } from 'vite';
import { cpSync } from 'node:fs';

const entries = [
  ['ui', 'src/yoya.ui.js'],
  ['core', 'src/yoya.core.js'],
  ['echart', 'src/yoya.echart.js'],
  ['ssr', 'src/yoya.ssr.js']
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

cpSync('src/chart/echarts.min.js', 'dist/echarts.min.js');
cpSync('src/yoya.ui.css', 'dist/yoya.ui.css');
