-- Meta広告ダッシュボード（Looker Studio）用のビュー
-- 実行：BigQueryコンソールで yuki.tomioka@eitoss.com の権限で上から順に実行する
-- 前提：marketing.meta_daily の列名は未確認。下の「列名の対応」を実際の列名に合わせてから実行する
--   date                 日付（DATE型）
--   adset_name           広告セット名
--   ad_name              広告名
--   spend                消化額（円）
--   impressions          インプレッション
--   inline_link_clicks   リンククリック
--   leads                リード数
--   lead_form_opens      フォームを開いた数（無ければ NULL のまま）

-- 0. 9月ベースライン（marketing/PROJECT.md の10/5のタスクで記録した値）
CREATE OR REPLACE VIEW `eitoss-marketing-510701.marketing.v_meta_baseline` AS
SELECT * FROM UNNEST([
  STRUCT('ISO' AS theme, 50702 AS spend, 18580 AS impressions, 168 AS link_clicks, 24 AS leads, 2113 AS cpa),
  STRUCT('EHS', 58102, 13917, 120, 11, 5282)
]);

-- 1. 日次の明細（広告単位）。テーマは広告セット名から判定する
CREATE OR REPLACE VIEW `eitoss-marketing-510701.marketing.v_meta_ad_daily` AS
SELECT
  date,
  CASE
    WHEN adset_name LIKE '%ISO%' THEN 'ISO'
    WHEN adset_name LIKE '%EHS%' THEN 'EHS'
    ELSE 'その他'
  END AS theme,
  adset_name,
  ad_name,
  SUM(spend) AS spend,
  SUM(impressions) AS impressions,
  SUM(inline_link_clicks) AS link_clicks,
  SUM(leads) AS leads,
  CAST(NULL AS INT64) AS lead_form_opens  -- 列があれば SUM(lead_form_opens) に置き換える
FROM `eitoss-marketing-510701.marketing.meta_daily`
GROUP BY date, theme, adset_name, ad_name;

-- 2. テーマ別の日次と7日移動平均。リードが週数件のため、判断は7日の値で行う
CREATE OR REPLACE VIEW `eitoss-marketing-510701.marketing.v_meta_theme_daily` AS
WITH d AS (
  SELECT
    date,
    theme,
    SUM(spend) AS spend,
    SUM(impressions) AS impressions,
    SUM(link_clicks) AS link_clicks,
    SUM(leads) AS leads
  FROM `eitoss-marketing-510701.marketing.v_meta_ad_daily`
  GROUP BY date, theme
),
w AS (
  SELECT
    *,
    SUM(spend) OVER win AS spend_7d,
    SUM(impressions) OVER win AS impressions_7d,
    SUM(link_clicks) OVER win AS link_clicks_7d,
    SUM(leads) OVER win AS leads_7d
  FROM d
  WINDOW win AS (PARTITION BY theme ORDER BY UNIX_DATE(date) RANGE BETWEEN 6 PRECEDING AND CURRENT ROW)
)
SELECT
  w.*,
  SAFE_DIVIDE(spend_7d, leads_7d) AS cpa_7d,
  SAFE_DIVIDE(spend_7d, impressions_7d) * 1000 AS cpm_7d,
  SAFE_DIVIDE(link_clicks_7d, impressions_7d) AS ctr_7d,
  SAFE_DIVIDE(spend_7d, link_clicks_7d) AS cpc_7d,
  SAFE_DIVIDE(leads_7d, link_clicks_7d) AS lead_rate_7d,
  b.cpa AS baseline_cpa,
  -- アラート：7日CPAがベースラインの1.5倍超、または1日5,000円超の消化でリード0件
  (SAFE_DIVIDE(spend_7d, leads_7d) > b.cpa * 1.5 OR (leads_7d = 0 AND spend_7d > 0)) AS alert_cpa,
  (w.spend > 5000 AND w.leads = 0) AS alert_zero_lead_day
FROM w
LEFT JOIN `eitoss-marketing-510701.marketing.v_meta_baseline` AS b USING (theme);

-- 3. 予算変更日（グラフの目印に使う）。変更したら行を追加する
CREATE OR REPLACE VIEW `eitoss-marketing-510701.marketing.v_meta_budget_changes` AS
SELECT * FROM UNNEST([
  -- 10/28の判定で増額するテーマが決まったら、theme を 'ISO' または 'EHS' に書き換える
  STRUCT(DATE '2026-10-29' AS date, '未定' AS theme, '+20%（予定）' AS note),
  STRUCT(DATE '2026-11-05', '未定', '+20%（再評価で悪化がなければ）')
]);
