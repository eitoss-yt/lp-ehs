import Link from "next/link";
import { getRegulations } from "@/lib/microcms";
import { REGIONS } from "@/lib/constants";
import { StatusTag } from "@/components/Tags";
import { ContactBand } from "@/components/Footer";

export const revalidate = 600;
export const metadata = { title: "規制一覧" };

export default async function RegulationsPage() {
  const regs = await getRegulations();
  const regions = REGIONS.filter((r) => regs.some((x) => x.region?.includes(r.value)));
  return (
    <>
      <section className="band">
        <div className="wrap">
          <div className="crumbs"><Link href="/">ホーム</Link> ＞ 規制一覧</div>
          <h1>規制一覧</h1>
          <p>主な海外規制の概要・適用スケジュール・求められる対応をまとめています。</p>
        </div>
      </section>
      <div className="wrap page">
        {regions.map((g) => (
          <section className="sec" key={g.code}>
            <div className="sec-h"><h2><span className="code">{g.code}</span>{g.label}</h2></div>
            <div className="regs">
              {regs.filter((r) => r.region?.includes(g.value)).map((r) => (
                <Link key={r.id} href={`/regulations/${r.id}`} className="reg">
                  <div className="meta">{r.field?.[0]}</div>
                  <strong>{r.name}</strong>
                  <div className="meta"><StatusTag value={r.status?.[0]} />{r.statusNote}</div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <ContactBand />
    </>
  );
}
