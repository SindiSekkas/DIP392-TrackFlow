// vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { fileURLToPath } from 'url'

// Utility function to generate security headers
const generateSecurityHeaders = () => ({
  // Apply CSP in both dev and prod
  'Content-Security-Policy': 
	`default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.trackflow.pl https://kvienvajqivmgzizkbxb.supabase.co wss://*.supabase.co blob:; frame-src 'self' https://www.youtube.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'; object-src 'none'; worker-src 'self' blob:; upgrade-insecure-requests;`,
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
})

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '') // Load env files
  const isDev = mode === 'development'
  
  return {
    plugins: [react(), tailwind()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    server: {
      port: 3000,
      host: true, // Listen on all addresses, including network
      headers: generateSecurityHeaders()
    },
    preview: {
      port: 3000,
      host: true, // Listen on all addresses, including network
      headers: generateSecurityHeaders()
    },
    build: {
      sourcemap: isDev,
      minify: !isDev,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: [
              'react',
              'react-dom',
              'react-router-dom',
              '@supabase/supabase-js'
            ]
          }
        }
      }
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(mode)
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom']
    }
  }
})
