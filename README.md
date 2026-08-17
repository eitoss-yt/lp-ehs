# エイトス株式会社 Webサイト

コーポレートTOPページと、Cayzenシリーズ2サービスのランディングページです。

## 構成

- `index.html` — コーポレートTOPページ（公開URL: `/`。2サービスへの入口・ニュース・ビジョン・会社概要・問い合わせ）
- `cayzen/ehsresearch/index.html` — Cayzen EHS Research LP（公開URL: `/cayzen/ehsresearch/`）
- `cayzen/ehsresearch/assets/` — 同LP用の画像（ロゴ・導入企業ロゴ・イラスト）
- `cayzen/knowledgemanagement/index.html` — Cayzen ナレッジマネジメントLP（公開URL: `/cayzen/knowledgemanagement/`）
- `cayzen/knowledgemanagement/assets/` — 同LP用の画像（プロダクト画面・導入企業ロゴ）
- `cayzen/iso/index.html` — Cayzen ISOサポートLP（公開URL: `/cayzen/iso/`）
- `assets/` — TOPページ用の画像（導入企業ロゴ・サービスカードのサムネイル）

導入企業ロゴを追加する際は、各ページの `assets/` に画像を置いて `.logo-track` に `<li>` を追記してください。

## ファーストビュー

2カラム構成（左: コピー+CTA / 右: YouTube動画）。動画は仮で `https://youtu.be/iRCrhDVNWnI` を埋め込み中。完成版に差し替える際は `index.html` 内の `youtube.com/embed/iRCrhDVNWnI` のID部分を変更してください。

## CTA（HubSpotフォーム）

HubSpot Forms (portalId: 8170895 / region: na2) を埋め込んでいます。

| CTA | formId | 設置場所 |
|---|---|---|
| 資料ダウンロード | `9af5e0d3-f32b-430f-a647-c4b3a56c343c` | `#cta` セクション「資料ダウンロード」タブ |
| トライアル | `5904d153-0e87-4de7-879a-18804b9ea649` | `#cta` セクション「無料トライアル」タブ |
| 問い合わせ | `de61c417-f176-4c76-af10-c59923cdfd79` | `#cta` セクション「お問い合わせ」タブ |

`#download` / `#trial` / `#contact` のURLハッシュで各タブを直接開けます（例: `index.html#trial`）。

## コラム（microCMS連携）

コラムは microCMS（サービスID: `eitoss`）で記事を管理し、ビルド時に `scripts/build-columns.mjs` が `/column/` 配下の静的HTMLを生成します（生成物はコミットしない。`.gitignore`済み）。

### microCMS側のAPI設定

- API名: コラム ／ エンドポイント: `columns` ／ 型: リスト形式
- フィールド（フィールドIDは完全一致で作成すること）:

| フィールドID | 表示名 | 種類 | 必須 |
|---|---|---|---|
| `title` | タイトル | テキストフィールド | ○ |
| `description` | 概要（一覧・meta description用） | テキストエリア | ○ |
| `eyecatch` | アイキャッチ画像 | 画像 | − |
| `category` | カテゴリ | セレクトフィールド | − |
| `body` | 本文 | リッチエディタ | ○ |

- カテゴリの選択肢（推奨）: `環境・労働安全衛生（EHS）` / `ISO` / `ナレッジマネジメント` / `お知らせ`
- 記事URLのスラッグには microCMS の「コンテンツID」がそのまま使われます（例: コンテンツID `ehs-law-2026-1h` → `/column/ehs-law-2026-1h/`）。公開前にコンテンツIDを英数字に編集してください。

### Vercel側の設定

1. 環境変数 `MICROCMS_API_KEY` に microCMS のコンテンツAPIキー（管理画面 > 権限管理 > APIキー）を設定
2. `vercel.json` の `buildCommand` でビルド時に記事を取得（設定済み）
3. Vercelの Settings > Git > Deploy Hooks でフックURLを作成し、microCMSの API設定 > Webhook（カスタム通知）に登録 → 記事の公開・更新・削除で自動再デプロイ

### ローカル確認

```
node scripts/build-columns.mjs --sample   # サンプル記事でプレビュー
MICROCMS_API_KEY=xxx node scripts/build-columns.mjs   # 本番データで生成
```

## 公開方法

静的ファイルのみで動作します。Vercelに接続すると `vercel.json` の設定でコラムのビルドまで自動で行われます（コラム以外は静的ファイルのまま）。
