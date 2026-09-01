import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    emptyOutDir: true,
    outDir: 'dist',
    rollupOptions: {
      input: 'src/client.js',
      output: {
        assetFileNames: (assetInfo) =>
          assetInfo.name?.endsWith('.css') ? 'assets/yoya.ui.css' : 'assets/[name][extname]',
        entryFileNames: 'client.js'
      }
    }
  }
});
