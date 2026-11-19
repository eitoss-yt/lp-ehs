// 資料PDFから、資料一覧・資料DLページ用のサムネイル（1280×720 JPEG）を作る
// 使い方:
//   node .claude/skills/add-document/make-thumbnail.mjs <PDFのパス> <出力先.jpg> [中のページ番号] [バッジの文言]
// 横長（スライド）のPDF … 青緑のグラデーション枠の中に表紙を置く（サービス資料と同じ見た目）
// 縦長（A4など）のPDF … 方眼の背景に、表紙と中のページを重ねる（お役立ち資料と同じ見た目）
// バッジの文言（例:「Wordテンプレート付き」）は縦長のときだけ表示する。省略可
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const [pdf, out, innerArg, badge] = process.argv.slice(2);
if (!pdf || !out) {
  console.error('使い方: node make-thumbnail.mjs <PDF> <出力.jpg> [中のページ番号] [バッジの文言]');
  process.exit(1);
}
const work = mkdtempSync(path.join(tmpdir(), 'thumb-'));
const info = execFileSync('pdfinfo', [pdf]).toString();
const pages = Number((info.match(/Pages:\s+(\d+)/) || [])[1] || 1);
const [w, h] = ((info.match(/Page size:\s+([\d.]+) x ([\d.]+)/) || []).slice(1)).map(Number);
const landscape = w > h;
const inner = Math.min(Number(innerArg) || (pages >= 3 ? 3 : pages), pages);

const render = (page, name, res) => {
  execFileSync('pdftoppm', ['-r', String(res), '-png', '-singlefile', '-f', String(page), '-l', String(page), pdf, path.join(work, name)]);
  return 'data:image/png;base64,' + readFileSync(path.join(work, name + '.png')).toString('base64');
};
const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let html;
if (landscape) {
  const cover = render(1, 'cover', 110);
  html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;width:1280px;height:720px;overflow:hidden}
body{background:linear-gradient(110deg,#0b4e5b 0%,#106878 35%,#2f97ad 70%,#58b6c6 100%);display:flex;align-items:center;justify-content:center}
img{width:1242px;height:682px;object-fit:cover;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.18)}
</style></head><body><img src="${cover}"></body></html>`;
} else {
  const cover = render(1, 'cover', 120);
  const page = render(inner, 'inner', 120);
  html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@700&display=block" rel="stylesheet"><style>
html,body{margin:0;width:1280px;height:720px;overflow:hidden;font-family:"Noto Sans JP",sans-serif}
body{position:relative;background:#eef1f6;background-image:linear-gradient(#dfe4ee 1px,transparent 1px),linear-gradient(90deg,#dfe4ee 1px,transparent 1px);background-size:32px 32px}
img{position:absolute;box-shadow:0 18px 40px rgba(20,30,80,.22),0 2px 6px rgba(20,30,80,.12)}
.c{left:276px;top:60px;width:424px}
.p{left:650px;top:96px;width:420px}
.tag{position:absolute;left:800px;top:560px;background:#106878;color:#fff;font-size:22px;padding:10px 22px;border-radius:999px;box-shadow:0 8px 20px rgba(16,104,120,.35)}
</style></head><body>
<img class="p" src="${page}"><img class="c" src="${cover}">
${badge ? `<div class="tag">${esc(badge)}</div>` : ''}
</body></html>`;
}
const htmlPath = path.join(work, 'thumb.html');
writeFileSync(htmlPath, html);
const browser = await chromium.launch();
const p = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await p.goto('file://' + htmlPath);
await p.evaluate(() => document.fonts.ready);
await p.waitForTimeout(300);
await p.screenshot({ path: out, type: 'jpeg', quality: 88 });
await browser.close();
console.log(`サムネイルを作成しました: ${out}（${landscape ? '横長' : '縦長'}・全${pages}ページ${landscape ? '' : `・中のページ ${inner}`}）`);
console.log(`PAGES=${pages}`);
