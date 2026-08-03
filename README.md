# Cayzen EHS Research サービスLP

エイトス株式会社のEHS法令・規制調査代行サービス「Cayzen EHS Research」のランディングページです。

## 構成

- `index.html` — LP本体（CSS・JS同梱の単一ファイル）
- `assets/logo.png` — サービスロゴ

## CTA（HubSpotフォーム）

HubSpot Forms (portalId: 8170895 / region: na2) を埋め込んでいます。

| CTA | formId | 設置場所 |
|---|---|---|
| 資料ダウンロード | `9af5e0d3-f32b-430f-a647-c4b3a56c343c` | `#cta` セクション「資料ダウンロード」タブ |
| トライアル | `5904d153-0e87-4de7-879a-18804b9ea649` | `#cta` セクション「無料トライアル」タブ |
| 問い合わせ | `de61c417-f176-4c76-af10-c59923cdfd79` | `#cta` セクション「お問い合わせ」タブ |

`#download` / `#trial` / `#contact` のURLハッシュで各タブを直接開けます（例: `index.html#trial`）。

## 公開方法

静的ファイルのみで動作します。GitHub Pages・Netlify・Vercel等にそのまま配置してください。
