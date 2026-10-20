import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { defineConfig, loadEnv } from 'vite';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendTarget = env.VITE_BACKEND_TARGET || 'https://api.anythingssolution.com';
  return {
    root: path.resolve('live-queue-flow-2'),
    envDir: process.cwd(),
    base: './',
    publicDir: false,
    plugins: [react(), legacy({
      targets: ['Chrome >= 64', 'Firefox >= 68', 'Safari >= 12'],
      modernTargets: ['Chrome >= 64', 'Firefox >= 68', 'Safari >= 12'],
      modernPolyfills: true,
    })],
    build: {
      outDir: path.resolve('dist/live-queue-flow-2'),
      emptyOutDir: true,
      cssTarget: 'chrome64',
    },
    server: {
      port: 3001, host: '0.0.0.0',
      fs: { allow: [process.cwd()] },
      proxy: {
        '/api': { target: backendTarget, changeOrigin: true, secure: false },
        '/socket.io': { target: backendTarget, changeOrigin: true, ws: true },
      },
    },
  };
});
