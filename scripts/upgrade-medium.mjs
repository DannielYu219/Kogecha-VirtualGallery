#!/usr/bin/env node
/**
 * upgrade-medium.mjs — 一次性脚本
 * 把 public/thumbs/*@1200.webp 重新生成成 @2400.webp（用于 viewer），
 * 并把 src/data/works.json / src/content/works/*.md 里 medium 路径批量更新。
 *
 * 仅升级 viewer 用图；480w 网格缩略图保持不变。
 */
import { readdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SRC_DIR = resolve(ROOT, 'pixiv_downloads/焦茶_12845810');
const THUMBS_DIR = resolve(ROOT, 'public/thumbs');
const WORKS_JSON = resolve(ROOT, 'src/data/works.json');
const CONTENT_DIR = resolve(ROOT, 'src/content/works');

const NEW_MEDIUM_W = 2400;
const NEW_SUFFIX = '@2400';
const OLD_SUFFIX = '@1200';

if (!existsSync(SRC_DIR)) {
  console.error(`[upgrade] 找不到源目录: ${SRC_DIR}`);
  process.exit(1);
}

const works = JSON.parse(await readFile(WORKS_JSON, 'utf8'));
const newFiles = [];

for (const w of works) {
  // 1) 重新生成 viewer 用图
  for (const img of w.images) {
    if (!img.src) continue;
    const baseName = extname(img.src) ? basename(img.src, extname(img.src)) : img.src;
    const folder = w.folder;
    const srcAbs = join(SRC_DIR, folder, img.src);
    const oldOutAbs = join(THUMBS_DIR, folder, `${baseName}${OLD_SUFFIX}.webp`);
    const newOutAbs = join(THUMBS_DIR, folder, `${baseName}${NEW_SUFFIX}.webp`);
    const newRelPath = `/thumbs/${folder}/${baseName}${NEW_SUFFIX}.webp`;

    if (!existsSync(srcAbs)) {
      console.warn(`[upgrade] 源缺失: ${folder}/${img.src}`);
      continue;
    }

    try {
      await sharp(srcAbs)
        .rotate()
        .resize({ width: NEW_MEDIUM_W, withoutEnlargement: true })
        .webp({ quality: 84, effort: 4 })
        .toFile(newOutAbs);
    } catch (err) {
      console.warn(`[upgrade] 生成失败: ${folder}/${img.src} — ${err.message}`);
      continue;
    }

    // 删除旧 @1200.webp 节省空间
    try { await unlink(oldOutAbs); } catch {}

    img.medium = newRelPath;
    newFiles.push(newRelPath);
  }

  // 2) 同步 coverMedium
  if (w.coverMedium && w.coverMedium.includes(OLD_SUFFIX)) {
    w.coverMedium = w.coverMedium.replace(OLD_SUFFIX, NEW_SUFFIX);
  }
}

await writeFile(WORKS_JSON, JSON.stringify(works, null, 2) + '\n', 'utf8');

// 3) 同步 .md frontmatter
const mdFiles = (await readdir(CONTENT_DIR)).filter((f) => f.endsWith('.md'));
let mdUpdated = 0;
for (const f of mdFiles) {
  const p = join(CONTENT_DIR, f);
  let s = await readFile(p, 'utf8');
  const before = s;
  s = s.replace(new RegExp(OLD_SUFFIX, 'g'), NEW_SUFFIX);
  if (s !== before) {
    await writeFile(p, s, 'utf8');
    mdUpdated++;
  }
}

const totalBytes = newFiles.reduce((sum, rel) => {
  const abs = join(THUMBS_DIR, rel.replace('/thumbs/', ''));
  try { return sum + statSync(abs).size; } catch { return sum; }
}, 0);

console.log(`[upgrade] 重新生成 ${newFiles.length} 张 @${NEW_MEDIUM_W} webp`);
console.log(`[upgrade] 新增体积: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`[upgrade] 更新 works.json + ${mdUpdated} 个 .md`);
