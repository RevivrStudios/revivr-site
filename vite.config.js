import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        founder: resolve(__dirname, 'founder.html'),
        mission: resolve(__dirname, 'mission.html'),
        support: resolve(__dirname, 'support.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        webxr: resolve(__dirname, 'webxr.html'),
      },
    },
  },
});
