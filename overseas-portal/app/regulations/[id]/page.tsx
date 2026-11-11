import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getArticles, getRegulation, getRegulations } from "@/lib/microcms";
import { fmtDate } from "@/lib/format";
import { StatusTag } from "@/components/Tags";
import { ArticleList } from "@/components/ArticleList";
import { ContactBand } from "@/components/Footer";
import { REGIONS, SITE } from "@/lib/constants";

export const revalidate = 600;
type P = Promise<{ id: string }>;

export async function generateStaticParams() {
  return (await getRegulations()).map((r) => ({ id: r.id }));
}
export async function generateMetadata({ params }: { params: P }): Promise<Metadata> {
  const r = await getRegulation((await params).id);
  return r ? { title: r.name, description: r.overview } : {};
}

export default async function RegulationPage({ params }: { params: P }) {
  const { id } = await params;
  const [r, regs, articles] = await Promise.all([getRegulation(id), getRegulations(), getArticles()]);
  if (!r) notFound();
  const region = REGIONS.find((x) => x.value === r.region?.[0]);
  const related = articles.filter((a) => a.regulations?.some((x) => x.id === r.id));
  const templates = related.filter((a) => a.type?.includes("お役立ち資料"));
  const siblings = regs.filter((x) => x.region?.[0] === r.region?.[0]);
  const sections = [
    ["overview", "概要", !!r.overview],
    ["requirements", "主な要件", !!r.requirements],
    ["obligations", "誰に、何が求められるか", !!r.obligations],
    ["support", "当社がご支援できること", !!r.support],
    ["articles", "関連する記事", related.length > 0],
  ].filter((s) => s[2]) as [string, string, boolean][];

  return (
    <>
      <section className="band reg-hero">
        <div className="wrap">
          <div className="crumbs">
            <Link href="/">ホーム</Link> ＞ <Link href="/regulations">規制一覧</Link> ＞ {region?.value}（{region?.label}） ＞ {r.field?.[0]}
          </div>
          <div className="tags">
            <span className="tag">{r.region?.[0]}</span><span className="tag tag-line">{r.field?.[0]}</span><StatusTag value={r.status?.[0]} />
          </div>
          <h1>{r.name}</h1>
          <div className="sub">{r.nameEn}{r.officialName ? `｜${r.officialName}` : ""}</div>
          <div className="sub">最終更新：{fmtDate(r.updatedAt || r.publishedAt) || "未更新"}</div>
        </div>
      </section>
      <div className="wrap main">
        <div className="sheet prose">
          {r.overview && (<section id="overview"><h2>概要</h2><p>{r.overview}</p>{r.keyDates && <div dangerouslySetInnerHTML={{ __html: r.keyDates }} />}</section>)}
          {r.requirements && (<section id="requirements"><h2>主な要件</h2><div dangerouslySetInnerHTML={{ __html: r.requirements }} /></section>)}
          {r.obligations && (<section id="obligations"><h2>誰に、何が求められるか</h2><p>同じ製品でも、自社の役割によって求められる義務が変わります。</p><div dangerouslySetInnerHTML={{ __html: r.obligations }} /></section>)}
          {r.support && (
            <section id="support">
              <h2>当社がご支援できること</h2>
              <div dangerouslySetInnerHTML={{ __html: r.support }} />
              <p className="actions">
                <a className="btn btn-primary" href={SITE.contactUrl}>{(r.name.match(/（(.+)）/)?.[1] ?? r.name)}対応を相談する</a>
                {templates[0] && <Link className="btn btn-line" href={`/articles/${templates[0].id}`}>テンプレートをダウンロード</Link>}
              </p>
            </section>
          )}
          {related.length > 0 && (<section id="articles"><h2>関連する記事</h2><ArticleList items={related} /></section>)}
          <p className="note">※ 本ページは概要です。適用の有無と詳細は、製品と自社の役割によって異なります。</p>
        </div>
        <aside className="side">
          <div className="box toc">
            <h3>このページの目次</h3>
            <div className="box-b">{sections.map(([k, l]) => <a key={k} href={`#${k}`}>{l}</a>)}</div>
          </div>
          {templates.map((t) => (
            <div className="mail" key={t.id}>
              <h3>{t.title}</h3>
              <p>{t.summary}</p>
              <Link className="btn btn-accent" href={`/articles/${t.id}`}>無料ダウンロード</Link>
            </div>
          ))}
          <div className="box">
            <h3>{region?.value} の規制</h3>
            <div className="box-b"><ul>{siblings.map((s) => (<li key={s.id}>{s.id === r.id ? <b>{s.name}</b> : <Link href={`/regulations/${s.id}`}>{s.name}</Link>}</li>))}</ul></div>
          </div>
        </aside>
      </div>
      <ContactBand heading={`${r.name}への対応、まずは対象の確認から。`} />
    </>
  );
}
