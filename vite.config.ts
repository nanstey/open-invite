import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

export default defineConfig(({ mode: _mode }) => {
    // const env = loadEnv(mode, '.', '');  // env unused
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
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
        }
      },
      // Expose Supabase env vars to client
      envPrefix: 'VITE_',
    };
});
