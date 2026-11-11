import { SITE } from "@/lib/constants";
const S = [
  ["SERVICE 01", "対象規制の特定", "製品・輸出先・自社の役割をもとに、対象規制と義務を整理します。"],
  ["SERVICE 02", "規制動向の定期配信", "改正・下位法令・ガイダンスを、影響度と対応事項つきでお届けします。"],
  ["SERVICE 03", "個別調査", "新製品・新しい輸出先・化学物質の適用判断を、都度レポートにします。"],
  ["SERVICE 04", "対応方針の整理・書類作成支援", "PPWRの適合宣言書・技術文書など、対応方針と書類づくりを支援します。"],
];
export default function ServiceBand() {
  return (
    <section className="svc">
      <div className="wrap">
        <div className="eyebrow">SERVICE</div>
        <h2>読むだけで終わらせない。自社への影響まで、まとめて代行します。</h2>
        <p>AIと専門スタッフで、日々変わる海外規制に迅速に対応。属人化しがちな法令対応のノウハウも、社内で共有しやすい形でお届けします。</p>
        <div className="svc-grid">
          {S.map(([k, t, d]) => (
            <div className="svc-c" key={k}><small>{k}</small><strong>{t}</strong><p>{d}</p></div>
          ))}
        </div>
        <p className="actions"><a className="btn btn-primary" href={SITE.serviceUrl}>サービス詳細を見る</a></p>
      </div>
    </section>
  );
}
