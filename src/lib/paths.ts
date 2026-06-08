/**
 * paths.ts — base 路径工具
 *
 * 在构建期 import.meta.env.BASE_URL 会被 Vite 替换为字面量字符串。
 * 例如 base='/Kogacha-VirtualGallery' 时 withBase('/thumbs/foo.webp')
 * 会得到 '/Kogacha-VirtualGallery/thumbs/foo.webp'。
 *
 * 用于让 works.json / .md 里的绝对路径（'/thumbs/...'）在 GitHub Pages
 * 项目页（/Kogacha-VirtualGallery/）下也能正常解析。
 */

const RAW_BASE = import.meta.env.BASE_URL || '/';
/** 规范化：保证结尾有 /，便于直接拼路径 */
export const BASE: string = RAW_BASE.endsWith('/') ? RAW_BASE : RAW_BASE + '/';

export function withBase(p: string): string {
  if (!p) return p;
  if (p.startsWith('http://') || p.startsWith('https://') || p.startsWith('//')) return p;
  if (p.startsWith('data:') || p.startsWith('blob:')) return p;
  // 已经是带 base 的绝对路径
  if (p.startsWith(BASE)) return p;
  // 以 / 开头的绝对路径 → 拼到 base
  if (p.startsWith('/')) return BASE + p.slice(1);
  // 相对路径 → 拼到 base
  return BASE + p;
}
