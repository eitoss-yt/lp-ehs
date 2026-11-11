import Link from "next/link";
import { REGIONS } from "@/lib/constants";
import type { Article, Regulation } from "@/lib/types";

export default function Sidebar({ regulations, downloads, children }: { regulations: Regulation[]; downloads: Article[]; children?: React.ReactNode }) {
  const groups = Array.from(new Set(REGIONS.map((r) => r.group)));
  return (
    <aside className="side">
      {children}
      <div className="box">
        <h3>地域から探す</h3>
        <div className="box-b">
          {groups.map((g) => (
            <div key={g}>
              <div className="grp">{g}</div>
              <ul>
                {REGIONS.filter((r) => r.group === g).map((r) => (
                  <li key={r.code}>
                    <Link href={`/articles?region=${r.code.toLowerCase()}`}><span className="code">{r.code}</span>{r.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="box">
        <h3>規制から探す</h3>
        <div className="box-b">
          <ul>
            {regulations.map((r) => (
              <li key={r.id}><Link href={`/regulations/${r.id}`}>{r.name}</Link></li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mail" id="mailmag">
        <h3>無料メールマガジン</h3>
        <p>海外規制の主な動きを、メールでお届けします。</p>
        {/* TODO: HubSpot等のフォームに差し替え */}
        <form action="https://eitoss.com/contact" method="get">
          <label className="sr" htmlFor="mm">メールアドレス</label>
          <input id="mm" type="email" placeholder="メールアドレス" required />
          <button className="btn btn-primary" type="submit">登録する（無料）</button>
        </form>
      </div>
      {downloads.length > 0 && (
        <div className="box">
          <h3>セミナー・資料</h3>
          <div className="box-b">
            {downloads.map((d) => (
              <Link key={d.id} className="dl" href={`/articles/${d.id}`}>
                <small>{d.type?.[0] === "ウェビナー・セミナー" ? "SEMINAR" : "DOWNLOAD"}</small>
                {d.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
