import path from 'node:path'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: ['localhost', '*.trycloudflare.com'],
    },
    plugins: [
      TanStackRouterVite({
        routesDirectory: './pages',
        generatedRouteTree: './routeTree.gen.ts',
      }),
      react(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    envPrefix: 'VITE_',
  }
})
