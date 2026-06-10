# あの夏ぼくは天使を見た — 焦茶 作品集

> **あの夏ぼくは天使を見た**
> 焦茶 (Kogacha, Pixiv 12845810) 作品集 / Memorial Gallery

A non-commercial memorial gallery for **Kogacha** (焦茶), a Japanese illustrator who passed away in May 2021. The site presents 148 of their works in a quiet, flat, low-noise layout — designed to be browsed slowly.

> [!NOTE]
> **Code framework: GPL-3.0. Artworks: license pending — contact in progress with the rights holder.**
> コードフレームワークは GPL-3.0。作品については現在ライセンス未定で、権利者と連絡中です。
> See [`LICENSE`](./LICENSE) and [`CONTENT.md`](./CONTENT.md) for the full trilingual statement.

---

## About this project

This project is a personal tribute. It is **not** affiliated with Pixiv, the original uploader, or any estate. The site is built and maintained by a fan of the artist, and exists to:

- preserve the visible record of 焦茶's Pixiv output
- present the works in a calm, archive-grade interface
- keep the source open so that **other fans can fork the framework to memorialize other artists** they have lost

The framework itself (Astro + view transitions + webp pipeline) is deliberately generic. To reuse it for a different artist, you only need to drop a different set of source images and re-run the scan script.

---

## Architecture

| Layer        | Tech                              | Why                                                              |
| ------------ | --------------------------------- | ---------------------------------------------------------------- |
| Framework    | [Astro 5](https://astro.build)    | Static, ships near-zero JS by default, easy to deploy anywhere   |
| Transitions  | Web View Transitions API          | Native shared-element morph between thumbnail and viewer         |
| Images       | `sharp` → WebP (480w + 2400w)     | ~30KB thumbs, ~250KB previews, originals never shipped |
| Deploy       | Any static host                   | GitHub Pages / Netlify / Cloudflare Pages all work               |

### Build pipeline

```
pixiv_downloads/                  ← source (NOT in git, ~GB of originals)
   ↓  scripts/scan-works.mjs
public/thumbs/{id}/*.webp         ← 480w + 2400w derivatives
src/data/works.json               ← manifest
   ↓  astro build
dist/                             ← static site
```

`scan-works.mjs` reads `pixiv_downloads/`, generates the two webp sizes with `sharp`, and emits the `works.json` manifest. Re-run it after adding new source files; idempotent.

---

## Local development

```bash
npm install
node scripts/scan-works.mjs     # one-time: build thumbs + manifest
npm run dev                     # http://localhost:4321
npm run build                   # static output to dist/
npm run preview                 # custom server (frp/tunnel friendly, no host check)
```

Node 20+ required. The custom preview server in `scripts/serve.mjs` is needed because Astro's built-in `astro preview` hardcodes `configFile: false` and rejects arbitrary `Host` headers — which breaks tunneling (frp, ngrok, Cloudflare Tunnel, etc.). The custom server has zero deps and is safe to use in production behind a reverse proxy.

---

## License

This repository is **dual-scoped**: the code and the artworks are governed by different terms.

| What                | License                              | See                            |
| ------------------- | ------------------------------------ | ------------------------------ |
| Source code         | **GPL-3.0** (or any later version)   | [`LICENSE`](./LICENSE)         |
| Artwork (under `public/thumbs/`, `pixiv_downloads/`) | **Currently undetermined** — contact in progress with the rights holder. | [`CONTENT.md`](./CONTENT.md)   |

🇨🇳  目前许可未定，正在联系中。
🇯🇵  現在ライセンス未定、連絡中です。
🇬🇧  License currently undetermined; contact in progress.

Until a formal license is established, any use of the artworks beyond viewing on this site requires the rights holder's explicit permission. See [`CONTENT.md`](./CONTENT.md) for the full trilingual statement (中 / 日 / 英).

---

## Credits

- **焦茶** (Kogacha, Pixiv 12845810) — for the work
- Pixiv — original publication platform
- Astro, sharp, Node.js — the boring reliable stack
- The fan who built and maintains this site

—— _「でもそういう日々と呼ばれるものの中で、君の笑顔はいつも僕の側にあった」_
