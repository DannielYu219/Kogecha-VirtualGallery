import { defineConfig } from 'astro/config';

// https://astro.build/config
//
// GitHub Pages 项目页路径：dannielyu219.github.io/Kogecha-VirtualGallery/
// site + base 让 Astro 在构建期把 base 注入所有内部链接与静态资源引用。
//
// 如果将来绑定自定义域名（CNAME），把 site 改成新域名，base 改回 '/' 即可。
const SITE = process.env.PUBLIC_SITE || 'https://dannielyu219.github.io';
const BASE = process.env.PUBLIC_BASE || '/Kogecha-VirtualGallery';

export default defineConfig({
  site: SITE,
  base: BASE,
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
