import "server-only";
import type { Article, ListResponse, Regulation } from "./types";
import seedArticles from "@/content/seed/articles.json";
import seedRegulations from "@/content/seed/regulations.json";

const DOMAIN = process.env.MICROCMS_SERVICE_DOMAIN || "eitoss";
const API_KEY = process.env.MICROCMS_API_KEY || "";
export const ENDPOINTS = { articles: "ovs-articles", regulations: "ovs-regulations" } as const;
const REVALIDATE = 600; // 10分ごとに再生成（Webhookで即時反映も可）

/**
 * microCMS から全件取得。API未作成（404）や接続不可のときは
 * content/seed の初期コンテンツを返す（API作成前でもサイト確認ができるように）。
 */
async function getAll<T>(endpoint: string, fallback: T[], query = ""): Promise<{ items: T[]; source: "cms" | "seed" }> {
  if (process.env.USE_SEED === "1" || !API_KEY) return { items: fallback, source: "seed" };
  const items: T[] = [];
  try {
    for (let offset = 0; ; offset += 100) {
      const res = await fetch(
        `https://${DOMAIN}.microcms.io/api/v1/${endpoint}?limit=100&offset=${offset}&depth=1${query}`,
        { headers: { "X-MICROCMS-API-KEY": API_KEY }, next: { revalidate: REVALIDATE, tags: [endpoint] } },
      );
      if (!res.ok) throw new Error(`${endpoint}: ${res.status}`);
      const json = (await res.json()) as ListResponse<T>;
      items.push(...json.contents);
      if (offset + json.limit >= json.totalCount) break;
    }
    return { items, source: "cms" };
  } catch (e) {
    console.warn(`[microcms] ${(e as Error).message} → 初期コンテンツ（seed）を表示します`);
    return { items: fallback, source: "seed" };
  }
}

const byDateDesc = (a: Article, b: Article) => (a.date < b.date ? 1 : -1);

export async function getArticles(): Promise<Article[]> {
  const { items } = await getAll<Article>(ENDPOINTS.articles, seedArticles as unknown as Article[], "&orders=-date");
  const regs = await getRegulations();
  // seed 時は regulations が ID 文字列なので展開
  return items
    .map((a) => ({
      ...a,
      regulations: (a.regulations || [])
        .map((r) => (typeof r === "string" ? regs.find((x) => x.id === r) : r))
        .filter(Boolean) as Regulation[],
    }))
    .sort(byDateDesc);
}

export async function getArticle(id: string) {
  return (await getArticles()).find((a) => a.id === id);
}

export async function getRegulations(): Promise<Regulation[]> {
  const { items } = await getAll<Regulation>(ENDPOINTS.regulations, seedRegulations as unknown as Regulation[]);
  return items.sort((a, b) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
}

export async function getRegulation(id: string) {
  return (await getRegulations()).find((r) => r.id === id);
}
