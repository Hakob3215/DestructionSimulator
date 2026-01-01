import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // Ensures relative paths for assets so it works on GitHub Pages sub-directories
  build: {
    outDir: 'dist'
  }
});
