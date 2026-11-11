import Link from "next/link";
import { getArticles } from "@/lib/microcms";
import { fmtEvent, isUpcoming } from "@/lib/format";
import { ContactBand } from "@/components/Footer";

export const revalidate = 600;
export const metadata = { title: "ウェビナー・セミナー" };

export default async function SeminarsPage() {
  const all = (await getArticles()).filter((a) => a.type?.includes("ウェビナー・セミナー"));
  const up = all.filter((a) => isUpcoming(a.eventDate)).sort((a, b) => (a.eventDate! > b.eventDate! ? 1 : -1));
  const past = all.filter((a) => !isUpcoming(a.eventDate)).sort((a, b) => ((a.eventDate || "") < (b.eventDate || "") ? 1 : -1));
  const Card = ({ a, open }: { a: (typeof all)[number]; open: boolean }) => (
    <Link href={`/articles/${a.id}`} className="card">
      <div className="when">{open ? <span className="badge-open">受付中</span> : <span className="badge-end">終了</span>}{fmtEvent(a.eventDate, a.eventEndDate)}</div>
      <strong>{a.title}</strong>
      <p>{a.summary}</p>
    </Link>
  );
  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="crumbs"><Link href="/">ホーム</Link> ＞ ウェビナー・セミナー</div>
          <h1>ウェビナー・セミナー</h1>
          <p>海外規制の最新動向と実務対応を、専門スタッフが解説します。</p>
        </div>
      </section>
      <div className="wrap page">
        <section className="sec">
          <div className="sec-h"><h2 data-en="UPCOMING">開催予定</h2></div>
          {up.length ? <div className="cards">{up.map((a) => <Card key={a.id} a={a} open />)}</div> : <p className="empty">現在、受付中のウェビナーはありません。</p>}
        </section>
        {past.length > 0 && (
          <section className="sec">
            <div className="sec-h"><h2 data-en="ARCHIVE">過去の開催</h2></div>
            <div className="cards">{past.map((a) => <Card key={a.id} a={a} open={false} />)}</div>
          </section>
        )}
      </div>
      <ContactBand />
    </>
  );
}
