import Link from "next/link";
import { regionByValue, typeByValue } from "@/lib/constants";
import type { Article } from "@/lib/types";

export function TypeTag({ value }: { value?: string }) {
  const t = typeByValue(value);
  if (!t) return null;
  return <span className="tag tag-type" data-t={t.slug}>{t.short}</span>;
}

export function ArticleTags({ a, link = false }: { a: Article; link?: boolean }) {
  const regions = a.regions || [];
  const fields = a.fields || [];
  return (
    <div className="tags">
      <TypeTag value={a.type?.[0]} />
      {regions.map((r) => {
        const code = regionByValue(r)?.code ?? r;
        return link ? (
          <Link key={r} className="tag" href={`/articles?region=${code.toLowerCase()}`}>{r}</Link>
        ) : (
          <span key={r} className="tag">{r}</span>
        );
      })}
      {fields.map((f) =>
        link ? (
          <Link key={f} className="tag tag-line" href={`/articles?field=${encodeURIComponent(f)}`}>{f}</Link>
        ) : (
          <span key={f} className="tag tag-line">{f}</span>
        ),
      )}
    </div>
  );
}

export function StatusTag({ value }: { value?: string }) {
  if (!value) return null;
  return <span className={`st st-${value}`}>{value}</span>;
}
