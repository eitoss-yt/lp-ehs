---
name: add-document
description: サイトの資料一覧（資料ダウンロード /document/ またはお役立ち資料 /resources/）に新しい資料を掲載する。HubSpotにアップロードした資料のURLを受け取り、資料DLページ・一覧のカード・サムネイル・sitemapを作成し、HubSpotフォームを作るためのClaude in Chrome用の指示書を出力する。フォームIDを受け取ったら設定して公開する。「資料を掲載したい」「資料DLページを作って」「資料一覧に追加」「新しい資料をサイトに載せて」と言われたら使う。
---

# 新しい資料を資料一覧に掲載する

## 全体の流れ

```
ユーザー：資料をHubSpotのファイルマネージャーにアップロードし、URLを共有
  ↓
このスキル（前半）：資料を読み、資料DLページ・カード・サムネイル・sitemapを作成
                    → PR作成（フォームIDは仮置き）
                    → Claude in Chrome用の指示書を出力
  ↓
ユーザー：指示書をClaude in Chromeに渡し、HubSpotでフォームとお礼メールを作成
          → フォームIDを共有
  ↓
このスキル（後半）：フォームIDを設定 → 確認 → マージして公開 → 進捗ログ更新
```

既存の資料追加（PR #124、#127）と同じく、変更するのは次の4つだけ。これ以外のファイルは触らない。

| ファイル | 内容 |
|---|---|
| `document/<slug>/index.html` | 資料DLページ（新規） |
| `assets/doc-<slug>.jpg` | サムネイル（新規、1280×720） |
| `document/index.html` または `resources/index.html` | 一覧のカード（追加） |
| `sitemap.xml` | 1行追加 |

あわせて、社内向けの `marketing/hubspot-form-<slug>.md`（Chrome用の指示書）と `marketing/PROJECT.md`（進捗ログ）を更新する。

## 守ること（CLAUDE.md より）

- GitHub上の場所を案内するときは、完全なURLで書く。
- 日本語の文章でダッシュ記号（全角の長い横線）を使わない。
- 片側だけに線を引く装飾（見出しの左線、カードの上線など）を新しく作らない。既存ページの見た目はそのまま使う。
- 認証情報をコミットしない。社内向けの情報は `marketing/` に置く（`marketing/` と `.claude/` はサイトに公開されない）。

## 前半：資料DLページを作る

### STEP 1：受け取る情報を確認する

ユーザーから次を受け取る。足りないものだけ質問する（AskUserQuestion を使い、まとめて1回で聞く）。

| 情報 | 必須 | 補足 |
|---|---|---|
| HubSpotのファイルURL | 必須 | 例：`https://hs-8170895.f.hubspotstarter-na2.net/hubfs/8170895/DL/xxx.pdf` |
| 掲載先 | 必須 | サービス資料なら「資料ダウンロード」（`/document/`）、実務ガイドなどのお役立ち資料なら「お役立ち資料」（`/resources/`）。迷ったら資料の中身から推測して確認する |
| URLの名前（slug） | 任意 | 英小文字とハイフン。未指定なら資料の内容から提案する（例：`overseas-regulation`）。`document/` に同名のフォルダがないことを確認する |
| 資料名・ねらい | 任意 | 未指定なら資料から読み取る |

### STEP 2：資料を読む

```bash
mkdir -p "$SCRATCH/doc" && curl -sL -o "$SCRATCH/doc/source.pdf" "<ファイルURL>"
pdfinfo "$SCRATCH/doc/source.pdf"
pdftotext -layout "$SCRATCH/doc/source.pdf" - | head -400
```

`$SCRATCH` はセッションのスクラッチパッド。PDFはリポジトリに置かない（配布はHubSpotのURLで行う）。
資料から次を読み取る：正式な資料名、対象読者、章立て、ページ数、資料の種類（サービス資料／実務ガイド）。

### STEP 3：ページの文面を作る

既存のページと同じ構成・文量にそろえる。下書きをユーザーに見せて確認を取ってから、STEP 4 に進む。

