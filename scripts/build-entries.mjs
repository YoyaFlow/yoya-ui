import { cpSync, rmSync } from 'node:fs';
import { rolldown } from 'rolldown';

const SHARED_INPUTS = {
  core: 'src/yoya.core.js',
  ui: 'src/yoya.ui.js',
  router: 'src/yoya.router.js',
  echart: 'src/yoya.echart.js',
  three: 'src/yoya.three.js',
  devtools: 'src/yoya.devtools.js'
};

const FULL_INPUTS = [
  ['ui.full', 'src/yoya.ui.full.js'],
  ['router.full', 'src/yoya.router.full.js'],
  ['ui-router.full', 'src/yoya.ui-router.js']
];

function isCoreModule(id) {
  const normalized = String(id).replace(/\\/g, '/');
  if (!normalized.includes('/src/')) {
    return false;
  }
  return (
    normalized.includes('/src/core/') ||
    normalized.includes('/src/html/') ||
    normalized.includes('/src/svg/') ||
    normalized.includes('/src/components/')
  );
}

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
    minify,
    manualChunks(id) {
      return isCoreModule(id) ? 'yoya.core.chunk' : undefined;
    }
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

async function buildUmd(minify) {
  const bundle = await rolldown({
    input: 'src/yoya.ui-router.js'
  });
  await bundle.write({
    dir: 'dist',
    format: 'umd',
    name: 'YoyaUI',
    entryFileNames: `yoya.ui-router.umd${minify ? '.min' : ''}.js`,
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

await buildUmd(false);
await buildUmd(true);

cpSync('src/chart/echarts.min.js', 'dist/echarts.min.js');
cpSync('src/yoya.ui.css', 'dist/yoya.ui.css');
