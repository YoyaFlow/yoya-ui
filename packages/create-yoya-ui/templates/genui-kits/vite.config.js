import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// 制品边界（与 yoya-kit 同款）：
// - `@yoyaflow/*` 由 GenUI 宿主提供，保持 external（装进产物就会出现两份 core / ui）；
// - 本 kit 自己的依赖（如 echarts / dayjs）会被打进 `dist/yoya.kit.js`；
// - 产物**不**往 yoya-ui 的默认注册表里塞组件：宿主必须显式 `GenUI.use(kitPlugin)`。
export default defineConfig({
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  },
  build: {
    copyPublicDir: false,
    lib: {
      entry: fileURLToPath(new URL('./src/index.js', import.meta.url)),
      formats: ['es'],
      fileName: () => 'yoya.kit.js'
    },
    rollupOptions: {
      external: (id) => id.startsWith('@yoyaflow/'),
      output: {
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
