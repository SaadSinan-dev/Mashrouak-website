import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
optimizeDeps:{include:['three','three/addons/environments/RoomEnvironment.js','three/addons/geometries/RoundedBoxGeometry.js']},
  plugins: [react(), babel({ presets: [reactCompilerPreset()] }), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } } },
  preview: { port: 4173, strictPort: true, proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } } },
  test: {
    environment: 'node',
    css: true,
    restoreMocks: true,
  },
});
