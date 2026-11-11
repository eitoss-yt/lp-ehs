import Link from "next/link";
import { getArticles, getRegulations } from "@/lib/microcms";
import { fmtDate, fmtEvent, isUpcoming } from "@/lib/format";
import { StatusTag } from "@/components/Tags";
import NewsFilter from "@/components/NewsFilter";
import Sidebar from "@/components/Sidebar";
import ServiceBand from "@/components/ServiceBand";
import { ContactBand } from "@/components/Footer";
import { SITE } from "@/lib/constants";

export const revalidate = 600;

export default async function Home() {
  const [articles, regs] = await Promise.all([getArticles(), getRegulations()]);
  const pickups = articles.filter((a) => a.isPickup).slice(0, 3);
  const featured = regs.filter((r) => r.isFeatured).slice(0, 4);
  const seminars = articles
    .filter((a) => a.type?.includes("ウェビナー・セミナー"))
    .sort((a, b) => ((a.eventDate || "") < (b.eventDate || "") ? 1 : -1));
  const upcoming = seminars.filter((s) => isUpcoming(s.eventDate)).reverse().slice(0, 2);
  const watch = articles.filter((a) => a.type?.includes("規制動向ウォッチ")).slice(0, 5);
  const news = articles.filter((a) => !a.type?.includes("規制動向ウォッチ"));
  const side = articles.filter((a) => a.type?.includes("お役立ち資料")).slice(0, 2).concat(upcoming.slice(0, 1));
  const label = (a: (typeof articles)[number]) =>
    a.type?.includes("ウェビナー・セミナー") ? "WEBINAR" : a.type?.includes("お役立ち資料") ? "無料公開中" : "PICKUP";

  return (
    <>
      <section className="band">
        <div className="wrap">
          <h1>海外法規制の新着情報・規制動向</h1>
          <p>{SITE.description}</p>
          <div className="pickups">
            {pickups.map((a) => (
              <Link key={a.id} href={`/articles/${a.id}`} className="pickup">
                <small>{label(a)}</small>
                <strong>{a.title}</strong>
                <span>{a.eventDate ? fmtEvent(a.eventDate) : fmtDate(a.date)}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="wrap main">
        <div>
          <section className="sec">
            <div className="sec-h"><h2 data-en="FEATURED">注目の規制</h2><Link href="/regulations">規制一覧 →</Link></div>
            <div className="regs">
              {featured.map((r) => (
                <Link key={r.id} href={`/regulations/${r.id}`} className="reg">
                  <div className="meta"><span className="tag">{r.region?.[0]}</span>{r.field?.[0]}</div>
                  <strong>{r.name}</strong>
                  <div className="meta"><StatusTag value={r.status?.[0]} />{r.statusNote}</div>
                </Link>
              ))}
            </div>
          </section>

          <section className="sec">
            <div className="sec-h"><h2 data-en="NEWS">新着情報</h2><Link href="/articles">一覧 →</Link></div>
            <NewsFilter items={news} />
          </section>

          {upcoming.length > 0 && (
            <section className="sec">
              <div className="sec-h"><h2 data-en="WEBINAR">ウェビナー・セミナー</h2><Link href="/seminars">すべて見る →</Link></div>
              <div className="cards">
                {upcoming.map((s) => (
                  <Link key={s.id} href={`/articles/${s.id}`} className="card">
                    <div className="when"><span className="badge-open">受付中</span>{fmtEvent(s.eventDate, s.eventEndDate)}</div>
                    <strong>{s.title}</strong>
                    <p>{s.eventPlace}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {watch.length > 0 && (
            <section className="sec">
              <div className="sec-h"><h2 data-en="WATCH">規制動向ウォッチ</h2><Link href="/articles?type=watch">一覧 →</Link></div>
              <p className="lead">定期配信サービスでお届けしている規制動向から、タイトルの一部をご紹介します。全文と自社への影響度は、ご契約企業さま向けに配信しています。</p>
              <div className="watch">
                <table>
                  <thead><tr><th>更新日</th><th>地域・分野</th><th>記事タイトル（全文は定期配信で）</th></tr></thead>
                  <tbody>
                    {watch.map((w) => (
                      <tr key={w.id}>
                        <td>{fmtDate(w.date)}</td>
                        <td>{[...(w.regions || []), ...(w.fields || [])].join("・")}</td>
                        <td><Link href={`/articles/${w.id}`}>{w.title}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="watch-cta">
                  <p><strong>自社に関係する改正だけを、影響度と対応事項つきで。</strong>製品・輸出先・自社の役割にあわせて対象規制を絞り込み、定期的にお届けします。</p>
                  <a className="btn btn-primary" href={SITE.serviceUrl}>定期配信サービスを見る</a>
                </div>
              </div>
            </section>
          )}
        </div>
        <Sidebar regulations={regs} downloads={side} />
      </div>
      <ServiceBand />
      <ContactBand />
    </>
  );
}
