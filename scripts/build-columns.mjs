// microCMSからコラム記事を取得し、/column/ 配下の静的HTMLを生成する
// 使い方:
//   MICROCMS_API_KEY=xxxx node scripts/build-columns.mjs   … 本番ビルド（Vercelのビルドコマンド）
//   node scripts/build-columns.mjs --sample                … サンプルデータでローカル確認
// 環境変数:
//   MICROCMS_SERVICE_ID … サービスID（既定: eitoss）
//   MICROCMS_API_KEY    … コンテンツAPIキー（必須。Vercelの環境変数に設定）
//   SITE_ORIGIN         … canonical用オリジン（既定: https://eitoss.com）

import { mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVICE_ID = process.env.MICROCMS_SERVICE_ID || 'eitoss';
const API_KEY = process.env.MICROCMS_API_KEY || '';
const ORIGIN = (process.env.SITE_ORIGIN || 'https://eitoss.com').replace(/\/$/, '');
const ENDPOINT = process.env.MICROCMS_ENDPOINT || 'blogs';
const USE_SAMPLE = process.argv.includes('--sample');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const fmtDate = iso => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};
// category: セレクト(文字列/配列)・参照(オブジェクト)のどちらでも対応
const catOf = a => {
  const c = Array.isArray(a.category) ? a.category[0] : a.category;
  if (!c) return '';
  return typeof c === 'object' ? (c.name || '') : String(c);
};
// 本文: ブログテンプレートは content、独自スキーマは body
const bodyOf = a => a.body || a.content || '';
// 概要: descriptionフィールドがなければ本文から自動生成
const descOf = a => {
  if (a.description) return a.description;
  const text = bodyOf(a).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 90 ? text.slice(0, 90) + '…' : text;
};

// 一覧サムネイル: eyecatch > 本文先頭の画像
const thumbOf = a => {
  if (a.eyecatch?.url) return a.eyecatch.url + '?w=640&fm=webp';
  const m = bodyOf(a).match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1] : null;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(offset) {
  const url = `https://${SERVICE_ID}.microcms.io/api/v1/${ENDPOINT}?limit=100&offset=${offset}&orders=-publishedAt`;
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'X-MICROCMS-API-KEY': API_KEY } });
      if (res.ok) return res.json();
      const body = await res.text();
      if (res.status === 401 || res.status === 403) {
        throw new Error(`microCMS APIキーが拒否されました(${res.status})。VercelのMICROCMS_API_KEYが正しいコンテンツAPIキーか確認してください。`);
      }
      if (res.status === 404) {
        throw new Error(`APIが見つかりません(404)。microCMSにエンドポイント「${ENDPOINT}」（リスト形式）が存在するか確認してください。`);
      }
      lastErr = new Error(`microCMS API ${res.status}: ${body.slice(0, 200)}`);
    } catch (e) {
      if (/APIキー|エンドポイント/.test(e.message)) throw e; // 設定ミスはリトライしない
      lastErr = e;
    }
    if (attempt < 3) {
      console.warn(`[build-columns] 取得失敗(${attempt}回目)、リトライします: ${lastErr.message}`);
      await sleep(attempt * 2000);
    }
  }
  throw lastErr;
}

async function fetchAll() {
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const data = await fetchPage(offset);
    items.push(...data.contents);
    if (items.length >= data.totalCount || data.contents.length === 0) break;
  }
  return items;
}

