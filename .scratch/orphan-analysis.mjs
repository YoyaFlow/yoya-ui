import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const libraryDirs = ['core','html','svg','layout','actions','navigation','feedback','form','data-display','chart','async','i18n','router','components'].map((d) => `src/${d}`);

function listJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...listJsFiles(full));
    else if (entry.endsWith('.js')) out.push(full);
  }
  return out;
}

function quoted(text) {
  const out = [];
  const re = /(['"`])([\s\S]*?)(?<!\\)\1/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[2]);
  return out;
}

function classNameBlocks(source) {
  const blocks = [];
  const re = /\.(?:className|class)\(/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '(') depth += 1;
      else if (ch === ')') {
        depth -= 1;
        if (depth === 0) {
          blocks.push(source.slice(open, i + 1));
          break;
        }
      }
    }
  }
  return blocks;
}

// 1) root inventory: yoya- literals co-located with componentClass
const roots = new Set(['yoya-component']);
for (const dir of libraryDirs) {
  for (const file of listJsFiles(dir)) {
    for (const block of classNameBlocks(readFileSync(file, 'utf8'))) {
      if (block.includes('componentClass')) {
        for (const literal of quoted(block)) {
          for (const part of literal.split(/\s+/)) {
            if (part.startsWith('yoya-')) roots.add(part);
          }
        }
      }
    }
  }
}

// 2) css orphan audit
const css = readFileSync('src/yoya.ui.css', 'utf8');
const selectorRe = /([^{}@][^{}]*)\{/g;
const yoyaTokenRe = /\.yoya-v[a-z0-9-]+/g;
const orphans = [];
let m;
while ((m = selectorRe.exec(css)) !== null) {
  const selector = m[1].trim();
  if (!selector) continue;
  for (const compound of selector.split(',')) {
    const tokens = [...compound.matchAll(yoyaTokenRe)].map((x) => x[0].replace('.', ''));
    if (tokens.length === 0) continue;
    const first = tokens[0];
    if (!roots.has(first)) {
      orphans.push(`${compound.trim()}   (first token: ${first}, selector: ${selector.trim().slice(0, 60)})`);
    }
  }
}
console.log(`roots: ${roots.size}`);
console.log(`orphan selectors: ${orphans.length}`);
for (const o of orphans) console.log(o);