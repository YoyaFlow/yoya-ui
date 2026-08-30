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
  'src/theme',
  'src/components',
  'src/effects'
];

const SHARED_CLASS = 'yoya-component';
const COMPONENT_CLASS = /^yoya-v[a-z0-9]+(-{1,2}[a-z0-9]+)*$/;
const UTILITY_CLASS = /^yoya-(?!v)[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const DYNAMIC_COMPONENT_CLASS = /^yoya-v\$\{[a-zA-Z][a-zA-Z0-9]*\}(-[a-z0-9]+)*$/;
const DYNAMIC_UTILITY_CLASS = /^yoya-\$\{[a-zA-Z][a-zA-Z0-9]*\}$/;
const DATA_ATTR = /^data-[a-z][a-z0-9-]*$/;

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

function quotedLiterals(text) {
  const out = [];
  const re = /(['"`])([\s\S]*?)(?<!\\)\1/g;
  let match;
  while ((match = re.exec(text)) !== null) {
    out.push(match[2]);
  }
  return out;
}

function classNameLiterals(source) {
  const literals = [];
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
          quotedLiterals(source.slice(open, i + 1)).forEach((value) => {
            value.split(/\s+/).forEach((part) => {
              if (part.startsWith('yoya-')) {
                literals.push(part);
              }
            });
          });
          break;
        }
      }
    }
  }
  return literals;
}

const classTokens = [];
const dynamicTokens = [];
for (const dir of libraryDirs) {
  for (const file of listJsFiles(resolve(dir))) {
    const source = readFileSync(file, 'utf8');
    classNameLiterals(source).forEach((token) => {
      if (token.includes('${')) {
        dynamicTokens.push(token);
      } else {
        classTokens.push(token);
      }
    });
  }
}

const dataTokens = [];
for (const dir of libraryDirs) {
  for (const file of listJsFiles(resolve(dir))) {
    const source = readFileSync(file, 'utf8');
    const re = /data-[a-z0-9-]+/g;
    let match;
    while ((match = re.exec(source)) !== null) {
      dataTokens.push(match[0]);
    }
  }
}

describe('className naming contract', () => {
  it('keeps every preset class literal on the yoya-component / yoya-v / yoya-<feature> families', () => {
    const violations = classTokens.filter(
      (token) =>
        token !== SHARED_CLASS && !COMPONENT_CLASS.test(token) && !UTILITY_CLASS.test(token)
    );
    expect(
      violations,
      `preset classes violating the naming contract: ${violations.join(', ')}`
    ).toEqual([]);
  });

  it('allows dynamic class templates only in the yoya-v<name>-<part> form', () => {
    const violations = dynamicTokens.filter(
      (token) => !DYNAMIC_COMPONENT_CLASS.test(token) && !DYNAMIC_UTILITY_CLASS.test(token)
    );
    expect(
      violations,
      `dynamic class templates violating the contract: ${violations.join(', ')}`
    ).toEqual([]);
  });

  it('keeps every state data hook kebab-case', () => {
    const violations = [...new Set(dataTokens)].filter((token) => !DATA_ATTR.test(token));
    expect(violations, `data hooks violating kebab-case: ${violations.join(', ')}`).toEqual([]);
  });
});
