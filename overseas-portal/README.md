# 海外法規制ポータル（Cayzen EHS Research｜海外法規制）

海外の法改正情報・解説コラム・ウェビナー案内・お役立ち資料をまとめて発信するポータルサイトです。
コンテンツは **microCMS** で管理し、ブログのように記事を追加するだけでサイトに反映されます。

- フレームワーク：Next.js 15（App Router）/ TypeScript / 素のCSS
- CMS：microCMS（サービスID `eitoss`）。既存の `news` / `categories` には触れず、専用APIを2つ新設します
- 表示更新：10分ごとの自動再生成（ISR）＋ Webhook による即時反映
- 公開URL（仮）：https://ehs-overseas-portal.vercel.app （noindex。正式公開時に `SITE_PUBLIC=1`）

## リポジトリ内での位置づけ

- コーポレートサイト（`lp-ehs` リポジトリ直下の静的サイト）とは別のアプリです。このフォルダ `overseas-portal/` だけで完結します。
- リポジトリ直下はそのまま公開されるため、`overseas-portal` は `.vercelignore` で静的サイトの公開対象から外しています。
- Vercelでは専用プロジェクト `ehs-overseas-portal` で動かします。GitHub連携する場合は、プロジェクトの Settings > General > Root Directory を `overseas-portal` に設定してください。

## ページ構成

| URL | 内容 |
|---|---|
| `/` | トップ：ピックアップ、注目の規制、新着情報（種類・地域・分野で絞り込み）、ウェビナー、規制動向ウォッチ、サービス案内 |
| `/articles` | 記事一覧（`?type=update/column/seminar/download/watch/info`、`?region=eu`、`?field=化学物質`、`?q=キーワード`） |
| `/articles/[id]` | 記事詳細（セミナーは日時・申込ボタン、資料はDLボタン、ウォッチは概要＋定期配信への導線） |
| `/regulations` | 規制一覧（地域別） |
| `/regulations/[id]` | 規制詳細（概要／主な要件／誰に何が求められるか／当社の支援／関連記事） |
| `/seminars` | ウェビナー・セミナー（開催予定／過去の開催） |
| `/api/revalidate` | microCMS Webhook 用（即時反映） |

## セットアップ

### 1. microCMS に API を2つ作成（管理画面で実施）

API の作成は管理画面からのみ可能です。**規制 → 記事の順**に作成してください（記事が規制を参照するため）。

| 順 | API名 | エンドポイント | 型 | スキーマ |
|---|---|---|---|---|
| 1 | 海外法規制：規制 | `ovs-regulations` | リスト形式 | `microcms/api-schema-ovs-regulations.json` |
| 2 | 海外法規制：記事 | `ovs-articles` | リスト形式 | `microcms/api-schema-ovs-articles.json` |

API作成画面の「スキーマのインポート」で上記JSONを読み込めます。
インポート後、記事APIの「関連する規制（regulations）」フィールドの参照先が `ovs-regulations` になっているか確認してください。

> セレクトの選択肢（記事の種類・地域・分野・ステータス）は `lib/constants.ts` と一致させています。選択肢を増やす場合は両方を更新してください。

### 2. APIキー

管理画面「権限管理」で、上記2APIに **GET**（サイト表示用）を付けたキーを発行します。初期コンテンツ投入時は **PUT** 権限も必要です。

### 3. 初期コンテンツの投入

```bash
cp .env.example .env.local   # MICROCMS_API_KEY を記入
npm install
npm run seed                 # 下書きとして投入（管理画面で確認して公開）
# npm run seed -- --publish  # そのまま公開する場合
```

### 4. 起動・デプロイ

```bash
npm run dev     # http://localhost:3000
npm run build && npm start
```

Vercel 等にデプロイし、環境変数 `MICROCMS_SERVICE_DOMAIN` / `MICROCMS_API_KEY` / `REVALIDATE_SECRET` を設定します。
microCMS の「API設定 → Webhook → カスタム通知」に `https://<サイト>/api/revalidate?secret=<REVALIDATE_SECRET>` を登録すると、公開と同時に反映されます。

> API未作成・接続できない場合は `content/seed/` の初期コンテンツで表示されます（作成前の確認用）。`USE_SEED=1` で強制的にseed表示にできます。

## 記事の投稿方法（運用担当者向け）

1. microCMS「海外法規制：記事」→「追加」
2. 必須：タイトル、記事の種類、掲載日。一覧に出す「概要」も入力を推奨
3. 地域・分野（複数可）、関連する規制を選ぶと、絞り込み・規制ページの「関連する記事」に自動で表示
4. 種類ごとの追加項目
   - **ウェビナー・セミナー**：開始/終了日時、会場、申込URL（開催日を過ぎると自動で「受付終了」）
   - **お役立ち資料**：ダウンロード・フォームURL
   - **規制動向ウォッチ**：概要のみ表示され、本文の代わりに定期配信サービスへの導線を表示
5. 「トップのピックアップに表示」をONにすると、トップの上部カード（最大3件）に表示

## 初期コンテンツ（content/seed）

規制6件（PPWR / EUDR / CBAM / REACH / CSRD・CSDDD / 電池規則）、記事13件（法改正情報4・解説コラム3・ウェビナー2・資料1・ウォッチ2・お知らせ1）。
公開前に `docs/content-review.md` のチェック項目を確認してください。