const SAMPLE = [
  {
    id: 'sample-ehs-law-2026',
    title: '【サンプル記事】2026年上期の環境・労働安全衛生法 改正まとめ',
    description: '2026年上期に公布・施行された環境・労働安全衛生関連の主な法改正を、製造業・建設業への影響の観点から整理しました。',
    category: ['環境・労働安全衛生（EHS）'],
    publishedAt: '2026-08-01T09:00:00.000Z',
    body: '<h2>今期の改正の全体傾向</h2><p>2026年上期は化学物質管理と省エネルギー関連の改正が中心でした。とくに<strong>ラベル表示・SDS交付義務の対象物質追加</strong>は、多くの製造業に影響します。</p><h3>主な改正一覧</h3><ul><li>労働安全衛生法施行令の一部改正（対象物質の追加）</li><li>省エネ法 定期報告の様式変更</li><li>フロン排出抑制法の点検記録に関する運用見直し</li></ul><blockquote><p>自社への影響判定は、事業所の設備・取扱物質の前提情報があって初めて確定します。</p></blockquote><h2>実務対応のポイント</h2><p>改正の把握から対応事項への落とし込みまでの流れは、毎月の定期調査で仕組み化するのが確実です。</p>',
  },
  {
    id: 'sample-iso-revision',
    title: '【サンプル記事】ISO規格改訂対応、何から始める？',
    description: 'ISO 9001・14001・45001の規格改訂対応を進める際の、最初の一歩と費用を抑えるコツを解説します。',
    category: ['ISO'],
    publishedAt: '2026-07-15T09:00:00.000Z',
    body: '<h2>まずは現状のGAP分析から</h2><p>規格改訂対応の第一歩は、現行マニュアルと改訂後の要求事項の差分を把握することです。</p><p>詳しくは<a href="../../cayzen/iso/">ISO支援サービス</a>のページをご覧ください。</p>',
  },
];

// ---- テンプレート（サイト共通のティールデザイン） ----

