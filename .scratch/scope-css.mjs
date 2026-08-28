import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const libraryDirs = ['core','html','svg','layout','actions','navigation','feedback','form','data-display','chart','async','i18n','router','components'].map((d) => `src/${d}`);
function listJsFiles(dir) { const out = []; for (const entry of readdirSync(dir)) { const full = join(dir, entry); if (statSync(full).isDirectory()) out.push(...listJsFiles(full)); else if (entry.endsWith('.js')) out.push(full); } return out; }
function quoted(text) { const out = []; const re = /(['"`])([\s\S]*?)(?<!\\)\1/g; let m; while ((m = re.exec(text)) !== null) out.push(m[2]); return out; }
function classNameBlocks(source) { const blocks = []; const re = /\.(?:className|class)\(/g; let m; while ((m = re.exec(source)) !== null) { const open = m.index + m[0].length - 1; let depth = 0; for (let i = open; i < source.length; i += 1) { const ch = source[i]; if (ch === '(') depth += 1; else if (ch === ')') { depth -= 1; if (depth === 0) { blocks.push(source.slice(open, i + 1)); break; } } } } return blocks; }

const roots = new Set(['yoya-component']);
for (const dir of libraryDirs) for (const file of listJsFiles(dir)) for (const block of classNameBlocks(readFileSync(file, 'utf8'))) if (block.includes('componentClass')) for (const literal of quoted(block)) for (const part of literal.split(/\s+/)) if (part.startsWith('yoya-')) roots.add(part);

const ROOT_ALIASES = { 'yoya-vtab-': 'yoya-vtabs', 'yoya-vcontext-': 'yoya-vcontext-menu', 'yoya-vdropdown-': 'yoya-vdropdown-menu' };
function owningRoot(token) {
  if (roots.has(token)) return null;
  for (const [prefix, root] of Object.entries(ROOT_ALIASES)) if (token.startsWith(prefix)) return root;
  let best = null;
  for (const root of roots) { if (root === 'yoya-component') continue; if (token.startsWith(`${root}-`) || token.startsWith(`${root}--`)) { if (!best || root.length > best.length) best = root; } }
  return best;
}

const css = readFileSync('src/yoya.ui.css', 'utf8');
const selectorRe = /([^{}@][^{}]*)\{/g;
const yoyaTokenRe = /\.yoya-v[a-z0-9-]+/g;

function splitCompounds(selector) {
  const out = []; let depth = 0; let current = '';
  for (const ch of selector) {
    if (ch === '[' || ch === '(') depth += 1;
    else if (ch === ']' || ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) { out.push(current); current = ''; }
    else current += ch;
  }
  out.push(current);
  return out;
}

const matches = [];
let m;
while ((m = selectorRe.exec(css)) !== null) {
  matches.push({ start: m.index, braceAt: m.index + m[0].length - 1, selector: m[1] });
}

let changed = 0;
let out = '';
let cursor = 0;
for (const match of matches) {
  out += css.slice(cursor, match.start);
  const parts = splitCompounds(match.selector);
  const next = parts.map((compound) => {
    const lead = compound.match(/^\s*/)[0];
    const body = compound.slice(lead.length);
    const tokens = [...body.matchAll(yoyaTokenRe)].map((x) => x[0].replace('.', ''));
    if (tokens.length === 0 || roots.has(tokens[0])) return compound;
    const root = owningRoot(tokens[0]);
    if (!root || root === 'yoya-component') return compound;
    changed += 1;
    return `${lead}.${root} ${body}`;
  }).join(',');
  out += next + '{';
  cursor = match.braceAt + 1;
}
out += css.slice(cursor);

writeFileSync('.scratch/yoya.ui.css.scoped', out);
console.log(`blocks: ${matches.length}, compounds changed: ${changed}`);