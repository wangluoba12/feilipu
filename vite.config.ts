import { defineConfig } from 'vite';
import { builtinModules } from 'node:module';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)];

export default defineConfig({
  build: {
    target: 'node18',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: () => 'index.mjs',
    },
    rollupOptions: {
      external: [...nodeBuiltins],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  plugins: [dts({ rollupTypes: true })],
  ssr: {
    noExternal: ['node-cron', 'pino', 'pino-pretty'],
  },
  server: {
    allowedHosts: ['.monkeycode-ai.online'],
  },
});
