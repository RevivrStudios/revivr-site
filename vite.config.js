import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        webxr: resolve(__dirname, 'webxr.html'),
        neon_geometry: resolve(__dirname, 'neon-geometry.html'),
        neural_nexus: resolve(__dirname, 'neural-nexus.html'),
        synapse: resolve(__dirname, 'synapse.html'),
        mission: resolve(__dirname, 'mission.html'),
        founder: resolve(__dirname, 'founder.html'),
        support: resolve(__dirname, 'support.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
    },
  },
});