const CSS = `
:root{--teal-900:#0b4e5b;--teal-700:#106878;--teal-500:#308098;--teal-300:#58a0b0;--teal-100:#80c0c8;--teal-050:#eef6f7;--ink:#2b3338;--gray:#505050;--line:#dde6e8;--white:#ffffff;--accent:#e8a13d}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;scroll-padding-top:130px}
body{font-family:"Noto Sans JP",sans-serif;color:var(--ink);line-height:1.8;background:var(--white);-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
a{color:var(--teal-700);text-decoration:none}
.container{max-width:1080px;margin:0 auto;padding:0 20px}
.btn{display:inline-block;padding:16px 36px;border-radius:999px;font-weight:700;font-size:16px;text-align:center;transition:transform .15s ease,box-shadow .15s ease;box-shadow:0 4px 14px rgba(16,104,120,.25)}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(16,104,120,.3)}
.btn-primary{background:linear-gradient(135deg,var(--teal-500),var(--teal-700));color:#fff}
.btn-ghost{background:#fff;color:var(--teal-700);box-shadow:0 4px 14px rgba(16,104,120,.18)}
.btn-sm{padding:10px 22px;font-size:14px}
.brand{display:inline-flex;align-items:center;gap:10px}
.brand .name{font-weight:900;font-size:17px;color:var(--ink)}
header{position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:100}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:68px;max-width:1160px;margin:0 auto;padding:0 20px}
.header-nav{display:flex;align-items:center;gap:10px}
.header-nav .nav-links{display:flex;gap:22px;margin-right:14px;font-size:14px;font-weight:500}
.header-nav .nav-links a{color:var(--ink)}
.header-nav .nav-links a:hover{color:var(--teal-700)}
.page-head{padding:155px 0 46px;background:radial-gradient(1100px 500px at 85% -10%,rgba(128,192,200,.30),transparent 60%),linear-gradient(180deg,#f6fafb 0%,#eef6f7 100%)}
.page-head .label{font-family:"Poppins","Noto Sans JP",sans-serif;font-size:14px;font-weight:700;letter-spacing:.18em;color:var(--teal-500);text-transform:uppercase}
.page-head h1{font-size:34px;font-weight:900;line-height:1.5;margin-top:6px}
.page-head .lead{color:var(--gray);margin-top:10px;font-size:15px}
.breadcrumb{font-size:12.5px;color:var(--gray);margin-bottom:14px}
.breadcrumb a{color:var(--gray)}
.breadcrumb a:hover{color:var(--teal-700)}
.chip{display:inline-block;background:var(--teal-050);color:var(--teal-700);font-size:12px;font-weight:700;padding:4px 14px;border-radius:999px}
.meta{display:flex;align-items:center;gap:12px;font-size:13px;color:var(--gray)}
main.section{padding:56px 0 80px}
.col-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.col-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 26px rgba(16,104,120,.10);transition:transform .15s ease,box-shadow .15s ease;display:flex;flex-direction:column}
.col-card:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(16,104,120,.16)}
.col-card .thumb{aspect-ratio:16/9;background:linear-gradient(135deg,var(--teal-050),#dcebee);display:flex;align-items:center;justify-content:center;overflow:hidden}
.col-card .thumb img{width:100%;height:100%;object-fit:cover}
.col-card .thumb svg{width:44px;height:44px;opacity:.5}
.col-card .body{padding:20px 22px 24px;display:flex;flex-direction:column;gap:10px;flex:1}
.col-card h2{font-size:16.5px;font-weight:700;line-height:1.55;color:var(--ink)}
.col-card p.desc{font-size:13px;color:var(--gray);flex:1}
.empty{padding:60px 0;text-align:center;color:var(--gray)}
article.post{max-width:760px;margin:0 auto}
.post-head h1{font-size:30px;font-weight:900;line-height:1.5;margin:14px 0 16px}
.post-eyecatch{border-radius:14px;overflow:hidden;box-shadow:0 14px 34px rgba(16,104,120,.14);margin:26px 0 36px}
.article-body{font-size:15.5px}
.article-body h1,.article-body h2{font-size:24px;font-weight:900;line-height:1.5;margin:46px 0 16px;padding-bottom:10px;border-bottom:2px solid var(--teal-050)}
.article-body h3{font-size:19px;font-weight:700;margin:36px 0 12px;padding-left:12px;border-left:4px solid var(--teal-500)}
.article-body h4{font-size:16.5px;font-weight:700;margin:28px 0 10px}
.article-body p{margin:0 0 1.3em}
.article-body ul,.article-body ol{margin:0 0 1.3em;padding-left:1.5em}
.article-body li{margin-bottom:.4em}
.article-body a{text-decoration:underline;text-underline-offset:3px}
.article-body img{border-radius:10px;margin:8px 0 20px;box-shadow:0 8px 22px rgba(16,104,120,.12)}
.article-body blockquote{background:var(--teal-050);border-left:4px solid var(--teal-500);border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 1.3em;color:var(--gray)}
.article-body blockquote p:last-child{margin-bottom:0}
.article-body table{border-collapse:collapse;width:100%;margin:0 0 1.3em;font-size:14px}
.article-body th,.article-body td{border:1px solid var(--line);padding:10px 12px;text-align:left}
.article-body th{background:var(--teal-050);font-weight:700}
.article-body pre{background:#0f2e33;color:#e8f2f4;border-radius:10px;padding:16px 18px;overflow-x:auto;font-size:13px;margin:0 0 1.3em}
.article-body code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.post-cta{margin-top:60px;background:linear-gradient(135deg,var(--teal-050),#f6fafb);border-radius:16px;padding:34px 30px;text-align:center;box-shadow:0 10px 26px rgba(16,104,120,.08)}
.post-cta h2{font-size:20px;font-weight:900;margin-bottom:8px}
.post-cta p{font-size:14px;color:var(--gray);margin-bottom:20px}
.post-cta .btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.back-link{display:inline-block;margin-top:44px;font-size:14px;font-weight:700}
footer{background:var(--teal-900);color:#fff;padding:46px 0 30px}
.footer-inner{display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center}
.footer-brand{background:#fff;border-radius:10px;padding:12px 22px;font-size:18px;color:var(--ink)}
.footer-links{display:flex;gap:26px;flex-wrap:wrap;justify-content:center;font-size:13.5px}
.footer-links a{color:rgba(255,255,255,.85)}
.footer-links a:hover{color:#fff}
footer p{font-size:13px;color:rgba(255,255,255,.8)}
footer .copy{font-size:12px;color:rgba(255,255,255,.55);margin-top:12px}
@media(max-width:900px){
  .col-grid{grid-template-columns:1fr}
  .page-head h1{font-size:26px}
  .post-head h1{font-size:23px}
  .header-nav .nav-links{display:none}
  .header-nav .btn-sm{padding:9px 14px;font-size:12.5px;white-space:nowrap}
  main.section{padding:40px 0 60px}
}
header.gh{position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:100}
.gh-inner{display:flex;justify-content:space-between;align-items:center;gap:24px;max-width:1360px;margin:0 auto;padding:10px 24px}
.gh-left{display:flex;flex-direction:column;gap:7px;align-items:flex-start}
.gh-brand img{height:32px;width:auto;display:block}
.gh-nav{display:flex;align-items:center;gap:26px;font-size:14.5px;font-weight:700}
.gh-nav a,.gh-dd-label{color:#1c1c1c;white-space:nowrap;cursor:pointer}
.gh-nav a:hover,.gh-dd:hover .gh-dd-label{color:var(--teal-700)}
.gh-dd{position:relative}
.gh-dd-label::after{content:" ▾";font-size:11px}
.gh-dd-menu{display:none;position:absolute;top:100%;left:-14px;padding-top:12px;z-index:110}
.gh-dd:hover .gh-dd-menu{display:block}
.gh-dd-menu .in{background:#fff;border-radius:10px;box-shadow:0 12px 32px rgba(16,104,120,.18);padding:8px;min-width:280px}
.gh-dd-menu a{display:block;padding:10px 14px;border-radius:8px;font-size:14px;white-space:nowrap}
.gh-dd-menu a:hover{background:var(--teal-050)}
.gh-right{display:flex;flex-direction:column;align-items:flex-end;gap:7px}
.gh-tel{font-size:12.5px;color:#333;white-space:nowrap;line-height:1.3;display:flex;align-items:baseline;gap:6px}
.gh-tel b{font-size:21px;font-weight:900;font-family:"Poppins","Noto Sans JP",sans-serif}
.gh-tel span{color:#555}
.gh-actions{display:flex;gap:10px}
.gh-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:6px;color:#fff;font-weight:700;font-size:14px;white-space:nowrap;transition:transform .15s ease,filter .15s ease;box-shadow:0 3px 10px rgba(0,0,0,.14)}
.gh-btn:hover{transform:translateY(-1px);filter:brightness(1.06)}
.gh-btn svg{width:16px;height:16px}
.gh-btn-dl{background:#f6941c}
.gh-btn-tr{background:linear-gradient(90deg,#54a4ec,#2e7fd6)}
.gh-btn-ct{background:#45a3b4}
@media(max-width:1180px){.gh-nav{gap:18px;font-size:13.5px}}
@media(max-width:1020px){.gh-nav{display:none}.gh-tel{display:none}.gh-left{flex-direction:row;align-items:center}}
@media(max-width:640px){
  .gh-inner{padding:10px 14px;gap:10px}
  .gh-brand img{height:26px}
  .gh-btn{padding:8px 10px;font-size:12px;gap:5px}
  .gh-btn svg{width:14px;height:14px}
  .gh-actions{gap:6px}
}
`;

