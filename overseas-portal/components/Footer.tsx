import Link from "next/link";
import { SITE } from "@/lib/constants";

export function ContactBand({ heading = "輸出先の規制の洗い出しから、ご相談ください。" }: { heading?: string }) {
  return (
    <section className="contact">
      <div className="wrap">
        <div>
          <h2>{heading}</h2>
          <p>
            TEL：{SITE.tel}（{SITE.telHours}）／ メール：<a href={`mailto:${SITE.mail}`}>{SITE.mail}</a>（法人サポート）
          </p>
        </div>
        <div className="btns">
          <a className="btn btn-accent" href={SITE.contactUrl}>お問い合わせ</a>
          <Link className="btn btn-line" href="/articles?type=download">資料をダウンロード</Link>
        </div>
      </div>
    </section>
  );
}

export default function Footer() {
  return (
    <footer className="ft">
      <div className="wrap">
        <div className="ft-grid">
          <div>
            <b>eitoss</b>
            <p>本社：〒471-0031 愛知県豊田市小坂本町1-5-5 YAMATO BLDG2F<br />営業拠点：〒170-6012 東京都豊島区東池袋3-1-1 サンシャイン60 12F</p>
          </div>
          <div>
            <h4>コンテンツ</h4>
            <ul>
              <li><Link href="/">新着情報</Link></li>
              <li><Link href="/articles?type=update">法改正情報</Link></li>
              <li><Link href="/articles?type=column">解説コラム</Link></li>
              <li><Link href="/seminars">ウェビナー・セミナー</Link></li>
              <li><Link href="/articles?type=download">お役立ち資料</Link></li>
              <li><Link href="/regulations">規制一覧</Link></li>
            </ul>
          </div>
          <div>
            <h4>サービス</h4>
            <ul>
              <li><a href={SITE.serviceUrl}>Cayzen EHS Research</a></li>
              <li><a href={SITE.serviceUrl}>Cayzen EHS Research｜海外法規制</a></li>
            </ul>
          </div>
          <div>
            <h4>企業情報</h4>
            <ul>
              <li><a href="https://eitoss.com/">会社概要</a></li>
              <li><a href={SITE.contactUrl}>お問い合わせ</a></li>
              <li><a href="https://eitoss.com/privacy">プライバシーポリシー</a></li>
            </ul>
          </div>
        </div>
        <p className="copy">© Eitoss Inc. All rights reserved.</p>
      </div>
    </footer>
  );
}
