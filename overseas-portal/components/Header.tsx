"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import type { Regulation } from "@/lib/types";
import { REGIONS, SITE } from "@/lib/constants";

const NAV = [
  { href: "/articles?type=update", label: "法改正情報" },
  { href: "/articles?type=column", label: "解説コラム" },
  { href: "/seminars", label: "ウェビナー・セミナー" },
  { href: "/articles?type=download", label: "お役立ち資料" },
];

export default function Header({ regulations }: { regulations: Pick<Regulation, "id" | "name" | "region">[] }) {
  const pathname = usePathname();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);
  const groups = ["欧州", "米州", "アジア", "国際"];
  return (
    <header className="hd">
      <div className="wrap">
        <div className="hd-top">
          <Link href="/" className="logo">
            <b>eitoss</b>
            <span>Cayzen EHS Research</span>
            <em>海外法規制</em>
          </Link>
          <div className="hd-actions">
            <form className="search" action="/articles" role="search">
              <label className="sr" htmlFor="q">サイト内検索</label>
              <input id="q" name="q" placeholder="キーワードで検索" />
              <button type="submit">検索</button>
            </form>
            <Link className="btn btn-line btn-sm" href="/#mailmag">メルマガ登録</Link>
            <a className="btn btn-primary btn-sm" href={SITE.contactUrl}>お問合せ</a>
          </div>
        </div>
        <nav className="nav" aria-label="グローバル">
          <Link href="/" aria-current={pathname === "/" ? "page" : undefined}>新着情報</Link>
          <details ref={ref}>
            <summary>地域・規制から探す</summary>
            <div className="mega">
              <div className="wrap mega-in">
                <div>
                  <h4>注目の規制</h4>
                  <ul>
                    {regulations.map((r) => (
                      <li key={r.id}><Link href={`/regulations/${r.id}`}>{r.name}</Link></li>
                    ))}
                    <li><Link href="/regulations">規制一覧 →</Link></li>
                  </ul>
                </div>
                {groups.slice(0, 3).map((g) => (
                  <div key={g}>
                    <h4>{g}</h4>
                    <ul>
                      {REGIONS.filter((r) => r.group === g).map((r) => (
                        <li key={r.code}>
                          <Link href={`/articles?region=${r.code.toLowerCase()}`}>
                            <span className="code">{r.code}</span>{r.label}
                          </Link>
                        </li>
                      ))}
                      {g === "アジア" &&
                        REGIONS.filter((r) => r.group === "国際").map((r) => (
                          <li key={r.code}>
                            <Link href={`/articles?region=${r.code.toLowerCase()}`}>
                              <span className="code">{r.code}</span>{r.label}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </details>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>{n.label}</Link>
          ))}
          <a href={SITE.serviceUrl}>サービス</a>
        </nav>
      </div>
    </header>
  );
}
