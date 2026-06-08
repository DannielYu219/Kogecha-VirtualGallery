/**
 * works.ts — 作品数据工具
 */

import worksData from '../data/works.json';

export interface WorkImage {
  src: string;          // 原图文件名
  width: number;
  height: number;
  aspect: number;       // w / h
  thumb: string;        // /thumbs/.../name.webp
  medium: string;       // /thumbs/.../name@1200.webp
}

export interface Work {
  id: string;
  folder: string;
  date: string;
  year: number;
  pixivId: string;
  title: string;
  slug: string;
  imageCount: number;
  cover: string;
  coverThumb: string;
  coverMedium: string;
  coverWidth: number;
  coverHeight: number;
  images: WorkImage[];
  posthumous: boolean;
}

/**
 * 排除列表：源素材缺失 / 文件损坏的 Pixiv 作品
 * （扫描脚本 sharp 解析失败的 4 件 2019 作品）
 */
const EXCLUDED_IDS: ReadonlySet<string> = new Set([
  '72949847',  // 2019-02-01  無題
  '73614375',  // 2019-03-10  TONE　BLOCK
  '75188095',  // 2019-06-12  HELLфHELLфHELLф
  '76077382',  // 2019-08-04  あどけない夏の怠惰に
]);

const rawWorks: Work[] = worksData as Work[];

export const works: Work[] = rawWorks.filter((w) => !EXCLUDED_IDS.has(w.id));

/** 按年份分组（年份降序） */
export function groupByYear(items: Work[] = works): Map<number, Work[]> {
  const map = new Map<number, Work[]>();
  for (const w of items) {
    if (!map.has(w.year)) map.set(w.year, []);
    map.get(w.year)!.push(w);
  }
  return new Map([...map.entries()].sort((a, b) => b[0] - a[0]));
}

export interface FlatItem {
  work: Work;
  imageIndex: number;
  globalIndex: number;
  thumb: string;
  medium: string;
  title: string;
  width: number;
  height: number;
  aspect: number;
}

/** 展平为单图列表（多图作品展开） */
export function flatten(items: Work[] = works): FlatItem[] {
  const out: FlatItem[] = [];
  let i = 0;
  for (const w of items) {
    w.images.forEach((img, idx) => {
      out.push({
        work: w,
        imageIndex: idx,
        globalIndex: i++,
        thumb: img.thumb,
        medium: img.medium,
        title:
          w.imageCount > 1
            ? `${w.title} (${idx + 1}/${w.imageCount})`
            : w.title,
        width: img.width,
        height: img.height,
        aspect: img.aspect,
      });
    });
  }
  return out;
}

export function findById(id: string): Work | undefined {
  return works.find((w) => w.id === id);
}

export function coverSrc(w: Work): string {
  return w.coverThumb || w.coverMedium;
}

export { works as all };
