import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const libraryDirs = [
  'src/core',
  'src/html',
  'src/svg',
  'src/layout',
  'src/actions',
  'src/navigation',
  'src/feedback',
  'src/form',
  'src/data-display',
  'src/chart',
  'src/async',
  'src/i18n',
  'src/router',
  'src/components'
];

function listJsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listJsFiles(full));
    } else if (entry.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

function quoted(text) {
  const out = [];
  const re = /(['"`])([\s\S]*?)(?<!\\)\1/g;
  let match;
  while ((match = re.exec(text)) !== null) out.push(match[2]);
  return out;
}

function classNameBlocks(source) {
  const blocks = [];
  const re = /\.(?:className|class)\(/g;
  let match;
  while ((match = re.exec(source)) !== null) {
    const open = match.index + match[0].length - 1;
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '(') {
        depth += 1;
      } else if (ch === ')') {
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

// Root inventory: yoya- class literals co-located with componentClass
const roots = new Set(['yoya-component']);
for (const dir of libraryDirs) {
  for (const file of listJsFiles(resolve(dir))) {
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

// 布局区域根类（vContainer 内部节点，不带 componentClass 但属于合法根）
const LAYOUT_ROOT_CLASSES = [
  'yoya-vaside',
  'yoya-vmain',
  'yoya-vheader',
  'yoya-vfooter',
  'yoya-vcontainer',
  'yoya-vbody',
  'yoya-vrow',
  'yoya-vcol'
];
for (const root of LAYOUT_ROOT_CLASSES) {
  roots.add(root);
}
// Parts whose prefix differs from the owning root class
const ROOT_ALIASES = {
  'yoya-vtab-': 'yoya-vtabs',
  'yoya-vcontext-': 'yoya-vcontext-menu',
  'yoya-vdropdown-': 'yoya-vdropdown-menu'
};

function owningRoot(token) {
  if (roots.has(token)) return null;
  for (const [prefix, root] of Object.entries(ROOT_ALIASES)) {
    if (token.startsWith(prefix)) return root;
  }
  let best = null;
  for (const root of roots) {
    if (root === 'yoya-component') continue;
    if (token.startsWith(`${root}-`) || token.startsWith(`${root}--`)) {
      if (!best || root.length > best.length) best = root;
    }
  }
  return best;
}

const css = readFileSync(resolve('src/yoya.ui.css'), 'utf8');
const selectorRe = /([^{}@][^{}]*)\{/g;
const yoyaTokenRe = /\.yoya-v[a-z0-9-]+/g;

function splitCompounds(selector) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of selector) {
    if (ch === '[' || ch === '(') depth += 1;
    else if (ch === ']' || ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      out.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

const orphans = [];
let match;
while ((match = selectorRe.exec(css)) !== null) {
  const selector = match[1];
  if (!selector.trim()) continue;
  for (const compound of splitCompounds(selector)) {
    const trimmed = compound.trim();
    const tokens = [...trimmed.matchAll(yoyaTokenRe)].map((x) => x[0].replace('.', ''));
    if (tokens.length === 0) continue;
    if (roots.has(tokens[0])) continue;
    orphans.push(trimmed);
  }
}

describe('preset style root scope', () => {
  it('scopes every preset part rule under its owning root class', () => {
    const unowned = orphans.filter(
      (selector) => !owningRoot(selector.match(yoyaTokenRe)[0].replace('.', ''))
    );
    expect(unowned, `orphan selectors without a resolvable root: ${unowned.join(', ')}`).toEqual(
      []
    );
    expect(
      orphans,
      `orphan preset selectors (must be root-scoped): ${orphans.slice(0, 20).join(' | ')}${orphans.length > 20 ? ' …' : ''}`
    ).toEqual([]);
  });
});
