import { cpSync, mkdirSync, readdirSync } from 'node:fs';

mkdirSync('dist/examples', { recursive: true });

readdirSync('dist')
  .filter((name) => name.startsWith('yoya') && (name.endsWith('.js') || name.endsWith('.css')))
  .forEach((name) => {
    cpSync(`dist/${name}`, `dist/examples/${name}`);
  });
