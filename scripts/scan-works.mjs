#!/usr/bin/env node
/**
 * scan-works.mjs
 *
 * 扫描 pixiv_downloads/焦茶_12845810/ 下的所有作品文件夹：
 *   1. 解析元数据
 *   2. 生成 webp 缩略图（thumb 480w / medium 2400w）到 public/thumbs/
 *   3. 探测原图宽高
 *   4. 写 src/data/works.json 与 src/content/works/*.md
 *
 * 文件夹命名规则：YYYY-MM-DD_PID_title/
 */

import { readdir, mkdir, writeFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import { join, resolve, dirname, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SRC_DIR = resolve(ROOT, 'pixiv_downloads/焦茶_12845810');
const OUT_JSON = resolve(ROOT, 'src/data/works.json');
const OUT_CONTENT_DIR = resolve(ROOT, 'src/content/works');
const OUT_THUMBS_DIR = resolve(ROOT, 'public/thumbs');

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif']);

// 缩略图尺寸
const THUMB_W = 480;   // 网格用
const MEDIUM_W = 2400; // viewer 用（1080p×2 DPR 显示器 100vw 全宽不糊）

function parseFolderName(name) {
  const m = name.match(/^(\d{4}-\d{2}-\d{2})_(\d+?)_(.+)$/);
  if (!m) return null;
  return { date: m[1], pixivId: m[2], title: m[3].trim() };
}

function listImages(files) {
  return files
    .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

/** 单张图处理：探测尺寸 + 生成 webp */
async function processImage(srcAbs, outDir, baseName) {
  // 探测原图尺寸
  const meta = await sharp(srcAbs).metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // thumb.webp (480w)
  const thumbPath = join(outDir, `${baseName}.webp`);
  await sharp(srcAbs)
    .rotate() // 尊重 EXIF 方向
    .resize({ width: THUMB_W, withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toFile(thumbPath);

  // medium.webp (2400w)，给 viewer 用
  const mediumPath = join(outDir, `${baseName}@2400.webp`);
  await sharp(srcAbs)
    .rotate()
    .resize({ width: MEDIUM_W, withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toFile(mediumPath);

  return {
    width,
    height,
    thumb: `/thumbs/${basename(outDir)}/${baseName}.webp`,
    medium: `/thumbs/${basename(outDir)}/${baseName}@2400.webp`,
  };
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    // 源目录缺失：在 CI / 拉取新 clone 的场景下 manifest 和 thumbs 已随仓库携带，
    // 这里优雅跳过而不是让 prebuild 失败。开发者本地想重建时可手动 `npm run scan`。
    if (process.env.SCAN_STRICT === '1') {
      console.error(`[scan] 找不到源目录: ${SRC_DIR}`);
      process.exit(1);
    }
    console.log(`[scan] 源目录不存在，跳过扫描: ${SRC_DIR}`);
    console.log(`[scan]   （使用仓库内已提交的 src/data/works.json + public/thumbs/）`);
    return;
  }

  await mkdir(OUT_THUMBS_DIR, { recursive: true });
  await mkdir(OUT_CONTENT_DIR, { recursive: true });
  await mkdir(dirname(OUT_JSON), { recursive: true });

  const entries = await readdir(SRC_DIR, { withFileTypes: true });
  const folders = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name);

  const works = [];
  let totalImgs = 0;
  let totalThumbBytes = 0;
  let totalMediumBytes = 0;

  for (const folder of folders) {
    const meta = parseFolderName(folder);
    if (!meta) {
      console.warn(`[scan] 跳过无法解析的目录: ${folder}`);
      continue;
    }

    const folderAbs = join(SRC_DIR, folder);
    const files = await readdir(folderAbs);
    const images = listImages(files);

    if (images.length === 0) {
      console.warn(`[scan] 空目录（无图片）: ${folder}`);
      continue;
    }

    // 缩略图输出目录
    const thumbDir = join(OUT_THUMBS_DIR, folder);
    await mkdir(thumbDir, { recursive: true });

    // 顺序处理图片
    const imageMeta = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const baseName = extname(img).slice(0, -1) ? basename(img, extname(img)) : basename(img);
      try {
        const m = await processImage(join(folderAbs, img), thumbDir, baseName);
        imageMeta.push({ src: img, ...m });
        totalThumbBytes += statSync(join(thumbDir, `${baseName}.webp`)).size;
        totalMediumBytes += statSync(join(thumbDir, `${baseName}@2400.webp`)).size;
        totalImgs++;
      } catch (err) {
        console.warn(`[scan] 处理失败: ${folder}/${img} — ${err.message}`);
        imageMeta.push({ src: img, width: 0, height: 0, thumb: '', medium: '' });
      }
    }

    const cover = imageMeta[0];

    works.push({
      id: meta.pixivId,
      folder,
      date: meta.date,
      year: Number(meta.date.slice(0, 4)),
      pixivId: meta.pixivId,
      title: meta.title,
      slug: meta.pixivId,
      imageCount: imageMeta.length,
      cover: cover.src,
      coverThumb: cover.thumb,
      coverMedium: cover.medium,
      coverWidth: cover.width,
      coverHeight: cover.height,
      images: imageMeta.map((m) => ({
        src: m.src,
        width: m.width,
        height: m.height,
        aspect: m.width && m.height ? m.width / m.height : 1.5,
        thumb: m.thumb,
        medium: m.medium,
      })),
      posthumous: meta.date > '2021-05-31',
    });
  }

  works.sort((a, b) =>
    b.date.localeCompare(a.date) || a.pixivId.localeCompare(b.pixivId)
  );

  await writeFile(OUT_JSON, JSON.stringify(works, null, 2) + '\n', 'utf8');

  for (const w of works) {
    const fm = `---
id: "${w.id}"
date: "${w.date}"
year: ${w.year}
pixivId: "${w.pixivId}"
title: "${w.title.replace(/"/g, '\\"')}"
slug: "${w.slug}"
imageCount: ${w.imageCount}
cover: "${w.cover}"
coverThumb: "${w.coverThumb}"
coverMedium: "${w.coverMedium}"
coverWidth: ${w.coverWidth}
coverHeight: ${w.coverHeight}
posthumous: ${w.posthumous}
---

`;
    await writeFile(join(OUT_CONTENT_DIR, `${w.id}.md`), fm, 'utf8');
  }

  const byYear = works.reduce((acc, w) => {
    acc[w.year] = (acc[w.year] ?? 0) + 1;
    return acc;
  }, {});

  const posthumous = works.filter((w) => w.posthumous).length;
  const totalKB = (totalThumbBytes + totalMediumBytes) / 1024;

  console.log(
    `[scan] 完成: ${works.length} 件作品 / ${totalImgs} 张图 / 缩略图总计 ${(totalKB).toFixed(0)} KB`
  );
  console.log(`[scan] 年份分布: ${JSON.stringify(byYear)}`);
  console.log(`[scan] 遗作: ${posthumous} 件`);
  console.log(`[scan] → ${OUT_JSON.replace(ROOT + '/', '')}`);
  console.log(`[scan] → public/thumbs/  (${works.length} 个子目录)`);
}

main().catch((err) => {
  console.error('[scan] 失败:', err);
  process.exit(1);
});
