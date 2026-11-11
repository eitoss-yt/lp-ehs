// 初期コンテンツ（content/seed）を microCMS に投入します。
// 使い方:
//   MICROCMS_SERVICE_DOMAIN=eitoss MICROCMS_API_KEY=<書き込み権限のあるキー> npm run seed            # 下書きとして投入
//   MICROCMS_SERVICE_DOMAIN=eitoss MICROCMS_API_KEY=<...> npm run seed -- --publish                # 公開状態で投入
// 同じIDで PUT するため、再実行すると上書き（冪等）になります。
import { readFile } from "node:fs/promises";

const DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN || "eitoss";
const KEY = process.env.MICROCMS_API_KEY;
const publish = process.argv.includes("--publish");
const dryRun = process.argv.includes("--dry-run");
if (!KEY && !dryRun) {
  console.error("MICROCMS_API_KEY を設定してください");
  process.exit(1);
}

const load = async (f) => JSON.parse(await readFile(new URL(`../content/seed/${f}`, import.meta.url), "utf8"));
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => k !== "id" && v !== undefined && v !== null));

async function put(endpoint, item) {
  const url = `https://${DOMAIN}.microcms.io/api/v1/${endpoint}/${item.id}${publish ? "" : "?status=draft"}`;
  if (dryRun) return console.log("[dry-run]", url);
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "X-MICROCMS-API-KEY": KEY },
    body: JSON.stringify(clean(item)),
  });
  const text = await res.text();
  console.log(`${res.ok ? "OK " : "NG "} ${res.status} ${endpoint}/${item.id} ${res.ok ? "" : text}`);
  if (!res.ok) process.exitCode = 1;
}

// 参照先（規制）→ 記事 の順で投入
for (const r of await load("regulations.json")) await put("ovs-regulations", r);
for (const a of await load("articles.json")) await put("ovs-articles", a);
console.log(publish ? "公開状態で投入しました" : "下書きとして投入しました（管理画面で確認のうえ公開してください）");
