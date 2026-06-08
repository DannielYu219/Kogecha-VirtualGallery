/**
 * viewer.ts — 全屏查看器状态机
 *
 * 数据：来自 window.__GALLERY__（在 index.astro / works/[id].astro 注入）
 * 行为：
 *   - prev / next：在「展平后的图列表」中前后移动
 *   - 同一作品内多图：连续按 next 依次翻完后跳到下一件第一张
 *   - 键盘：← / → / Esc
 *   - URL：当前 ID 同步到 ?v=xxx，浏览器前进后退可用
 *   - 共享元素形变：缩略图与 viewer img 共用 transition:name="work-{id}"，
 *     由 Astro View Transitions 在页面级形变；这里用 navigate('/') 触发
 *
 * 首屏 BUG 防护：pointermove 之前不触发 morph（缩略图 bounding rect
 *   可能在图片未完成解码时不稳定）。这时改走 location.assign 硬导航。
 */

import { navigate } from 'astro:transitions/client';

interface GalleryItem {
  id: string;
  folder: string;
  title: string;
  date: string;
  imageCount: number;
  images: { thumb: string; medium: string; width: number; height: number; aspect: number }[];
  globalStartIndex: number;
}

interface GalleryData {
  works: GalleryItem[];
  flatSrc: string[];
  flatThumb: string[];
  flatTitle: string[];
  flatWorkId: string[];
  flatWidth: number[];
  flatHeight: number[];
}

declare global {
  interface Window {
    __GALLERY__?: GalleryData;
  }
}

const STATE = {
  data: null as GalleryData | null,
  open: false,
  idx: 0,
  busy: false,
  pushed: false,
  /** 当前 viewer 里展示的 workId（用于 transition:name 同步） */
  currentWorkId: '',
};

let mouseHasMoved = false;
const trackMouse = () => {
  if (mouseHasMoved) return;
  mouseHasMoved = true;
  document.removeEventListener('pointermove', trackMouse);
};
document.addEventListener('pointermove', trackMouse, { passive: true });
document.addEventListener('keydown', () => { mouseHasMoved = true; }, { once: true });

function $(s: string, root: ParentNode = document) {
  return root.querySelector(s) as HTMLElement | null;
}

function getData(): GalleryData | null {
  if (STATE.data) return STATE.data;
  if (typeof window === 'undefined') return null;
  STATE.data = window.__GALLERY__ ?? null;
  return STATE.data;
}

function setTransitionName(workId: string) {
  const img = $('[data-viewer-img]') as HTMLImageElement | null;
  if (!img) return;
  img.setAttribute('transition:name', `work-${workId}`);
  img.style.viewTransitionName = `work-${workId}`;
}

function openAt(idx: number) {
  const data = getData();
  const viewer = $('[data-viewer]');
  const img = $('[data-viewer-img]') as HTMLImageElement | null;
  const title = $('[data-viewer-title]');
  const counter = $('[data-viewer-counter]');
  const loading = $('[data-viewer-loading]');
  if (!data || !viewer || !img || !title || !counter || !loading) return;

  STATE.idx = ((idx % data.flatSrc.length) + data.flatSrc.length) % data.flatSrc.length;
  const src = data.flatSrc[STATE.idx];
  const t = data.flatTitle[STATE.idx];
  const workId = data.flatWorkId[STATE.idx];
  const w = data.flatWidth[STATE.idx];
  const h = data.flatHeight[STATE.idx];
  STATE.currentWorkId = workId;

  // 同步 transition:name 让缩略图能形变过来
  setTransitionName(workId);

  // 触发淡出再切图
  img.classList.add('is-fading');
  loading.classList.add('is-show');

  const apply = () => {
    img!.classList.remove('is-fading');
    loading.classList.remove('is-show');
  };

  // 已知宽高：直接按比例设 class
  img.classList.remove('landscape', 'portrait', 'square');
  if (w && h) {
    if (w > h * 1.05) img.classList.add('landscape');
    else if (h > w * 1.05) img.classList.add('portrait');
    else img.classList.add('square');
    img.style.aspectRatio = `${w} / ${h}`;
  }

  // 用 Image 预加载，load 后移除淡出
  const probe = new Image();
  probe.onload = () => apply();
  probe.onerror = () => apply();
  probe.src = src;

  img.src = src;
  img.alt = t;
  if (w) img.width = w;
  if (h) img.height = h;
  title.textContent = t;
  counter.textContent = `${STATE.idx + 1} / ${data.flatSrc.length}`;

  if (!STATE.open) {
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    STATE.open = true;
  }

  syncUrl(workId, !STATE.pushed);
  STATE.pushed = true;

  markActive(workId);
}

