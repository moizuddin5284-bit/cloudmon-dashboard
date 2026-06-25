import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/static/react-dist/',
  build: {
    outDir: '../static/react-dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/login': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/logout': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/alerts': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/report': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
