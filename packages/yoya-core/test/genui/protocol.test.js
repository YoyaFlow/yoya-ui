import { describe, expect, it } from 'vitest';
import {
  assertSchema,
  formatTemplate,
  GenUIError,
  isYoyaGenUISchema,
  joinPath,
  normalizePath,
  PROTOCOL_VERSION,
  readPath,
  splitPath,
  validateSchema,
  writePath
} from '../../src/genui/protocol/index.js';

describe('路径工具', () => {
  it('归一化路径并拆分', () => {
    expect(normalizePath('user//name/')).toBe('/user/name');
    expect(normalizePath('')).toBe('/');
    expect(splitPath('/user/name')).toEqual(['user', 'name']);
    expect(splitPath('/')).toEqual([]);
  });

  it('拼相对与绝对路径', () => {
    expect(joinPath('/items/0', 'title')).toBe('/items/0/title');
    expect(joinPath('/items/0', '/user/name')).toBe('/user/name');
    expect(joinPath('/items/0', '..')).toBe('/items');
    expect(joinPath('/', 'user')).toBe('/user');
  });

  it('写入不可变：父容器换引用，原对象不动', () => {
    const source = { items: [{ title: 'a' }], user: { name: 'x' } };
    const next = writePath(source, '/items/0/title', 'b');

    expect(readPath(next, '/items/0/title')).toBe('b');
    expect(source.items[0].title).toBe('a');
    expect(next.items).not.toBe(source.items);
  });

  it('模板串插值遇缺字段留空', () => {
    const line = formatTemplate('共 {count} 条 / {user.name}', (path) =>
      readPath({ count: 3, user: {} }, path)
    );

    expect(line).toBe('共 3 条 / ');
  });
});

describe('schema 校验', () => {
  it('数据语言落地后协议版本进入 0.2', () => {
    expect(PROTOCOL_VERSION).toBe('0.2');
  });

  const valid = {
    data: { title: 'hi' },
    protocol: 'yoya-genui',
    root: { children: [{ text: { $bind: '/title' }, type: 'p' }], type: 'vstack' },
    version: '0.1'
  };

  it('合法 schema 通过', () => {
    expect(validateSchema(valid).ok).toBe(true);
    expect(isYoyaGenUISchema(valid)).toBe(true);
  });

  it('缺少 type 报错并带路径', () => {
    const report = validateSchema({ ...valid, root: { children: [] } });

    expect(report.ok).toBe(false);
    expect(report.errors[0].path).toBe('root');
  });

  it('主版本不匹配直接失败', () => {
    const report = validateSchema({ ...valid, version: '9.0' });

    expect(report.ok).toBe(false);
    expect(report.errors.some((error) => error.path === 'version')).toBe(true);
  });

  it('repeat 缺 template 报错', () => {
    const report = validateSchema({
      ...valid,
      root: { repeat: { $each: '/items' }, type: 'vstack' }
    });

    expect(report.ok).toBe(false);
    expect(report.errors.some((error) => error.path === 'root.template')).toBe(true);
  });

  it('未知键只记警告，strict 下才算失败', () => {
    const schema = { ...valid, futureKey: 1 };

    expect(validateSchema(schema).ok).toBe(true);
    expect(validateSchema(schema, { strict: true }).ok).toBe(false);
  });

  it('assertSchema 抛 GenUIError 并带错误码与路径', () => {
    expect(() => assertSchema({ root: { type: '' } })).toThrowError(GenUIError);

    try {
      assertSchema({ root: { type: '' } });
    } catch (error) {
      expect(error.code).toBe('GENUI_SCHEMA');
      expect(error.path).toBe('root');
    }
  });
});
