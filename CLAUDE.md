# CLAUDE.md

## マーケティング施策の共有

- マーケティング施策の正本は `marketing/PROJECT.md`。「admin | Web/LP」「admin | HubSpot clone」「admin | Adplanners」の3スレッドで共有する。
- ユーザーが「ネクストアクション考えて」と言ったら、まず `git fetch origin main` で最新を取得し、`marketing/PROJECT.md` のスケジュール・判定基準・未決事項・進捗ログを読み、今日の日付時点で次にやるべきことを担当スレッド別に提案する。
- 進捗や決定事項が出たら `marketing/PROJECT.md` の該当箇所と進捗ログを更新し、main に反映する。
- `marketing/` と `CLAUDE.md` は `.vercelignore` で公開対象から外している。サイトはリポジトリ直下をそのまま公開するため、社内向けの情報は必ずこの2つのどちらかに置く。

## ユーザーの指定

- GitHub上の場所を案内するときは、必ず完全なURLで書く。
- 日本語の文章で「──」などのダッシュ記号を使わない。
- microCMSのAPIキーなどの認証情報は、リポジトリにコミットしない。
- www.eitoss.com は顧客向けSaaS管理画面のため、DNS設定に触れない。
