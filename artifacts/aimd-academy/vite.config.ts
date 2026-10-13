import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

// The dev/preview workflow supplies PORT. Production builds do not need a
// listening port, so keep a safe default for standalone `vite build` runs.
const rawPort = process.env.PORT || '5173';

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || '/';

export default defineConfig({
  base: basePath,
  // This capture-only public token is also used by the Expo native bundle.
  // Never expose the PostHog personal/private API key here.
  define: {
    'import.meta.env.VITE_POSTHOG_PROJECT_TOKEN': JSON.stringify(process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN || ''),
    'import.meta.env.VITE_POSTHOG_HOST': JSON.stringify(process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'),
  },
  plugins: [
    react(),
    tailwindcss({ optimize: false }),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return;
          if (/\/node_modules\/(?:react|react-dom|scheduler)\//.test(id)) return 'react';
          if (/\/node_modules\/(?:recharts|recharts-scale|d3-[^/]+|victory-vendor|internmap)\//.test(id)) return 'charts';
          if (/\/node_modules\/prosemirror-[^/]+\//.test(id)) return 'editor';
          if (id.includes('/node_modules/@clerk/')) return 'auth';
          if (/\/node_modules\/(?:posthog-js|@posthog)\//.test(id)) return 'analytics';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
