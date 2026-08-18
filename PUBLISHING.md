# コラム公開フローの設定手順（microCMS → サイト自動反映）

コードの実装は完了しています。以下の3ステップを設定すると、
**microCMSで記事を「公開」→ 数分後にサイトの `/column/` に自動反映** されます。

## 全体像

```
microCMSで記事を公開
   └─ Webhook ──▶ Vercel Deploy Hook（再ビルドを起動）
                     └─ vercel.json の buildCommand が scripts/build-columns.mjs を実行
                          └─ microCMS APIから全記事を取得し /column/ のHTMLを生成 → デプロイ
```

## STEP 1: VercelにAPIキーを設定（初回のみ）

1. microCMS管理画面 → 左下の歯車（サービス設定）→ **APIキー** → 「コンテンツAPIキー」をコピー
2. Vercelのプロジェクト → **Settings → Environment Variables** で追加:
   - Key: `MICROCMS_API_KEY`
   - Value: コピーしたキー
   - Environment: Production / Preview / Development すべてチェック
3. 追加後、**Deployments → 最新デプロイ → Redeploy** で一度再デプロイ
   （この時点で `/column/` が表示されるようになります。記事0件なら「準備中」表示）

## STEP 2: Vercel Deploy Hookを作成（初回のみ）

1. Vercelのプロジェクト → **Settings → Git → Deploy Hooks**
2. Name: `microcms` ／ Branch: `main`（本番ブランチ）で **Create Hook**
3. 発行されたURL（`https://api.vercel.com/v1/integrations/deploy/...`）をコピー

## STEP 3: microCMSにWebhookを登録（初回のみ）

1. microCMS管理画面 → **ブログ（blogs）API → API設定 → Webhook**
2. **「カスタム通知」** を選択 → URLにSTEP 2のURLを貼り付け
3. 通知タイミングは既定のまま（公開・更新・非公開・削除）で保存

## 日々の記事公開（設定完了後はこれだけ）

1. microCMSの「ブログ」→ **追加** で記事を書く
2. 右上の **コンテンツID** を英数字に編集（例: `ehs-law-2026-08`）→ これがURLになります
   （公開URL: `https://サイトのドメイン/column/コンテンツID/`）
3. **公開** ボタンを押す → 数分でサイトに反映（一覧・記事ページ・TOPのナビから到達可能）

## うまくいかないとき

- Vercelの **Deployments → 失敗したビルド → Building ログ** を確認してください。
  `build-columns.mjs` が原因の場合、日本語で原因を出力します:
  - 「APIキーが拒否されました」→ STEP 1のキーを確認
  - 「エンドポイント blogs が存在するか確認」→ microCMSのAPI名を確認
  - 一時的な通信エラーは自動で3回までリトライします
- ローカル確認: `node scripts/build-columns.mjs --sample`（サンプル記事で生成）
