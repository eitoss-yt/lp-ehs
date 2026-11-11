# PPWR適合宣言書 作成ガイド：制作データ

2026年11月に公開した「PPWR適合宣言書 作成ガイド」（資料）と、関連するコラム記事・資料DLページの制作データ。
社内向け。`marketing/` はサイトに公開されない。

## 公開中のもの（参考）

| 内容 | URL | リポジトリ内のファイル |
|---|---|---|
| コラム記事 | https://eitoss.com/column/202611-ppwr-declaration-of-conformity/ | `data/column-local.json`（本文）、`assets/column/202611-ppwr-declaration-of-conformity.jpg`（アイキャッチ） |
| 資料DLページ | https://eitoss.com/document/ppwr-declaration-of-conformity/ | `document/ppwr-declaration-of-conformity/index.html`、`assets/doc-ppwr-declaration-of-conformity.jpg` |
| 配布用の資料 | https://eitoss.com/assets/dl/PPWR_DoC_guide_eitoss.pdf ／ https://eitoss.com/assets/dl/PPWR_DoC_template_eitoss.docx | `assets/dl/` |
| 記事内の資料DLバナー | | `assets/column_bnr_ppwr_doc.jpg` |

HubSpot：フォーム `c4c81f83-8b66-48b3-a31b-b749afecf7eb`、お礼メール「お礼メール_資料送付_PPWR適合宣言書作成ガイド」。お礼メールの資料はHubSpotのファイルマネージャー（`DL` フォルダ）のファイルにリンクしている。

## このフォルダの中身

| フォルダ・ファイル | 内容 |
|---|---|
| `whitepaper/PPWR適合宣言書_作成ガイド_2026年11月版.docx` | 解説書のWord版（編集用、18ページ）。配布用のPDFはこれをPDFに書き出したもの |
| `manuscripts/article.md` | コラム記事の原稿（公開版の元。公開版は内部リンクなどを追記している） |
| `manuscripts/lp.md` | 資料DLページの原稿（ページ設定、一覧カード、フォーム、自動返信メール案） |
| `eyecatch/eyecatch.html` | コラムのアイキャッチのデザイン元（資料の表紙・テンプレート・中のページの画像を重ねる） |
| `figures/cover.html`、`figures/f1.html`〜`f5.html` | 解説書の表紙と図1〜図5のデザイン元（共通の色は `figures/common.css`） |
| `figures/banner.html` | 記事内の資料DLバナーのデザイン元 |
| `render.mjs` | 上のHTMLから画像を作り直すスクリプト |

## 画像を作り直す

リポジトリのルートで実行する。出力は `marketing/ppwr-declaration-of-conformity/out/`（gitには入らない）。

```bash
node marketing/ppwr-declaration-of-conformity/render.mjs eyecatch   # アイキャッチ（1280×720）
node marketing/ppwr-declaration-of-conformity/render.mjs banner     # 記事内バナー（1080×300）
node marketing/ppwr-declaration-of-conformity/render.mjs figures    # 解説書の表紙と図1〜5（2倍の解像度）
```

- 文字を変えるときは、各HTMLを直接編集する。色は資料に合わせて、紺 `#1C2770`、青 `#3355D1`、薄い青 `#EDF0FC`。
- アイキャッチとバナーに使っている資料の画像（`eyecatch/*.png`、`figures/images/*.png`）は、配布用のPDFとテンプレートの1ページ目などを書き出したもの。資料を改訂したら作り直す。
  ```bash
  pdftoppm -r 160 -png -singlefile -f 1 -l 1 assets/dl/PPWR_DoC_guide_eitoss.pdf marketing/ppwr-declaration-of-conformity/eyecatch/cover2
  pdftoppm -r 160 -png -singlefile -f 7 -l 7 assets/dl/PPWR_DoC_guide_eitoss.pdf marketing/ppwr-declaration-of-conformity/eyecatch/inner2
  ```
  テンプレート（Word）の1ページ目は、LibreOfficeでPDFに変換してから同じように書き出す（`soffice --headless --convert-to pdf`）。
- 作り直した画像は、`assets/` の同じ名前のファイルに上書きして、PRで反映する。

## 資料を改訂するとき

1. `whitepaper/` のWord版を編集し、PDFに書き出す（改ページの位置は、配布するPDFで確認する）。
2. `assets/dl/PPWR_DoC_guide_eitoss.pdf` と、HubSpotのファイルマネージャーの同じファイルを差し替える（お礼メールはHubSpot側のファイルにリンクしている）。
3. ページ数や内容が変わったら、資料DLページ、コラム記事、バナー、アイキャッチの記載も直す。

## デザインの決まりごと

- 片側だけに線を引く装飾（見出しの左線、カードの上線、項目ごとの下線など）は使わない。区切りは余白や背景色で表す（CLAUDE.md）。
- 解説書の章見出しは薄い青の帯、囲み記事は背景色だけで表している。
