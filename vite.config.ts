import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

/** Lists the built files in precache.json so the service worker can cache all of them on install. */
function precacheList(): Plugin {
  return {
    name: 'reunite-precache-list',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter(f => !f.endsWith('.map') && !f.endsWith('.woff') && f !== 'index.html') // .woff2 covers every browser with service workers
        .map(f => `/${f}`);
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) });
    }
  };
}

// `--mode http` (npm run dev:http): plain HTTP on port 3001. Chrome only runs service workers (offline,
// install) on a trusted origin, and the self-signed HTTPS certificate is not trusted; http://localhost is.
export default defineConfig(({ mode }) => {
  const http = mode === 'http';
  return {
    // HTTPS with a self-signed certificate: phones only allow the microphone on HTTPS (or localhost).
    plugins: [react(), ...(http ? [] : [basicSsl()]), precacheList()],
    server: {
      port: http ? 3001 : 3000,
      strictPort: true,
      host: true, // listen on the local network so phones on the same Wi-Fi can connect
      // Everything server-side goes through /api on this same origin: voice, sync, status, /api/sim.
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          rewrite: path => path.replace(/^\/api/, '')
        }
      }
    },
    preview: {
      port: http ? 4174 : 4173,
      strictPort: true,
      host: true,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          rewrite: path => path.replace(/^\/api/, '')
        }
      }
    }
  };
});