const MARK = `<svg width="28" height="28" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 a42 42 0 1 0 29.7 12.3 l-12.7 12.7 a24 24 0 1 1 -17 -7 z" fill="#106878"/></svg>`;
const FAVICON = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Cpath d="M50 8 a42 42 0 1 0 29.7 12.3 l-12.7 12.7 a24 24 0 1 1 -17 -7 z" fill="%23106878"/%3E%3C/svg%3E`;

// depth: サイトルートまでの相対パス（一覧=1階層, 記事=2階層）
function chrome(depth, bodyHtml, { title, description, canonicalPath, ogType = 'website' }) {
  const rel = '../'.repeat(depth);
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="${ogType}">
<link rel="canonical" href="${ORIGIN}${canonicalPath}">
<meta property="og:url" content="${ORIGIN}${canonicalPath}">
<link rel="icon" type="image/svg+xml" href='${FAVICON}'>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&family=Poppins:wght@600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>

<header class="gh">
  <div class="gh-inner">
    <div class="gh-left">
      <a class="gh-brand" href="${rel}" aria-label="エイトス株式会社"><img src="${rel}assets/logo-corporate-horizontal-tagline@2x.png" alt="eitoss - Innovation by All"></a>
      <nav class="gh-nav">
        <div class="gh-dd">
          <span class="gh-dd-label">活用シーン</span>
          <div class="gh-dd-menu"><div class="in">
            <a href="${rel}cayzen/ehsresearch/">Cayzen EHS Research（EHS法令調査代行）</a>
            <a href="${rel}cayzen/knowledgemanagement/">Cayzen ナレッジマネジメント（SaaS）</a>
            <a href="${rel}cayzen/iso/">ISO支援</a>
          </div></div>
        </div>
        <a href="https://eitoss.com/seminar">セミナー</a>
        <a href="${rel}column/">コラム</a>
        <a href="${rel}#news">ニュース</a>
        <a href="${rel}#company">会社概要</a>
        <a href="https://eitoss.com/recruit">採用情報</a>
      </nav>
    </div>
    <div class="gh-right">
      <p class="gh-tel">TEL: <b>050-8881-9881</b><span>（平日10:00〜19:00）</span></p>
      <div class="gh-actions">
        <a class="gh-btn gh-btn-dl" href="${rel}cayzen/ehsresearch/#download"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg> 資料請求</a>
        <a class="gh-btn gh-btn-tr" href="${rel}cayzen/ehsresearch/#trial"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h10M4 12h10M4 18h7"/><path d="M17 16l2 2 4-4"/></svg> トライアル</a>
        <a class="gh-btn gh-btn-ct" href="${rel}#contact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> お問合せ</a>
      </div>
    </div>
  </div>
</header>

${bodyHtml}

<footer>
  <div class="container footer-inner">
    <div class="footer-brand">
      <img src="${rel}assets/logo-corporate-horizontal-tagline@2x.png" alt="eitoss - Innovation by All" style="height:34px;width:auto">
    </div>
    <div class="footer-links">
      <a href="${rel}cayzen/ehsresearch/">Cayzen EHS Research</a>
      <a href="${rel}cayzen/knowledgemanagement/">Cayzen ナレッジマネジメント</a>
      <a href="${rel}cayzen/iso/">ISO支援</a>
      <a href="${rel}column/">コラム</a>
      <a href="${rel}#company">会社概要</a>
      <a href="${rel}#contact">お問い合わせ</a>
    </div>
    <p>本社: 愛知県豊田市小坂本町1-5-5 YAMATO BLDG2F　｜　東京支店: 東京都豊島区東池袋3-1-1 サンシャイン60 12F</p>
    <p class="copy">© Eitoss Inc. All rights reserved.</p>
  </div>
</footer>

</body>
</html>`;
}