| 項目 | 書き方 |
|---|---|
| H1（資料名） | 「」付き。サービス資料は `「Cayzen EHS Research」○○ サービス資料`、お役立ち資料は `「○○」` |
| リード（`.lead`） | 1行。対象や副題 |
| 説明（`.desc`） | 2〜4文。何の資料か、何がまとまっているか、ページ数 |
| この資料でわかること | 5〜6項目（`<ol>`）。資料の章立てに沿って、具体的に |
| こんな方におすすめ | 4項目（`<ul>`）。読者の状況で書く |
| title | `<H1と同じ資料名> - 資料ダウンロード｜エイトス株式会社`（お役立ち資料は資料名の後に副題を付けてよい） |
| meta description | 100〜120字。資料の中身と「無料でダウンロードいただけます」 |
| 一覧カード | 見出し（`h3`）と、1行の補足（`.sub`） |

参考にする既存ページ：
- サービス資料：https://github.com/eitoss-yt/lp-ehs/blob/main/document/overseas-regulation/index.html
- お役立ち資料：https://github.com/eitoss-yt/lp-ehs/blob/main/document/ppwr/index.html

### STEP 4：ファイルを作る

1. **作業ブランチ**：`git fetch origin main` のあと、main から `claude/add-document-<slug>` を作る。
2. **サムネイル**：
   ```bash
   node .claude/skills/add-document/make-thumbnail.mjs "$SCRATCH/doc/source.pdf" assets/doc-<slug>.jpg [中のページ番号] [バッジの文言]
   ```
   横長のPDFは表紙を青緑の枠に、縦長のPDFは表紙と中のページを重ねた画像になる。出力を Read で開いて確認する。表紙の画像が別にあるとユーザーが言った場合は、それを使う。
3. **資料DLページ**：掲載先に合わせて、上の参考ページを `document/<slug>/index.html` にコピーし、次の箇所だけを書き換える。ヘッダー・フッター・CSS・計測コードは触らない。
   - `<title>`、`meta description`、`og:title`、`og:description`
   - `canonical` と `og:url`（`https://eitoss.com/document/<slug>/`）
   - パンくず、H1、`.lead`
   - パンくずの2番目と、ページ下の戻るリンクを掲載先の一覧に合わせる。資料ダウンロードは `<a href="../">資料ダウンロード</a>` と `← 資料ダウンロード一覧へ戻る`（`href="../"`）、お役立ち資料は `<a href="../../resources/">お役立ち資料</a>` と `← お役立ち資料一覧へ戻る`（`href="../../resources/"`）
   - `.cover` の画像（`../../assets/doc-<slug>.jpg`）と alt
   - `.desc`、「この資料でわかること」、「こんな方におすすめ」
   - コピー元に、その資料だけのリンクや段落があれば削除する
   - `hbspt.forms.create` の `formId` を `"REPLACE_WITH_HUBSPOT_FORM_ID"` にする
4. **一覧のカード**：掲載先の一覧（`document/index.html` または `resources/index.html`）の `doc-grid` の最後に、既存のカードと同じ形で追加する（リンクは `document/index.html` なら `<slug>/`、`resources/index.html` なら `../document/<slug>/`）。並び順の指定があればそれに従う。
5. **sitemap**：`sitemap.xml` の `/document/` の行の並びに、`<url><loc>https://eitoss.com/document/<slug>/</loc><lastmod>今日の日付</lastmod></url>` を1行追加する。sitemap全体の再生成（`scripts/build-columns.mjs`）はしない。

### STEP 5：表示を確認する

```bash
python3 -m http.server 8765 --bind 127.0.0.1   # run_in_background で起動
```

Playwright で `http://127.0.0.1:8765/document/<slug>/` と一覧ページを、PC（幅1280）とスマホ（幅390）でスクリーンショットし、Read で確認する。確認したらサーバーを止める。フォームは仮のIDのため表示されなくてよい。

### STEP 6：Claude in Chrome 用の指示書を作る

`.claude/skills/add-document/chrome-hubspot-instructions.md` の「---」より下をひな形にして、`{{…}}` をすべて埋め、`marketing/hubspot-form-<slug>.md` に保存する。

