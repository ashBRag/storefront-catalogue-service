/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const DEFAULT_API_PROXY_TARGET = 'http://localhost:3000';

export default defineConfig(({ mode }) => {
  // Read the repo-root .env (shared config, see .env.example) plus process.env.
  // No VITE_ prefix: this value is used by the dev server only and never reaches the browser bundle.
  const env = loadEnv(mode, fileURLToPath(new URL('..', import.meta.url)), '');
  const apiTarget = env.API_PROXY_TARGET || DEFAULT_API_PROXY_TARGET;

  return {
    plugins: [react()],
    server: {
      // Dev only: the browser calls /api on the Vite origin, so no CORS is needed.
      // In Docker, nginx does the same job.
      proxy: { '/api': { target: apiTarget, changeOrigin: true } },
    },
    test: {
      environment: 'jsdom',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
