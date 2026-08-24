import { build } from 'vite';

const entries = [
  ['ui', 'src/index.js'],
  ['base', 'src/yoya.base.js'],
  ['form', 'src/yoya.form.js'],
  ['navigation', 'src/yoya.navigation.js'],
  ['feedback', 'src/yoya.feedback.js'],
  ['data', 'src/yoya.data.js'],
  ['async', 'src/yoya.async.js'],
  ['router', 'src/yoya.router.js']
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
