import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // listen on all addresses (127.0.0.1, localhost, 0.0.0.0)
    port: 3002,
    strictPort: true, // do not auto-pick another port if 3002 is busy
    open: true
  },
  preview: {
    host: true,
    port: 3002,
    strictPort: true
  },
  build: {
    outDir: 'docs',
    emptyOutDir: false // keep CNAME and .nojekyll in /docs
  }
})