import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://kogicha-memorial.example',
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    inlineStylesheets: 'auto',
    assets: '_assets',
  },
  image: {
    service: { entrypoint: 'astro/assets/services/sharp' },
  },
  server: {
    host: true,
    allowedHosts: true,
  },
  vite: {
    server: {
      host: true,
      allowedHosts: true,
      fs: {
        // 允许从 public/ 引用 pixiv_downloads/ 的内容
        allow: ['..'],
      },
    },
    preview: {
      host: true,
      allowedHosts: true,
    },
  },
});


