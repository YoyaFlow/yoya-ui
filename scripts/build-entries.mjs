import { cpSync, rmSync } from 'node:fs';
import { rolldown } from 'rolldown';

const SHARED_INPUTS = {
  core: 'src/yoya.core.js',
  api: 'src/yoya.api.js',
  ui: 'src/yoya.ui.js',
  actions: 'src/yoya.actions.js',
  navigation: 'src/yoya.navigation.js',
  feedback: 'src/yoya.feedback.js',
  form: 'src/yoya.form.js',
  'data-display': 'src/yoya.data-display.js',
  async: 'src/yoya.async.js',
  router: 'src/yoya.router.js',
  'compiler-runtime': 'src/yoya.compiler-runtime.js',
  echart: 'src/yoya.echart.js',
  three: 'src/yoya.three.js',
  devtools: 'src/yoya.devtools.js'
};

const FULL_INPUTS = [
  ['ui.full', 'src/yoya.ui.full.js'],
  ['router.full', 'src/yoya.router.full.js'],
  ['ui-router.full', 'src/yoya.ui-router.js']
];

function entryFileName(name, minify) {
  return `yoya.${name}${minify ? '.min' : ''}.js`;
}

async function buildShared(minify) {
  const bundle = await rolldown({
    input: SHARED_INPUTS
  });
  await bundle.write({
    dir: 'dist',
    format: 'es',
    entryFileNames: (chunk) => entryFileName(chunk.name, minify),
    chunkFileNames: (chunk) => `${chunk.name}${minify ? '.min' : ''}.js`,
    // 不按目录强行归并：让 bundler 只把「被多个入口共享」的模块提到公共 chunk，
    // 只被单一入口使用的模块（如 core/ssr.js、core/devtools.js）留在自己的入口里。
    minify
  });
}

async function buildSingle(input, outputFile, minify) {
  const bundle = await rolldown({
    input
  });
  await bundle.write({
    dir: 'dist',
    format: 'es',
    entryFileNames: outputFile,
    minify
  });
}

rmSync('dist', { recursive: true, force: true });

await buildShared(false);
await buildShared(true);

for (const [name, input] of FULL_INPUTS) {
  await buildSingle(input, entryFileName(name, false), false);
  await buildSingle(input, entryFileName(name, true), true);
}

// 构建期编译器：Node 平台、@babel/parser 外置（构建期依赖，不进浏览器产物）。
const compilerBundle = await rolldown({
  input: 'src/yoya.compiler.js',
  platform: 'node',
  external: ['@babel/parser']
});
await compilerBundle.write({
  dir: 'dist',
  format: 'es',
  entryFileNames: 'yoya.compiler.js'
});

cpSync('src/chart/echarts.min.js', 'dist/echarts.min.js');
cpSync('src/yoya.ui.css', 'dist/yoya.ui.css');
