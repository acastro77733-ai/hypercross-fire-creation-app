import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

function getVendorChunk(id: string) {
  if (!id.includes('node_modules')) {
    return undefined;
  }

  if (id.includes('/firebase/') || id.includes('/@firebase/')) {
    return 'firebase-vendor';
  }

  if (id.includes('/recharts/') || id.includes('/d3-')) {
    return 'charts-vendor';
  }

  if (
    id.includes('/react/') ||
    id.includes('/react-dom/') ||
    id.includes('/@base-ui/') ||
    id.includes('/@floating-ui/') ||
    id.includes('/lucide-react/') ||
    id.includes('/class-variance-authority/') ||
    id.includes('/clsx/') ||
    id.includes('/tailwind-merge/') ||
    id.includes('/use-sync-external-store/') ||
    id.includes('/tabbable/')
  ) {
    return 'app-vendor';
  }

  return undefined;
}

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'Axiom Trading Platform',
          short_name: 'Axiom',
          description: 'Institutional Trading Made Simple',
          theme_color: '#000000',
          icons: [
            {
              src: 'https://api.dicebear.com/7.x/shapes/svg?seed=Axiom',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'https://api.dicebear.com/7.x/shapes/svg?seed=Axiom',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            return getVendorChunk(id);
          },
        },
      },
    },
  };
});
