import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        // no rewrite so the path stays /api/messages/:id
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          pdf: ['pdfjs-dist', 'react-pdf'],
          vendor: ['zustand', 'axios', 'socket.io-client', 'lucide-react', 'react-hot-toast']
        }
      }
    }
  }
})
