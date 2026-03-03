import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import viteCompression from 'vite-plugin-compression';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const base = process.env.BASE_PATH || '/';
    return {
      base,
      server: {
        port: 8080,
        host: 'localhost',
        strictPort: true,
        // 代理配置，解决 CORS 跨域问题
        proxy: {
          '/api/webhook': {
            target: 'https://bytedance.larkoffice.com',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api\/webhook/, '/base/automation/webhook'),
            secure: true,
          },
        },
      },
      plugins: [
        react(),
        // 生产环境启用 gzip 压缩
        viteCompression({
          verbose: true,
          disable: false,
          threshold: 10240,
          algorithm: 'gzip',
          ext: '.gz',
        }),
        // 生产环境启用 brotli 压缩
        viteCompression({
          verbose: true,
          disable: false,
          threshold: 10240,
          algorithm: 'brotliCompress',
          ext: '.br',
        }),
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_BASE_URL': JSON.stringify(env.GEMINI_BASE_URL)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // 代码分割优化
        rollupOptions: {
          output: {
            manualChunks: {
              // 将 React 相关库打包到单独的 chunk
              'react-vendor': ['react', 'react-dom'],
              // 将第三方库打包到单独的 chunk
              'vendor': ['ogl'],
            },
          },
        },
        // 启用 CSS 代码分割
        cssCodeSplit: true,
        // 优化 chunk 大小警告阈值
        chunkSizeWarningLimit: 1000,
        // 启用源码映射（生产环境）
        sourcemap: mode === 'production' ? false : true,
        // 最小化配置
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production', // 生产环境移除 console
            drop_debugger: mode === 'production', // 生产环境移除 debugger
          },
        },
      },
    };
});
