// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { securityHeaders } from './src/utils/securityHeaders'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: securityHeaders
  },
  preview: {
    headers: securityHeaders
  }
})