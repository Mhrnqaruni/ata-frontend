import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '');
  const rawBasePath = (env.VITE_PARENT_APP_BASE_PATH || '/').trim();
  const normalizedBasePath =
    !rawBasePath || rawBasePath === '/'
      ? '/'
      : `/${rawBasePath.replace(/^\/+|\/+$/g, '')}/`;

  return {
    base: normalizedBasePath,
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        src: path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['mermaid'],
    },
    ssr: {
      noExternal: ['mermaid'],
    },
  }
})
