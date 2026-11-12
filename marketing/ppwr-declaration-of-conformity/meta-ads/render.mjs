// Meta広告のクリエイティブ（1080×1080）を作り直す
// 使い方（リポジトリのルートで実行）: node marketing/ppwr-declaration-of-conformity/meta-ads/render.mjs
// 出力先は ../out/meta-ads/（gitには入れない）
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, '..', 'out', 'meta-ads');
mkdirSync(OUT, { recursive: true });
const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '<-loopback>' } : undefined;
const browser = await chromium.launch(proxy ? { proxy } : {});
for (const n of ['1', '2', '3', '4', '1p', '2p', '3p', '4p']) {
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1080 }, ignoreHTTPSErrors: true });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(DIR, `cr${n}.html`));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const file = path.join(OUT, `Meta_PPWR_DoC_1_Eitoss_${n}.jpg`);
  await p.screenshot({ path: file, type: 'jpeg', quality: 92 });
  console.log('作成:', file);
  await ctx.close();
}
await browser.close();
