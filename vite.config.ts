import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron/simple';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        entry: 'src/main/main.ts',
        vite: {
          build: {
            rollupOptions: {
              external: ['keytar'],
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
      },
      renderer: {},
    }),
  ],
  build: {
    outDir: 'dist',
  },
});
