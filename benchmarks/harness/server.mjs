// 基准页的静态服务：以仓库根为文档根，方便直接引用 dist/ 产物入口。
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml'
};

export async function startStaticServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const filePath = normalize(join(root, pathname));

      if (!filePath.startsWith(root)) {
        throw new Error('forbidden');
      }

      const info = await stat(filePath);
      const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
      const body = await readFile(target);

      response.writeHead(200, {
        'cache-control': 'no-store',
        'content-type': contentTypes[extname(target)] ?? 'application/octet-stream'
      });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
    }
  });

  await new Promise((done) => server.listen(0, '127.0.0.1', done));

  return {
    close: () => new Promise((done) => server.close(done)),
    origin: `http://127.0.0.1:${server.address().port}`
  };
}
