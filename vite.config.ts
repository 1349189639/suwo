import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // 相对路径：既能部署在域名根，也能部署在 GitHub Pages 的 /repo/ 子路径
  base: './',
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5178 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
