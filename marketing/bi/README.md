# Meta広告ダッシュボード（Looker Studio）

対象レポート：https://datastudio.google.com/u/0/reporting/576eb474-8311-4db2-9457-0061a5ca3308/page/onBCG/edit

構成は「成果 → 原因の切り分け → 広告の疲れ」の順。リードの質（商談化率など）はHubSpotのデータがBigQueryに入ってから追加する。

## 手順1. BigQueryにビューを作る

1. 先に `marketing.meta_daily` の列名を確認する（BigQueryコンソールでテーブルを開き「スキーマ」タブ）
2. `meta_dashboard.sql` の先頭にある「列名の対応」と違う列名があれば、SQLの該当箇所を書き換える
3. `yuki.tomioka@eitoss.com` の権限で、SQLを上から順に実行する（0 → 1 → 2 → 3）

確認しておくこと：`marketing.meta_daily` が10/10時点のコピー（テーブル）の場合、それ以降のデータが入っていない。共有元 `data-mining-510816.share_eitoss.meta_daily` を参照するビューに置き換えるか、毎日コピーするスケジュールクエリを設定する。

| ビュー | 中身 | 使うページ |
|---|---|---|
| `v_meta_baseline` | 9月のテーマ別実績 | 比較線 |
| `v_meta_ad_daily` | 日付 × 広告の明細 | 1、3 |
| `v_meta_theme_daily` | 日付 × テーマの7日移動平均とアラート | 1、2 |
| `v_meta_budget_changes` | 予算を変更した日 | 2 |

## 手順2. データソースを追加する

レポートの編集画面で「データを追加」→「BigQuery」→「マイプロジェクト」→ `eitoss-marketing-510701` → `marketing` を選び、上の4つのビューを追加する。

`v_meta_ad_daily` には、次の計算フィールドを追加する（データソースの編集画面で「フィールドを追加」）。日ごとの比率を平均すると数字がずれるため、必ず合計どうしで割る。

| フィールド名 | 計算式 | 表示形式 |
|---|---|---|
| CPA | `SUM(spend) / SUM(leads)` | 通貨（円） |
| CPM | `SUM(spend) / SUM(impressions) * 1000` | 通貨（円） |
| CTR | `SUM(link_clicks) / SUM(impressions)` | パーセント |
| CPC | `SUM(spend) / SUM(link_clicks)` | 通貨（円） |
| リード率 | `SUM(leads) / SUM(link_clicks)` | パーセント |

## 手順3. ページを作る

### ページ1「サマリー」

- 上部に期間設定（初期値：今月）と、テーマ（`theme`）のプルダウン
- スコアカード5枚（データ：`v_meta_ad_daily`）：消化額、リード数、CPA、CTR、CPC
  - 各スコアカードで「比較期間：前の期間」をオンにする
- 表（データ：`v_meta_theme_daily`、期間：直近7日）：テーマ、`cpa_7d`、`baseline_cpa`、`alert_cpa`
  - `alert_cpa` が true の行を赤にする（条件付き書式）

### ページ2「CPAの推移と分解」

- 時系列グラフ：ディメンション `date`、内訳ディメンション `theme`、指標 `cpa_7d`
  - 9月ベースラインは参照線で表示（ISO 2,113円、EHS 5,282円）
  - 予算変更日（`v_meta_budget_changes` の日付）は、グラフ上のテキストで目印を置く
- 時系列グラフ3つを横に並べる：`cpm_7d`、`ctr_7d`、`lead_rate_7d`
  - CPAが悪化したとき、表示単価・クリック率・フォーム完了のどこが落ちたかをここで見る
- 表：日付、テーマ、`spend`、`leads`、`alert_zero_lead_day`（1日5,000円超の消化でリード0件の日）

### ページ3「広告別」

- 表（データ：`v_meta_ad_daily`）：`adset_name`、`ad_name`、消化額、インプレッション、CTR、CPA、最初の配信日（`MIN(date)`）
  - CTRにヒートマップの条件付き書式をつける
- 時系列グラフ：内訳ディメンション `ad_name`、指標 CTR（週単位）。配信開始の週から3割ほど落ちた広告は差し替えを検討する

## 後で追加するもの

- フリークエンシー：日次の値は足し合わせられないため、Metaから期間単位のリーチを取得してから追加する
- フォーム完了率：`meta_daily` にフォームを開いた数の列がある場合、`v_meta_ad_daily` の `lead_form_opens` を置き換える
- リードの質（有効リード率、商談化率、商談1件あたりの費用）：HubSpotのデータをBigQueryに連携してから追加する