| 置き換え | 値 |
|---|---|
| `{{資料名}}` | H1の資料名（「」を含む） |
| `{{ファイルURL}}` | STEP 1 のHubSpotのファイルURL |
| `{{slug}}` | slug |
| `{{複製元フォーム名}}` `{{複製元フォームID}}` | 下の表から、掲載先に合う既存の資料 |
| `{{複製元お礼メール名}}` | 同上 |
| `{{フォーム名}}` | `資料DL_<資料の短い名前>` |
| `{{お礼メール名}}` | `お礼メール_資料送付_<資料の短い名前>` |
| `{{件名}}` | `【資料送付】<資料名>資料（エイトス）`（既存例：`【資料送付】「Cayzen EHS Research」PPWR対応支援 サービス資料（エイトス）`） |
| `{{プレビューテキスト}}` | 資料の内容を30〜50字で |
| `{{ワークフロー名}}` | `資料送付_<資料の短い名前>` |

複製元にする既存の資料（新しい資料を追加したら、この表も更新する）：

| 掲載先 | 資料 | フォームID | お礼メール |
|---|---|---|---|
| 資料ダウンロード（サービス資料） | 「Cayzen EHS Research」海外法規制対応支援 サービス資料 | `615bad3a-9072-45e5-8e0c-b0db729fece6` | お礼メール_資料送付_PPWR対応支援 を推奨（海外法規制用があればそちら） |
| お役立ち資料 | 「EU PPWR 対応 要点まとめ」 | `83a73b1f-76df-4e38-b2b6-b19bd37bc567` | お礼メール_資料送付_PPWR |

最新のフォームIDは、各ページの `hbspt.forms.create` の `formId` で確認できる。

`{{` が残っていないことを確認する（`grep -n "{{" marketing/hubspot-form-<slug>.md`）。

### STEP 7：コミットしてPRを作る

1. `marketing/PROJECT.md` の進捗ログの先頭に、日付・内容・PR番号・残り（フォームID待ち）を「（Web/LP）」付きで追記する。
2. コミットメッセージは日本語で、変更内容を箇条書きにする。
3. `git push -u origin claude/add-document-<slug>` のあと、REST API でPRを作る（`gh pr create` は使えない）。
   ```bash
   gh api repos/eitoss-yt/lp-ehs/pulls -f title="資料DLに<資料名>を追加" -f head="claude/add-document-<slug>" -f base="main" -F body=@<本文ファイル>
   ```
   本文には、変更内容、マージ前に必要なこと（フォームIDの設定）、Vercelのプレビューで確認できるURLを書く。
4. Vercelのプレビュー（`https://lp-ehs-git-<ブランチ名のスラッシュをハイフンにしたもの>-eitoss-yts-projects.vercel.app/document/<slug>/`）が成功したことを、コミットのステータスで確認する。

### STEP 8：ユーザーに渡す

次をまとめて伝える。

- PRとプレビューのURL
- サムネイル画像（SendUserFile で送る）
- Claude in Chrome用の指示書（SendUserFile で送り、GitHubのURLも書く）。「この内容をClaude in Chromeに貼り付けて実行し、報告されたフォームIDを共有してください」と案内する

## 後半：フォームIDを受け取って公開する

ユーザーからフォームID（Claude in Chromeの報告）を受け取ったら：

1. 報告を確認する。お礼メールが未公開、自動送信がオフ、テストで届かなかった、のいずれかがあれば、公開せずにユーザーに伝える。
2. `document/<slug>/index.html` の `"REPLACE_WITH_HUBSPOT_FORM_ID"` をフォームIDに置き換えてコミット・プッシュする（既存例：「海外法規制対応支援の資料DLページにHubSpotフォームIDを設定」）。
3. プレビューでフォームが表示されることを確認する。
4. ユーザーに「マージして公開してよいか」を確認してから、PRをマージする（`gh api -X PUT repos/eitoss-yt/lp-ehs/pulls/<番号>/merge`）。
5. 本番（`https://eitoss.com/document/<slug>/`）が表示されることを確認する（`curl -s -o /dev/null -w "%{http_code}"`）。
6. `marketing/PROJECT.md` の進捗ログに「PR #<番号> をマージし本番反映」を追記して main に反映する。
7. 上の「複製元にする既存の資料」の表を更新すべきか検討する（同じ掲載先の最新の資料にそろえる）。
8. 残りの作業（Search Consoleでのインデックス登録のリクエスト、関連するコラムやサービスページからの導線など）をユーザーに伝える。
