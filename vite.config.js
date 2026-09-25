import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// 示例代码按使用者的写法 import '@yoyaflow/yoya-ui'；仓库内解析到源码入口，
// 这样文档里的代码可以原样复制，不必改成仓库相对路径。
const packageAlias = [
  {
    find: /^@yoyaflow\/yoya-ui$/,
    replacement: fileURLToPath(new URL('./src/index.js', import.meta.url))
  },
  {
    // 子入口（/core、/api、/router …）同样解析到源码，脚手架模板可直接被测试导入
    find: /^@yoyaflow\/yoya-ui\/(?!ui\.css$)([\w.-]+)$/,
    replacement: fileURLToPath(new URL('./src/yoya.$1.js', import.meta.url))
  }
];

export default defineConfig({
  resolve: {
    alias: packageAlias
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: 'src/index.js',
      name: 'YoyaUI',
      formats: ['es'],
      fileName: () => 'yoya.ui.js'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.js', 'examples/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      include: ['src/**/*.js'],
      exclude: ['examples/**', 'src/**/*.test.js', 'src/**/*.min.js', 'src/core/signals/vendor/**']
    }
  }
});
