import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

export default defineConfig({
  // HTTPS with a self-signed certificate: phones only allow the microphone on HTTPS (or localhost).
  plugins: [react(), basicSsl()],
  server: {
    port: 3000,
    strictPort: true,
    host: true, // listen on the local network so phones on the same Wi-Fi can connect
    // Everything server-side goes through /api on this same HTTPS origin: voice, sync, status, /api/sim.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        rewrite: path => path.replace(/^\/api/, '')
      }
    }
  }
});
