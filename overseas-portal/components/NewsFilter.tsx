"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ARTICLE_TYPES, FIELDS, REGIONS } from "@/lib/constants";
import type { Article } from "@/lib/types";
import { ArticleList } from "./ArticleList";

const PER = 8;

export default function NewsFilter({ items }: { items: Article[] }) {
  const [type, setType] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [field, setField] = useState<string>("");
  const hit = useMemo(
    () =>
      items.filter(
        (a) =>
          (!type || a.type?.includes(type)) &&
          (!region || a.regions?.includes(region)) &&
          (!field || a.fields?.includes(field)),
      ),
    [items, type, region, field],
  );
  const Row = ({ label, opts, val, set }: { label: string; opts: string[]; val: string; set: (v: string) => void }) => (
    <div className="frow">
      <b>{label}</b>
      <div className="chips">
        <button className="chip" aria-pressed={!val} onClick={() => set("")}>すべて</button>
        {opts.map((o) => (
          <button key={o} className="chip" aria-pressed={val === o} onClick={() => set(val === o ? "" : o)}>{o}</button>
        ))}
      </div>
    </div>
  );
  const usedRegions = REGIONS.map((r) => r.value as string).filter((r) => items.some((a) => a.regions?.includes(r)));
  return (
    <>
      <div className="filters">
        <Row label="種類" opts={ARTICLE_TYPES.map((t) => t.value)} val={type} set={setType} />
        <Row label="地域" opts={usedRegions} val={region} set={setRegion} />
        <Row label="分野" opts={[...FIELDS]} val={field} set={setField} />
      </div>
      <p className="count">該当 <b>{hit.length}</b> 件（全 {items.length} 件）</p>
      <ArticleList items={hit.slice(0, PER)} />
      {hit.length === 0 && (
        <p className="empty"><button className="chip" onClick={() => { setType(""); setRegion(""); setField(""); }}>条件をリセット</button></p>
      )}
      <p className="more"><Link href="/articles">記事一覧をすべて見る →</Link></p>
    </>
  );
}
