import Link from "next/link";
import type { Metadata } from "next";
import { getArticles, getRegulations } from "@/lib/microcms";
import { ARTICLE_TYPES, FIELDS, REGIONS, regionByCode, typeBySlug } from "@/lib/constants";
import { ArticleList } from "@/components/ArticleList";
import Sidebar from "@/components/Sidebar";
import { ContactBand } from "@/components/Footer";

export const revalidate = 600;
const PER = 10;
type SP = Promise<{ type?: string; region?: string; field?: string; q?: string; page?: string }>;

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const t = typeBySlug(sp.type);
  return { title: t ? t.value : "記事一覧" };
}

export default async function ArticlesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [all, regs] = await Promise.all([getArticles(), getRegulations()]);
  const t = typeBySlug(sp.type);
  const r = regionByCode(sp.region);
  const f = FIELDS.find((x) => x === sp.field);
  const q = (sp.q || "").trim();
  const hit = all.filter(
    (a) =>
      (!t || a.type?.includes(t.value)) &&
      (!r || a.regions?.includes(r.value)) &&
      (!f || a.fields?.includes(f)) &&
      (!q || [a.title, a.summary, a.body].join(" ").toLowerCase().includes(q.toLowerCase())),
  );
  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(hit.length / PER));
  const href = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { type: sp.type, region: sp.region, field: sp.field, q: sp.q, ...patch };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return `/articles${s ? `?${s}` : ""}`;
  };
  const heading = [r?.label, f, t?.value ?? "記事一覧"].filter(Boolean).join("｜");
  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="crumbs"><Link href="/">ホーム</Link> ＞ 記事一覧</div>
          <h1>{q ? `「${q}」の検索結果` : heading}</h1>
          <p>海外の環境・化学物質・製品規制の改正情報、解説、ウェビナー・資料のご案内</p>
        </div>
      </section>
      <div className="wrap main">
        <div>
          <div className="filters">
            <div className="frow"><b>種類</b><div className="chips">
              <Link className={`chip ${!t ? "on" : ""}`} href={href({ type: undefined, page: undefined })}>すべて</Link>
              {ARTICLE_TYPES.map((x) => (
                <Link key={x.slug} className={`chip ${t?.slug === x.slug ? "on" : ""}`} href={href({ type: x.slug, page: undefined })}>{x.value}</Link>
              ))}
            </div></div>
            <div className="frow"><b>地域</b><div className="chips">
              <Link className={`chip ${!r ? "on" : ""}`} href={href({ region: undefined, page: undefined })}>すべて</Link>
              {REGIONS.map((x) => (
                <Link key={x.code} className={`chip ${r?.code === x.code ? "on" : ""}`} href={href({ region: x.code.toLowerCase(), page: undefined })}>{x.value}</Link>
              ))}
            </div></div>
            <div className="frow"><b>分野</b><div className="chips">
              <Link className={`chip ${!f ? "on" : ""}`} href={href({ field: undefined, page: undefined })}>すべて</Link>
              {FIELDS.map((x) => (
                <Link key={x} className={`chip ${f === x ? "on" : ""}`} href={href({ field: x, page: undefined })}>{x}</Link>
              ))}
            </div></div>
          </div>
          <p className="count">該当 <b>{hit.length}</b> 件</p>
          <ArticleList items={hit.slice((page - 1) * PER, page * PER)} />
          {pages > 1 && (
            <nav className="pager" aria-label="ページ送り">
              {Array.from({ length: pages }, (_, i) => i + 1).map((n) =>
                n === page ? <span key={n}>{n}</span> : <Link key={n} href={href({ page: String(n) })}>{n}</Link>,
              )}
            </nav>
          )}
        </div>
        <Sidebar regulations={regs} downloads={all.filter((a) => a.type?.includes("お役立ち資料")).slice(0, 3)} />
      </div>
      <ContactBand />
    </>
  );
}