const THUMB_PLACEHOLDER = `<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 8 a42 42 0 1 0 29.7 12.3 l-12.7 12.7 a24 24 0 1 1 -17 -7 z" fill="#106878"/></svg>`;

function listPage(articles) {
  const cards = articles.map(a => {
    const cat = catOf(a);
    const t = thumbOf(a);
    const thumb = t ? `<img src="${esc(t)}" alt="" loading="lazy">` : THUMB_PLACEHOLDER;
    return `      <a class="col-card" href="${esc(a.id)}/">
        <div class="thumb">${thumb}</div>
        <div class="body">
          <div class="meta">${cat ? `<span class="chip">${esc(cat)}</span>` : ''}<time datetime="${esc(a.publishedAt || '')}">${fmtDate(a.publishedAt)}</time></div>
          <h2>${esc(a.title)}</h2>
          ${descOf(a) ? `<p class="desc">${esc(descOf(a))}</p>` : ''}
        </div>
      </a>`;
  }).join('\n');

  const body = `<div class="page-head">
  <div class="container">
    <p class="breadcrumb"><a href="../">HOME</a> ／ コラム</p>
    <p class="label">Column</p>
    <h1>コラム</h1>
    <p class="lead">環境・労働安全衛生（EHS）法令、ISO、ナレッジマネジメントに関する実務情報をお届けします。</p>
  </div>
</div>
<main class="section">
  <div class="container">
${articles.length ? `    <div class="col-grid">\n${cards}\n    </div>` : '    <p class="empty">記事は準備中です。公開までしばらくお待ちください。</p>'}
  </div>
</main>`;

  return chrome(1, body, {
    title: 'コラム - エイトス株式会社',
    description: '環境・労働安全衛生（EHS）法令、ISO、ナレッジマネジメントに関する実務情報をお届けする、エイトス株式会社のコラムです。',
    canonicalPath: '/column/',
  });
}

