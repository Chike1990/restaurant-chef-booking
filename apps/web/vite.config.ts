import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    /* The browser only ever talks to the Vite origin; this forwards /api to the
       Express app so there is no CORS dance in development and the production
       CloudFront behaviour (/api/* → ALB) is mirrored locally. */
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: true,
  },
})
