import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticle, getArticles, getRegulations } from "@/lib/microcms";
import { fmtDate, fmtEvent, isUpcoming } from "@/lib/format";
import { ArticleTags, StatusTag } from "@/components/Tags";
import { ArticleList } from "@/components/ArticleList";
import Sidebar from "@/components/Sidebar";
import { ContactBand } from "@/components/Footer";
import { SITE, typeByValue } from "@/lib/constants";

export const revalidate = 600;
type P = Promise<{ id: string }>;

export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ id: a.id }));
}

export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const a = await getArticle((await params).id);
  if (!a) return {};
  return {
    title: a.title,
    description: a.summary,
    openGraph: { title: a.title, description: a.summary, images: a.eyecatch ? [a.eyecatch.url] : undefined, type: "article" },
  };
}

export default async function ArticlePage({ params }: { params: P }) {
  const { id } = await params;
  const [a, all, regs] = await Promise.all([getArticle(id), getArticles(), getRegulations()]);
  if (!a) notFound();
  const t = typeByValue(a.type?.[0]);
  const isWatch = t?.slug === "watch";
  const relIds = new Set((a.regulations || []).map((r) => r.id));
  const related = all
    .filter((x) => x.id !== a.id && ((x.regulations || []).some((r) => relIds.has(r.id)) || x.regions?.some((r) => a.regions?.includes(r))))
    .slice(0, 4);

  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">ホーム</Link> ＞ <Link href={`/articles?type=${t?.slug ?? ""}`}>{t?.value ?? "記事"}</Link> ＞ 記事
          </div>
        </div>
      </section>
      <div className="wrap main">
        <article className="sheet">
          <header className="art-h">
            <ArticleTags a={a} link />
            <h1>{a.title}</h1>
            <div className="date">{fmtDate(a.date)}{a.updatedAt && a.publishedAt && a.updatedAt.slice(0, 10) !== a.publishedAt.slice(0, 10) ? `（更新：${fmtDate(a.updatedAt)}）` : ""}</div>
          </header>

          {a.eyecatch && (
            <Image src={a.eyecatch.url} alt="" width={a.eyecatch.width || 1200} height={a.eyecatch.height || 630} style={{ width: "100%", height: "auto", borderRadius: 6, marginBottom: 24 }} />
          )}

          {a.eventDate && (
            <div className="event">
              <dl>
                <dt>日時</dt><dd>{fmtEvent(a.eventDate, a.eventEndDate)}</dd>
                {a.eventPlace && (<><dt>会場</dt><dd>{a.eventPlace}</dd></>)}
              </dl>
              {isUpcoming(a.eventDate) ? (
                a.eventUrl && <a className="btn btn-accent" href={a.eventUrl}>参加を申し込む</a>
              ) : (
                <span className="badge-end">受付終了</span>
              )}
            </div>
          )}

          {isWatch ? (
            <>
              <p className="prose">{a.summary}</p>
              <div className="paywall">
                <strong>この記事の全文は、定期配信サービスでお届けしています。</strong>
                <p>自社に関係する改正だけを、影響度と対応事項つきでお届けします。</p>
                <a className="btn btn-primary" href={SITE.serviceUrl}>定期配信サービスを見る</a>
              </div>
            </>
          ) : (
            <div className="prose" dangerouslySetInnerHTML={{ __html: a.body || "" }} />
          )}

          {a.downloadUrl && (
            <p className="actions"><a className="btn btn-accent" href={a.downloadUrl}>資料をダウンロードする（無料）</a></p>
          )}
          {a.sourceUrl && (
            <p className="src">一次情報：<a href={a.sourceUrl} target="_blank" rel="noopener noreferrer">{a.sourceUrl}</a></p>
          )}

          {(a.regulations || []).length > 0 && (
            <section className="related">
              <div className="sec-h"><h2 data-en="REGULATIONS">関連する規制</h2></div>
              <div className="regs">
                {a.regulations!.map((r) => (
                  <Link key={r.id} href={`/regulations/${r.id}`} className="reg">
                    <div className="meta"><span className="tag">{r.region?.[0]}</span>{r.field?.[0]}</div>
                    <strong>{r.name}</strong>
                    <div className="meta"><StatusTag value={r.status?.[0]} />{r.statusNote}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {related.length > 0 && (
            <section className="related">
              <div className="sec-h"><h2 data-en="RELATED">関連する記事</h2></div>
              <ArticleList items={related} />
            </section>
          )}
        </article>
        <Sidebar regulations={regs} downloads={all.filter((x) => x.type?.includes("お役立ち資料") && x.id !== a.id).slice(0, 3)} />
      </div>
      <ContactBand />
    </>
  );
}