function articlePage(a) {
  const cat = catOf(a);
  const body = `<div class="page-head">
  <div class="container">
    <article class="post post-head-wrap" style="max-width:760px;margin:0 auto">
      <p class="breadcrumb"><a href="../../">HOME</a> ／ <a href="../">コラム</a> ／ ${esc(a.title)}</p>
      <div class="meta">${cat ? `<span class="chip">${esc(cat)}</span>` : ''}<time datetime="${esc(a.publishedAt || '')}">${fmtDate(a.publishedAt)}</time></div>
      <div class="post-head"><h1>${esc(a.title)}</h1></div>
    </article>
  </div>
</div>
<main class="section">
  <div class="container">
    <article class="post">
      ${a.eyecatch?.url ? `<div class="post-eyecatch"><img src="${esc(a.eyecatch.url)}?w=1280&fm=webp" alt=""></div>` : ''}
      <div class="article-body">
${bodyOf(a)}
      </div>
      <div class="post-cta">
        <h2>法令対応・現場改善のご相談はエイトスへ</h2>
        <p>EHS法令調査の代行から、ISO対応、現場のナレッジマネジメントまで。まずはお気軽にご相談ください。</p>
        <div class="btns">
          <a class="btn btn-primary" href="../../#services">サービスを見る</a>
          <a class="btn btn-ghost" href="../../#contact">お問い合わせ</a>
        </div>
      </div>
      <a class="back-link" href="../">← コラム一覧へ戻る</a>
    </article>
  </div>
</main>`;

  return chrome(2, body, {
    title: `${a.title} - コラム｜エイトス株式会社`,
    description: descOf(a) || `${a.title}｜エイトス株式会社のコラム`,
    canonicalPath: `/column/${a.id}/`,
    ogType: 'article',
  });
}

// ---- main ----
let articles;
if (USE_SAMPLE) {
  articles = SAMPLE;
  console.log('[build-columns] --sample: サンプルデータでビルドします');
} else if (!API_KEY) {
  console.warn('[build-columns] MICROCMS_API_KEY が未設定のため、コラムのビルドをスキップしました。');
  process.exit(0);
} else {
  const all = await fetchAll();
  // APIキーの権限によっては下書きも返るため、公開済み（publishedAtあり）のみ採用
  articles = all.filter(a => a.publishedAt);
  console.log(`[build-columns] microCMSから ${all.length} 件取得（公開済み ${articles.length} 件を掲載）`);
}

await rm(path.join(ROOT, 'column'), { recursive: true, force: true });
await mkdir(path.join(ROOT, 'column'), { recursive: true });
await writeFile(path.join(ROOT, 'column', 'index.html'), listPage(articles));
for (const a of articles) {
  const dir = path.join(ROOT, 'column', a.id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), articlePage(a));
}
console.log(`[build-columns] 生成完了: column/index.html + 記事 ${articles.length} ページ`);
