// このフォルダのHTMLから画像を作り直す
// 使い方（リポジトリのルートで実行）:
//   node marketing/ppwr-declaration-of-conformity/render.mjs eyecatch   … コラムのアイキャッチ（1280×720 JPEG）
//   node marketing/ppwr-declaration-of-conformity/render.mjs banner     … 記事内の資料DLバナー（1080×300 JPEG）
//   node marketing/ppwr-declaration-of-conformity/render.mjs figures    … 解説書の表紙と図1〜5（PNG、2倍の解像度）
// 出力先は out/（このフォルダ内。gitには入れない）
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out');
mkdirSync(OUT, { recursive: true });

const jobs = {
  eyecatch: [{ html: 'eyecatch/eyecatch.html', out: 'eyecatch.jpg', w: 1280, h: 720, type: 'jpeg' }],
  banner: [{ html: 'figures/banner.html', out: 'banner.jpg', w: 1080, h: 300, type: 'jpeg' }],
  figures: [
    { html: 'figures/cover.html', out: 'cover.png', w: 1240, h: 1754, scale: 2 },
    ...[1, 2, 3, 4, 5].map(n => ({ html: `figures/f${n}.html`, out: `f${n}.png`, w: 1250, h: 50, scale: 2, full: true })),
  ],
};
const target = process.argv[2];
if (!jobs[target]) {
  console.error('使い方: node render.mjs eyecatch | banner | figures');
  process.exit(1);
}
// Google Fontsを読み込むため、環境にプロキシがあれば使う
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '<-loopback>' } : undefined;
const browser = await chromium.launch(proxy ? { proxy } : {});
for (const j of jobs[target]) {
  const ctx = await browser.newContext({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: j.scale || 1, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(DIR, j.html));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const file = path.join(OUT, j.out);
  await p.screenshot({ path: file, fullPage: !!j.full, ...(j.type === 'jpeg' ? { type: 'jpeg', quality: 90 } : {}) });
  console.log('作成:', path.relative(process.cwd(), file));
  await ctx.close();
}
await browser.close();
