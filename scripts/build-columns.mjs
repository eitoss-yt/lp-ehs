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
const ORIGIN = (process.env.SITE_ORIGIN || 'https://lp.eitoss.com').replace(/\/$/, '');
const ENDPOINT = process.env.MICROCMS_ENDPOINT || 'column';
const NEWS_ENDPOINT = process.env.MICROCMS_NEWS_ENDPOINT || 'news';
const SEMINAR_ENDPOINT = process.env.MICROCMS_SEMINAR_ENDPOINT || 'seminar';
const USE_SAMPLE = process.argv.includes('--sample');

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const dateOf = a => a.date || a.publishedAt;
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
// 絵文字はサイト上に表示しない方針（入稿データに含まれていてもビルド時に除去）
const EMOJI_RE = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B50}\u{2B55}\u{FE0F}\u{203C}\u{2049}]/gu;
const stripEmoji = s => String(s ?? '').replace(EMOJI_RE, '').replace(/(<p>|<li>|<h[1-6][^>]*>)[ \t]+/g, '$1');
// 概要: descriptionフィールドがなければ本文から自動生成
const descOf = a => {
  if (a.description) return stripEmoji(a.description);
  const text = stripEmoji(bodyOf(a)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > 90 ? text.slice(0, 90) + '…' : text;
};

// 一覧サムネイル: eyecatch > 本文先頭の画像
const thumbOf = a => {
  if (a.eyecatch?.url) return a.eyecatch.url + '?w=640&fm=webp';
  const m = bodyOf(a).match(/<img[^>]+src="([^"]+)"/);
  return m ? m[1] : null;
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchPage(endpoint, offset) {
  const url = `https://${SERVICE_ID}.microcms.io/api/v1/${endpoint}?limit=100&offset=${offset}&orders=-publishedAt`;
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
        throw new Error(`APIが見つかりません(404)。microCMSにエンドポイント「${endpoint}」（リスト形式）が存在するか確認してください。`);
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

async function fetchAll(endpoint) {
  const items = [];
  for (let offset = 0; ; offset += 100) {
    const data = await fetchPage(endpoint, offset);
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
body{font-family:"Noto Sans JP",sans-serif;font-size:17.5px;color:var(--ink);line-height:1.8;background:var(--white);-webkit-font-smoothing:antialiased}
img{max-width:100%;height:auto;display:block}
h1,h2,h3{letter-spacing:.08em;text-wrap:balance}
a{color:var(--teal-700);text-decoration:none}
.container{max-width:1080px;margin:0 auto;padding:0 20px}
.btn{display:inline-block;padding:16px 36px;border-radius:999px;font-weight:500;font-size:17.5px;text-align:center;transition:transform .15s ease,box-shadow .15s ease;box-shadow:0 4px 14px rgba(16,104,120,.25)}
.btn:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(16,104,120,.3)}
.btn-primary{background:linear-gradient(135deg,var(--teal-500),var(--teal-700));color:#fff}
.btn-ghost{background:#fff;color:var(--teal-700);box-shadow:0 4px 14px rgba(16,104,120,.18)}
.btn-sm{padding:10px 22px;font-size:15.5px}
.brand{display:inline-flex;align-items:center;gap:10px}
.brand .name{font-weight:500;font-size:18.5px;color:var(--ink)}
header{position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:100}
.header-inner{display:flex;align-items:center;justify-content:space-between;height:68px;max-width:1160px;margin:0 auto;padding:0 20px}
.header-nav{display:flex;align-items:center;gap:10px}
.header-nav .nav-links{display:flex;gap:22px;margin-right:14px;font-size:15.5px;font-weight:500}
.header-nav .nav-links a{color:var(--ink)}
.header-nav .nav-links a:hover{color:var(--teal-700)}
.page-head{position:relative;overflow:hidden;padding:155px 0 46px;background:radial-gradient(1100px 500px at 85% -10%,rgba(128,192,200,.30),transparent 60%),linear-gradient(180deg,#f6fafb 0%,#eef6f7 100%)}
.page-head::before{content:attr(data-wm);position:absolute;top:96px;left:50%;transform:translateX(-50%);font-family:"Poppins","Noto Sans JP",sans-serif;font-weight:700;font-size:150px;line-height:1;letter-spacing:.08em;color:rgba(16,104,120,.06);white-space:nowrap;pointer-events:none}
.page-head .container{position:relative}
.page-head[data-wm] .container{text-align:center}
.page-head[data-wm] .breadcrumb{text-align:left}
.page-head .label{display:none}
.page-head h1{font-size:35.5px;font-weight:500;line-height:1.5;margin-top:6px}
.page-head .lead{color:var(--gray);margin-top:10px;font-size:16.5px}
.breadcrumb{font-size:14px;color:var(--gray);margin-bottom:14px}
.breadcrumb a{color:var(--gray)}
.breadcrumb a:hover{color:var(--teal-700)}
.chip{display:inline-block;background:var(--teal-050);color:var(--teal-700);font-size:13.5px;font-weight:500;padding:4px 14px;border-radius:999px}
.meta{display:flex;align-items:center;gap:12px;font-size:14.5px;color:var(--gray)}
main.section{padding:56px 0 80px}
.col-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px}
.col-card{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 26px rgba(16,104,120,.10);transition:transform .15s ease,box-shadow .15s ease;display:flex;flex-direction:column}
.col-card:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(16,104,120,.16)}
.col-card .thumb{aspect-ratio:16/9;background:linear-gradient(135deg,var(--teal-050),#dcebee);display:flex;align-items:center;justify-content:center;overflow:hidden}
.col-card .thumb img{width:100%;height:100%;object-fit:cover}
.col-card .thumb svg{width:44px;height:44px;opacity:.5}
.col-card .body{padding:20px 22px 24px;display:flex;flex-direction:column;gap:10px;flex:1}
.col-card h2{font-size:18px;font-weight:500;line-height:1.55;color:var(--ink)}
.col-card p.desc{font-size:14.5px;color:var(--gray);flex:1}
.empty{padding:60px 0;text-align:center;color:var(--gray)}
article.post{max-width:760px;margin:0 auto}
.post-head h1{font-size:31.5px;font-weight:500;line-height:1.5;margin:14px 0 16px}
.post-eyecatch{border-radius:14px;overflow:hidden;box-shadow:0 14px 34px rgba(16,104,120,.14);margin:26px 0 36px}
.article-body{font-size:17px}
.article-body h1,.article-body h2{font-size:25.5px;font-weight:500;line-height:1.5;margin:46px 0 16px;padding-bottom:10px;border-bottom:2px solid var(--teal-050)}
.article-body h3{font-size:20.5px;font-weight:500;margin:36px 0 12px;padding-left:12px;border-left:4px solid var(--teal-500)}
.article-body h4{font-size:18px;font-weight:500;margin:28px 0 10px}
.article-body p{margin:0 0 1.3em}
.article-body ul,.article-body ol{margin:0 0 1.3em;padding-left:1.5em}
.article-body li{margin-bottom:.4em}
.article-body a{text-decoration:underline;text-underline-offset:3px}
.article-body img{border-radius:10px;margin:8px 0 20px;box-shadow:0 8px 22px rgba(16,104,120,.12)}
.article-body blockquote{background:var(--teal-050);border-left:4px solid var(--teal-500);border-radius:0 10px 10px 0;padding:16px 20px;margin:0 0 1.3em;color:var(--gray)}
.article-body blockquote p:last-child{margin-bottom:0}
.article-body table{border-collapse:collapse;width:100%;margin:0 0 1.3em;font-size:15.5px}
.article-body th,.article-body td{border:1px solid var(--line);padding:10px 12px;text-align:left}
.article-body th{background:var(--teal-050);font-weight:500}
.article-body pre{background:#0f2e33;color:#e8f2f4;border-radius:10px;padding:16px 18px;overflow-x:auto;font-size:14.5px;margin:0 0 1.3em}
.article-body code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
.post-cta{margin-top:60px;background:linear-gradient(135deg,var(--teal-050),#f6fafb);border-radius:16px;padding:34px 30px;text-align:center;box-shadow:0 10px 26px rgba(16,104,120,.08)}
.post-cta h2{font-size:21.5px;font-weight:500;margin-bottom:8px}
.post-cta p{font-size:15.5px;color:var(--gray);margin-bottom:20px}
.post-cta .btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.back-link{display:inline-block;margin-top:44px;font-size:15.5px;font-weight:500}
@media(max-width:900px){
  .col-grid{grid-template-columns:1fr}
  .page-head h1{font-size:27.5px}
  .page-head::before{font-size:64px;top:122px}
  .post-head h1{font-size:24.5px}
  .header-nav .nav-links{display:none}
  .header-nav .btn-sm{padding:9px 14px;font-size:14px;white-space:nowrap}
  main.section{padding:40px 0 60px}
}
header.gh{position:fixed;top:0;left:0;right:0;background:rgba(255,255,255,.96);backdrop-filter:blur(8px);border-bottom:1px solid var(--line);z-index:100}
.gh-inner{display:flex;justify-content:space-between;align-items:center;gap:24px;max-width:1360px;margin:0 auto;padding:10px 24px}
.gh-left{display:flex;flex-direction:column;gap:7px;align-items:flex-start}
.gh-brand img{height:32px;width:auto;display:block}
.gh-nav{display:flex;align-items:center;gap:26px;font-size:16px;font-weight:500}
.gh-nav a,.gh-dd-label{color:#1c1c1c;white-space:nowrap;cursor:pointer}
.gh-nav a:hover,.gh-dd:hover .gh-dd-label{color:var(--teal-700)}
.gh-dd{position:relative}
.gh-dd-label::after{content:" ▾";font-size:12.5px}
.gh-dd-menu{display:none;position:absolute;top:100%;left:-14px;padding-top:12px;z-index:110}
.gh-dd:hover .gh-dd-menu{display:block}
.gh-dd-menu .in{background:#fff;border-radius:10px;box-shadow:0 12px 32px rgba(16,104,120,.18);padding:8px;min-width:280px}
.gh-dd-menu a{display:block;padding:10px 14px;border-radius:8px;font-size:15.5px;white-space:nowrap}
.gh-dd-menu a:hover{background:var(--teal-050)}
.gh-right{display:flex;flex-direction:column;align-items:flex-end;gap:7px}
.gh-tel{font-size:14px;color:#333;white-space:nowrap;line-height:1.3;display:flex;align-items:baseline;gap:6px}
.gh-tel b{font-size:22.5px;font-weight:500;font-family:"Poppins","Noto Sans JP",sans-serif}
.gh-tel span{color:#555}
.gh-actions{display:flex;gap:10px}
.gh-btn{display:inline-flex;align-items:center;gap:7px;padding:10px 20px;border-radius:6px;color:#fff;font-weight:500;font-size:15.5px;white-space:nowrap;transition:transform .15s ease,filter .15s ease;box-shadow:0 3px 10px rgba(0,0,0,.14)}
.gh-btn:hover{transform:translateY(-1px);filter:brightness(1.06)}
.gh-btn svg{width:16px;height:16px}
.gh-btn-dl{background:#f6941c}
.gh-btn-tr{background:linear-gradient(90deg,#54a4ec,#2e7fd6)}
.gh-btn-ct{background:#45a3b4}
@media(max-width:1180px){.gh-nav{gap:18px;font-size:15px}}
@media(max-width:1020px){.gh-nav{display:none}.gh-tel{display:none}.gh-left{flex-direction:row;align-items:center}}
@media(max-width:640px){
  .gh-inner{padding:10px 14px;gap:10px}
  .gh-brand img{height:26px}
  .gh-btn{padding:8px 10px;font-size:13.5px;gap:5px}
  .gh-btn svg{width:14px;height:14px}
  .gh-actions{gap:6px}
}

/* 記事下CTAバナー（画像） */
.cta-banner-img{display:block;margin-top:60px;border-radius:14px;overflow:hidden;box-shadow:0 14px 34px rgba(16,104,120,.16);transition:transform .15s ease,box-shadow .15s ease}
.cta-banner-img:hover{transform:translateY(-3px);box-shadow:0 20px 44px rgba(16,104,120,.22)}
.cta-banner-img img{width:100%;height:auto;display:block;margin:0;border-radius:0;box-shadow:none}

.news-rows{max-width:860px;margin:0 auto}
.news-row{display:flex;gap:22px;align-items:baseline;padding:18px 10px;border-bottom:1px solid var(--line);font-size:16px;color:var(--ink)}
.news-row time{flex:0 0 auto;color:var(--teal-500);font-weight:500;font-family:"Poppins","Noto Sans JP",sans-serif}
.news-row:hover .t{color:var(--teal-700)}
@media(max-width:640px){.news-row{flex-direction:column;gap:4px}}

.chip-open{background:#fdf0dc;color:#b06a00}
.chip-closed{background:#eceff1;color:#607078}
.chip-archive{background:var(--teal-700);color:#fff}
.sem-info{background:var(--teal-050);border-radius:12px;padding:18px 22px;margin:0 0 26px;font-size:16px}
.sem-section{margin-bottom:56px}
.sem-section .sem-heading{font-size:23.5px;font-weight:500;padding-left:14px;border-left:5px solid var(--teal-500);margin-bottom:22px}
.video-wrap{position:relative;padding-top:56.25%;background:#0b4e5b;border-radius:14px;overflow:hidden;box-shadow:0 14px 34px rgba(16,104,120,.16);margin:26px 0 36px}
.video-wrap iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.sem-apply{margin:30px 0 10px;text-align:center}
footer{background:var(--teal-900);color:#fff;padding:56px 0 28px}
.footer-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:44px;align-items:start;max-width:1080px;margin:0 auto}
.footer-brand{display:inline-block}
.footer-brand img{height:38px;width:auto;display:block}
.footer-addr{font-size:13.5px;color:rgba(255,255,255,.75);margin-top:18px;line-height:2}
.footer-head{font-size:15.5px;font-weight:500;color:#fff;letter-spacing:.08em;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid rgba(255,255,255,.2)}
.footer-col a{display:block;font-size:14.5px;color:rgba(255,255,255,.8);margin-bottom:10px}
.footer-col a:hover{color:#fff}
footer .copy{font-size:12.5px;color:rgba(255,255,255,.55);text-align:center;margin-top:44px;padding-top:20px;border-top:1px solid rgba(255,255,255,.12)}
@media(max-width:860px){.footer-grid{grid-template-columns:1fr 1fr;gap:30px}}
@media(max-width:560px){.footer-grid{grid-template-columns:1fr}}
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
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&family=Poppins:wght@500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>

<header class="gh">
  <div class="gh-inner">
    <div class="gh-left">
      <a class="gh-brand" href="${rel}" aria-label="エイトス株式会社"><img src="${rel}assets/logo-corporate-horizontal-single.svg" alt="eitoss"></a>
      <nav class="gh-nav">
        <div class="gh-dd">
          <span class="gh-dd-label">活用シーン</span>
          <div class="gh-dd-menu"><div class="in">
            <a href="${rel}cayzen/ehsresearch/">Cayzen EHS Research（EHS法令調査代行）</a>
            <a href="${rel}cayzen/knowledgemanagement/">Cayzen ナレッジマネジメント（SaaS）</a>
            <a href="${rel}cayzen/iso/">Cayzen ISO サポート</a>
          </div></div>
        </div>
        <a href="${rel}seminar/">セミナー</a>
        <a href="${rel}column/">コラム</a>
        <a href="${rel}news/">ニュース</a>
        <a href="${rel}resources/">お役立ち資料</a>
        <a href="${rel}#company">会社概要</a>
        <a href="https://eitoss.notion.site/f56f60f846fe4af9bfa33420cf19103e" target="_blank" rel="noopener">採用情報</a>
      </nav>
    </div>
    <div class="gh-right">
      <p class="gh-tel">TEL: <b>050-8881-9881</b><span>（平日10:00〜19:00）</span></p>
      <div class="gh-actions">
        <a class="gh-btn gh-btn-dl" href="${rel}document/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg> 資料請求</a>
        <a class="gh-btn gh-btn-ct" href="${rel}#contact"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg> お問合せ</a>
      </div>
    </div>
  </div>
</header>

${bodyHtml}

<footer>
  <div class="container">
    <div class="footer-grid">
      <div>
        <div class="footer-brand"><img src="${rel}assets/logo-corporate-horizontal-white.png" alt="eitoss"></div>
        <p class="footer-addr">本社: 〒471-0031<br>愛知県豊田市小坂本町1-5-5 YAMATO BLDG2F<br>営業拠点: 東京都豊島区東池袋3-1-1<br>サンシャイン60 12F</p>
      </div>
      <nav class="footer-col">
        <p class="footer-head">サービス</p>
        <a href="${rel}cayzen/ehsresearch/">Cayzen EHS Research</a>
        <a href="${rel}cayzen/knowledgemanagement/">Cayzen ナレッジマネジメント</a>
        <a href="${rel}cayzen/iso/">Cayzen ISO サポート</a>
      </nav>
      <nav class="footer-col">
        <p class="footer-head">コンテンツ</p>
        <a href="${rel}seminar/">セミナー</a>
        <a href="${rel}column/">コラム</a>
        <a href="${rel}news/">ニュース</a>
        <a href="${rel}document/">資料ダウンロード</a>
        <a href="${rel}resources/">お役立ち資料</a>
      </nav>
      <nav class="footer-col">
        <p class="footer-head">企業情報</p>
        <a href="${rel}#company">会社概要</a>
        <a href="https://eitoss.notion.site/f56f60f846fe4af9bfa33420cf19103e" target="_blank" rel="noopener">採用情報</a>
        <a href="${rel}#contact">お問い合わせ</a>
      </nav>
    </div>
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
    return `      <a class="col-card" href="/column/${esc(a.id)}/">
        <div class="thumb">${thumb}</div>
        <div class="body">
          <div class="meta">${cat ? `<span class="chip">${esc(cat)}</span>` : ''}<time datetime="${esc(dateOf(a) || '')}">${fmtDate(dateOf(a))}</time></div>
          <h2>${esc(a.title)}</h2>
          ${descOf(a) ? `<p class="desc">${esc(descOf(a))}</p>` : ''}
        </div>
      </a>`;
  }).join('\n');

  const body = `<div class="page-head" data-wm="COLUMN">
  <div class="container">
    <p class="breadcrumb"><a href="../">HOME</a> ／ コラム</p>
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

// 記事テーマ別のCTAバナー（タイトルにISOを含む記事はISO資料、それ以外はEHS調査代行）
// バナー画像: assets/column_bnr_iso14001.jpg ／ assets/column_bnr_ehs.jpg
function ctaBanner(a) {
  if (/iso/i.test(a.title || '')) {
    return `<a class="cta-banner-img" href="../../document/ISO14001_2026-revision/">
        <img src="../../assets/column_bnr_iso14001.jpg" alt="どう変わる？ISO14001の改訂を現場レベルで確認するポイント｜詳しくはこちら" loading="lazy" width="1080" height="300">
      </a>`;
  }
  return `<a class="cta-banner-img" href="../../document/ehs-research/">
        <img src="../../assets/column_bnr_ehs.jpg" alt="環境・労働安全関連の法令対応のお悩み、AI調査代行でスピード解決！最大95%工数削減｜詳しくはこちら" loading="lazy" width="1080" height="300">
      </a>`;
}

// 本文の中間（中央に最も近いh2見出しの直前、なければ中央付近の段落の直後）にバナーを挿入
function insertMidBanner(html, banner) {
  if (!html || html.length < 1200) return html; // 短い記事には入れない
  const mid = html.length / 2;
  const h2s = [...html.matchAll(/<h2[\s>]/g)].map(m => m.index).filter(i => i > html.length * 0.2 && i < html.length * 0.85);
  if (h2s.length) {
    const pos = h2s.reduce((a, b) => Math.abs(b - mid) < Math.abs(a - mid) ? b : a);
    return html.slice(0, pos) + banner + '\n' + html.slice(pos);
  }
  const ps = [...html.matchAll(/<\/p>/g)].map(m => m.index + 4).filter(i => i > html.length * 0.3 && i < html.length * 0.8);
  if (ps.length) {
    const pos = ps.reduce((a, b) => Math.abs(b - mid) < Math.abs(a - mid) ? b : a);
    return html.slice(0, pos) + '\n' + banner + '\n' + html.slice(pos);
  }
  return html;
}

function articlePage(a) {
  const cat = catOf(a);
  const body = `<div class="page-head">
  <div class="container">
    <article class="post post-head-wrap" style="max-width:760px;margin:0 auto">
      <p class="breadcrumb"><a href="../../">HOME</a> ／ <a href="../">コラム</a> ／ ${esc(a.title)}</p>
      <div class="meta">${cat ? `<span class="chip">${esc(cat)}</span>` : ''}<time datetime="${esc(dateOf(a) || '')}">${fmtDate(dateOf(a))}</time></div>
      <div class="post-head"><h1>${esc(a.title)}</h1></div>
    </article>
  </div>
</div>
<main class="section">
  <div class="container">
    <article class="post">
      ${a.eyecatch?.url && !bodyOf(a).trimStart().startsWith('<img') ? `<div class="post-eyecatch"><img src="${esc(a.eyecatch.url)}?w=1280&fm=webp" alt=""></div>` : ''}
      <div class="article-body">
${insertMidBanner(stripEmoji(bodyOf(a)), ctaBanner(a))}
      </div>
      ${ctaBanner(a)}
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


// ---- ニュース ----
function newsListPage(items) {
  const rows = items.map(n => `      <a class="news-row" href="/news/${esc(n.id)}/"><time datetime="${esc(dateOf(n))}">${fmtDate(dateOf(n))}</time><span class="t">${esc(n.title)}</span></a>`).join('\n');
  const body = `<div class="page-head" data-wm="NEWS">
  <div class="container">
    <p class="breadcrumb"><a href="../">HOME</a> ／ ニュース</p>
    <h1>ニュース</h1>
    <p class="lead">エイトス株式会社からのお知らせ・プレスリリースです。</p>
  </div>
</div>
<main class="section">
  <div class="container">
    <div class="news-rows">
${rows || '      <p class="empty">お知らせは準備中です。</p>'}
    </div>
  </div>
</main>`;
  return chrome(1, body, {
    title: 'ニュース - エイトス株式会社',
    description: 'エイトス株式会社からのお知らせ・プレスリリース一覧です。',
    canonicalPath: '/news/',
  });
}

function newsPage(n) {
  const linkBtn = n.link ? `<p style="margin-top:28px"><a class="btn btn-primary" href="${esc(n.link)}" target="_blank" rel="noopener">関連リンクはこちら</a></p>` : '';
  const body = `<div class="page-head">
  <div class="container">
    <article class="post" style="max-width:760px;margin:0 auto">
      <p class="breadcrumb"><a href="../../">HOME</a> ／ <a href="../">ニュース</a> ／ ${esc(n.title)}</p>
      <div class="meta"><span class="chip">お知らせ</span><time datetime="${esc(dateOf(n))}">${fmtDate(dateOf(n))}</time></div>
      <div class="post-head"><h1>${esc(n.title)}</h1></div>
    </article>
  </div>
</div>
<main class="section">
  <div class="container">
    <article class="post">
      <div class="article-body">
${stripEmoji(bodyOf(n))}
      </div>
      ${linkBtn}
      <a class="back-link" href="../">← ニュース一覧へ戻る</a>
    </article>
  </div>
</main>`;
  return chrome(2, body, {
    title: `${n.title} - ニュース｜エイトス株式会社`,
    description: descOf(n) || `${n.title}｜エイトス株式会社のお知らせ`,
    canonicalPath: `/news/${n.id}/`,
    ogType: 'article',
  });
}

// ---- セミナー ----
// microCMSのSeminar API（推奨フィールド: title / date(日時) / eventDate / description / body /
// cover(画像) / applyUrl / youtube）から生成。コンテンツが未登録・フィールド不足の間は
// data/seminar-fallback.json（STUDIOからの移行データ）で生成する。
const semCoverOf = (s, depth = 1) => {
  if (s.cover?.url) return s.cover.url + '?w=800&fm=webp';
  if (typeof s.cover === 'string' && s.cover) return s.cover.startsWith('/') ? '../'.repeat(depth) + s.cover.slice(1) : s.cover;
  return '';
};
// YouTube動画ID（11文字）だけを採用。必須フィールド用の「-」等のプレースホルダは無視する
const semYoutubeOf = s => {
  const v = String(s.youtube || '').split('?')[0].trim().replace(/^.*\//, '');
  return /^[A-Za-z0-9_-]{11}$/.test(v) ? v : '';
};
const semStateOf = s => {
  const now = new Date();
  const d = s.date ? new Date(s.date) : null;
  if (d && d.getTime() > now.getTime() - 24 * 3600 * 1000 && s.applyUrl && !semYoutubeOf(s)) return 'open';
  if (semYoutubeOf(s)) return 'archive';
  return 'closed';
};
const SEM_CHIP = { open: '<span class="chip chip-open">申込受付中</span>', archive: '<span class="chip chip-archive">アーカイブ配信中</span>', closed: '<span class="chip chip-closed">受付終了</span>' };

function seminarListPage(items) {
  const card = s => {
    const cover = semCoverOf(s, 1);
    const thumb = cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : (semYoutubeOf(s) ? `<img src="https://i.ytimg.com/vi/${esc(semYoutubeOf(s))}/hqdefault.jpg" alt="" loading="lazy">` : THUMB_PLACEHOLDER);
    const st = semStateOf(s);
    return `      <a class="col-card" href="/seminar/${esc(s.id)}/">
        <div class="thumb">${thumb}</div>
        <div class="body">
          <div class="meta">${SEM_CHIP[st]}<time datetime="${esc(dateOf(s) || '')}">${esc(s.eventDate || fmtDate(dateOf(s)))}</time></div>
          <h2>${esc(s.title)}</h2>
          ${s.description ? `<p class="desc">${esc(String(s.description).replace(/\s+/g, ' ').slice(0, 90))}${String(s.description).length > 90 ? '…' : ''}</p>` : ''}
        </div>
      </a>`;
  };
  // 開催予定（当日含む）と過去開催で上下に分ける
  const now = Date.now() - 24 * 3600 * 1000;
  const upcoming = items.filter(s => dateOf(s) && new Date(dateOf(s)).getTime() > now);
  const past = items.filter(s => !upcoming.includes(s));
  const upcomingHtml = upcoming.length
    ? `    <div class="col-grid">\n${upcoming.map(card).join('\n')}\n    </div>`
    : '    <p class="empty" style="padding:24px 0">現在、募集中のセミナーはありません。次回の開催をお待ちください。</p>';
  const pastHtml = past.length
    ? `    <div class="col-grid">\n${past.map(card).join('\n')}\n    </div>`
    : '';

  const body = `<div class="page-head" data-wm="SEMINAR">
  <div class="container">
    <p class="breadcrumb"><a href="../">HOME</a> ／ セミナー</p>
    <h1>イベント・セミナー</h1>
    <p class="lead">EHS法令対応・ISO・現場のAI活用をテーマに、実務に役立つセミナーを開催しています。</p>
  </div>
</div>
<main class="section">
  <div class="container">
    <div class="sem-section">
      <h2 class="sem-heading">開催予定・受付中のセミナー</h2>
${upcomingHtml}
    </div>
    ${past.length ? `<div class="sem-section">
      <h2 class="sem-heading">過去に開催したセミナー</h2>
${pastHtml}
    </div>` : ''}
  </div>
</main>`;
  return chrome(1, body, {
    title: 'イベント・セミナー - エイトス株式会社',
    description: 'エイトス株式会社が開催するイベント・セミナーの一覧です。EHS法令対応・ISO・現場のAI活用をテーマに実務に役立つ情報をお届けします。',
    canonicalPath: '/seminar/',
  });
}

function seminarPage(s) {
  const st = semStateOf(s);
  const cover = semCoverOf(s, 2);
  const yt = semYoutubeOf(s);
  const video = yt ? `<div class="video-wrap"><iframe src="https://www.youtube.com/embed/${esc(yt)}" title="${esc(s.title)}（アーカイブ）" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>` : '';
  const apply = st === 'open' && s.applyUrl ? `<div class="sem-apply"><a class="btn btn-primary" href="${esc(s.applyUrl)}" target="_blank" rel="noopener">セミナーに申し込む（無料）</a></div>` : '';
  const body = `<div class="page-head">
  <div class="container">
    <article class="post post-head-wrap" style="max-width:760px;margin:0 auto">
      <p class="breadcrumb"><a href="../../">HOME</a> ／ <a href="../">セミナー</a> ／ ${esc(s.title)}</p>
      <div class="meta">${SEM_CHIP[st]}<time datetime="${esc(dateOf(s) || '')}">${esc(s.eventDate || fmtDate(dateOf(s)))}</time></div>
      <div class="post-head"><h1>${esc(s.title)}</h1></div>
    </article>
  </div>
</div>
<main class="section">
  <div class="container">
    <article class="post">
      ${video || (cover ? `<div class="post-eyecatch"><img src="${esc(cover)}" alt=""></div>` : '')}
      ${s.info ? `<div class="sem-info">${s.info}</div>` : ''}
      ${apply}
      <div class="article-body">
${stripEmoji(bodyOf(s))}
      </div>
      ${apply}
      <div class="post-cta">
        <h2>サービスに関するご相談・資料請求</h2>
        <p>EHS法令調査の代行から、ISO対応、現場のナレッジマネジメントまで。まずはお気軽にご相談ください。</p>
        <div class="btns">
          <a class="btn btn-primary" href="../../document/">資料ダウンロード</a>
          <a class="btn btn-ghost" href="../../#contact">お問い合わせ</a>
        </div>
      </div>
      <a class="back-link" href="../">← セミナー一覧へ戻る</a>
    </article>
  </div>
</main>`;
  return chrome(2, body, {
    title: `${s.title} - セミナー｜エイトス株式会社`,
    description: s.description || `${s.title}｜エイトス株式会社のセミナー`,
    canonicalPath: `/seminar/${s.id}/`,
    ogType: 'article',
  });
}

// TOPのニュース欄（マーカー間）を最新5件で差し替え
async function injectTopNews(items) {
  const { readFile } = await import('node:fs/promises');
  const topPath = path.join(ROOT, 'index.html');
  let html;
  try { html = await readFile(topPath, 'utf-8'); } catch { return; }
  const S = '<!--NEWS_LIST_START-->', E = '<!--NEWS_LIST_END-->';
  const i = html.indexOf(S), j = html.indexOf(E);
  if (i < 0 || j < 0) return;
  const lis = items.slice(0, 5).map(n =>
    `        <li><span class="date">${fmtDate(dateOf(n))}</span><span class="body"><a href="news/${esc(n.id)}/">${esc(n.title)}</a></span></li>`
  ).join('\n');
  html = html.slice(0, i + S.length) + '\n' + lis + '\n' + html.slice(j);
  await writeFile(topPath, html);
  console.log(`[build-columns] TOPのニュース欄を更新（${Math.min(items.length, 5)}件）`);
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
  const all = await fetchAll(ENDPOINT);
  // APIキーの権限によっては下書きも返るため、公開済み（publishedAtあり）のみ採用
  // 2023年以前の記事は非表示（microCMSのデータは残す）
  articles = all.filter(a => a.publishedAt)
    .filter(a => new Date(dateOf(a)) >= new Date('2024-01-01T00:00:00Z'));
  articles.sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a)));
  console.log(`[build-columns] コラム: ${all.length} 件取得（公開済み ${articles.length} 件を掲載）`);
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

// ---- ニュースの生成 ----
if (!USE_SAMPLE && API_KEY) {
  try {
    const allNews = (await fetchAll(NEWS_ENDPOINT)).filter(n => n.publishedAt);
    allNews.sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a)));
    await rm(path.join(ROOT, 'news'), { recursive: true, force: true });
    await mkdir(path.join(ROOT, 'news'), { recursive: true });
    await writeFile(path.join(ROOT, 'news', 'index.html'), newsListPage(allNews));
    for (const n of allNews) {
      const dir = path.join(ROOT, 'news', n.id);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), newsPage(n));
    }
    await injectTopNews(allNews);
    console.log(`[build-columns] ニュース: ${allNews.length} 件生成`);
  } catch (e) {
    console.warn(`[build-columns] ニュース生成をスキップ: ${e.message}`);
  }

  // ---- セミナーの生成（microCMS優先、未登録分は移行データで補完） ----
  try {
    const { readFile, readdir } = await import('node:fs/promises');
    let fallback = [];
    try { fallback = JSON.parse(await readFile(path.join(ROOT, 'data', 'seminar-fallback.json'), 'utf-8')); } catch {}
    let cms = [];
    try {
      cms = (await fetchAll(SEMINAR_ENDPOINT)).filter(s => s.publishedAt);
    } catch (e) {
      console.warn(`[build-columns] セミナーAPIの取得に失敗（移行データのみで生成）: ${e.message}`);
    }
    // microCMSに同じIDがあればそちらを優先。中身が入っている（本文/開催日/動画あり）ものだけ採用
    const byId = new Map(fallback.map(s => [s.id, s]));
    let cmsUsed = 0;
    for (const s of cms) {
      if (bodyOf(s) || s.eventDate || s.youtube || s.description) { byId.set(s.id, s); cmsUsed++; }
    }
    const seminars = [...byId.values()].sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a)));

    // seminar/ 配下を再生成（手作りの archive/ は残す）
    const semRoot = path.join(ROOT, 'seminar');
    await mkdir(semRoot, { recursive: true });
    for (const entry of await readdir(semRoot, { withFileTypes: true })) {
      if (entry.name === 'archive') continue;
      await rm(path.join(semRoot, entry.name), { recursive: true, force: true });
    }
    await writeFile(path.join(semRoot, 'index.html'), seminarListPage(seminars));
    for (const s of seminars) {
      const dir = path.join(semRoot, s.id);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, 'index.html'), seminarPage(s));
    }
    console.log(`[build-columns] セミナー: ${seminars.length} 件生成（microCMS ${cmsUsed} 件 / 移行データ ${seminars.length - cmsUsed} 件）`);
  } catch (e) {
    console.warn(`[build-columns] セミナー生成をスキップ: ${e.message}`);
  }
}