function close() {
  const viewer = $('[data-viewer]');
  if (!viewer || !STATE.open) return;

  // 画作页：软导航回 / 并带 #work-{id} 锚点，浏览器自动滚到该网格项
  if (location.pathname.startsWith('/works/')) {
    const target = STATE.currentWorkId
      ? `/#work-${STATE.currentWorkId}`
      : '/';
    navigate(target);
    return;
  }

  // 主页：仅关闭浮层
  viewer.classList.remove('is-open');
  viewer.setAttribute('aria-hidden', 'true');
  document.documentElement.style.overflow = '';
  STATE.open = false;
  STATE.pushed = false;
  document
    .querySelectorAll('.gallery__item.is-active')
    .forEach((el) => el.classList.remove('is-active'));
  if (location.search.includes('v=')) {
    const url = new URL(location.href);
    url.searchParams.delete('v');
    history.replaceState({}, '', url.pathname + url.search + url.hash);
  }
}

function step(delta: number) {
  if (STATE.busy || !STATE.open) return;
  STATE.busy = true;
  openAt(STATE.idx + delta);
  setTimeout(() => (STATE.busy = false), 220);
}

function markActive(workId: string) {
  document.querySelectorAll('.gallery__item.is-active').forEach((el) => {
    el.classList.remove('is-active');
  });
  const target = document.querySelector(`.gallery__item[data-id="${workId}"]`);
  if (target) {
    target.classList.add('is-active');
    target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function syncUrl(workId: string, push: boolean) {
  if (location.pathname.startsWith('/works/')) return;
  const url = new URL(location.href);
  if (url.searchParams.get('v') === workId) return;
  url.searchParams.set('v', workId);
  if (push) history.pushState({ v: workId }, '', url.pathname + url.search);
  else history.replaceState({ v: workId }, '', url.pathname + url.search);
}

function indexOfId(workId: string): number {
  const data = getData();
  if (!data) return 0;
  const idx = data.flatWorkId.indexOf(workId);
  return idx < 0 ? 0 : idx;
}

function handleThumbClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const anchor = target.closest<HTMLAnchorElement>('.gallery__item');
  if (!anchor) return;

  // BUG 防护：首屏 pointermove 之前缩略图 bounding rect 可能不稳定，
  // 形变基线错位。改走硬导航跳过 morph。
  if (!mouseHasMoved) {
    e.preventDefault();
    location.assign(anchor.href);
    return;
  }

  // 画作页中没画廊，此分支已不进入
  if (location.pathname.startsWith('/works/')) {
    e.preventDefault();
    openAt(indexOfId(anchor.dataset.id ?? ''));
  }
}

function handleKey(e: KeyboardEvent) {
  if (!STATE.open) return;
  if (e.key === 'Escape') {
    e.preventDefault();
    close();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    step(-1);
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    step(1);
  }
}

function handlePopState() {
  if (!STATE.open) return;
  const url = new URL(location.href);
  const v = url.searchParams.get('v');
  if (v) openAt(indexOfId(v));
  else close();
}

function bindUI() {
  const prev = $('[data-viewer-prev]');
  const next = $('[data-viewer-next]');
  const back = $('[data-viewer-back]');
  prev?.addEventListener('click', () => step(-1));
  next?.addEventListener('click', () => step(1));
  back?.addEventListener('click', (e) => {
    e.preventDefault();
    close();
  });

  // 缩略图点击
  document
    .querySelectorAll<HTMLAnchorElement>('.gallery__item')
    .forEach((el) => el.addEventListener('click', handleThumbClick));

  // 键盘
  document.removeEventListener('keydown', handleKey);
  document.addEventListener('keydown', handleKey);

  // 浏览器前进后退
  window.removeEventListener('popstate', handlePopState);
  window.addEventListener('popstate', handlePopState);
}

function autoOpenFromUrl() {
  const url = new URL(location.href);
  const pathId = location.pathname.startsWith('/works/')
    ? location.pathname.split('/').filter(Boolean).pop() ?? ''
    : '';
  const v = url.searchParams.get('v') || pathId;
  if (!v) return;
  if (location.pathname.startsWith('/works/') || url.searchParams.get('v')) {
    openAt(indexOfId(v));
  }
}

export function initViewer() {
  mouseHasMoved = false;
  document.addEventListener('pointermove', trackMouse, { passive: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bindUI();
      autoOpenFromUrl();
    });
  } else {
    bindUI();
    autoOpenFromUrl();
  }
}
