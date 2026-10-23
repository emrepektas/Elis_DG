import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/Elis_DG/',
  plugins: [react()],
  build: { sourcemap: false },
});
