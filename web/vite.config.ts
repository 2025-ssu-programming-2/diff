import path from 'path';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Static site로 배포 가능하도록 설정
    emptyOutDir: true,
    // public 디렉토리의 파일들이 빌드에 포함되도록 보장
    copyPublicDir: true,
  },
  // public 디렉토리 설정 (기본값이지만 명시적으로 설정)
  publicDir: 'public',
});
