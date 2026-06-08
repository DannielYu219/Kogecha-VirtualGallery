#!/usr/bin/env node
/**
 * scripts/serve.mjs
 * 静态文件服务器（用于隧道 / frp 公开预览）
 *
 * 与 astro preview 不同：本服务不校验 Host header，可通过任意域名/frp 访问
 * 适合：本地开发后用 frp/Cloudflare Tunnel 等工具做公网临时预览
 */

import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync } from 'node:fs';
import { join, resolve, extname, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = resolve(fileURLToPath(import.meta.url), '..');
const DIST = resolve(__dirname, '../dist');
const PORT = Number(process.env.PORT || 4321);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

const server = createServer((req, res) => {
  // 任何 host 都放行
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath.includes('..')) {
    res.statusCode = 400;
    res.end('Bad request');
    return;
  }

  // 解析：去掉尾部斜杠（除非是 /）
  let filePath = join(DIST, urlPath === '/' ? '/index.html' : urlPath);

  // 如果是目录，找 index.html
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  // 不存在：尝试加 .html（Astro 静态生成可能没写扩展）
  if (!existsSync(filePath)) {
    if (existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (existsSync(filePath + '/index.html')) {
      filePath = filePath + '/index.html';
    } else {
      // 404：尝试返回 /404.html
      const fallback = join(DIST, '404.html');
      if (existsSync(fallback)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        createReadStream(fallback).pipe(res);
        return;
      }
      res.statusCode = 404;
      res.end('Not Found');
      return;
    }
  }

  const ext = extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', type);

  // 简单缓存策略
  if (ext === '.html' || ext === '.json') {
    res.setHeader('Cache-Control', 'no-cache');
  } else if (filePath.includes(`${sep}_assets${sep}`) || filePath.includes(`${sep}thumbs${sep}`)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }

  // Content-Length
  const stat = statSync(filePath);
  res.setHeader('Content-Length', stat.size);

  createReadStream(filePath).pipe(res);
});

server.listen(PORT, HOST, () => {
  const { port } = server.address();
  console.log(`[serve] ${DIST}`);
  console.log(`[serve] listening on http://${HOST}:${port}/`);
  console.log(`[serve] host check: DISABLED (allow any Host header)`);
});
