import Link from "next/link";
import Image from "next/image";
import { fmtDate } from "@/lib/format";
import type { Article } from "@/lib/types";
import { ArticleTags } from "./Tags";

export function ArticleList({ items }: { items: Article[] }) {
  if (!items.length) return <p className="empty">該当する記事はありません。</p>;
  return (
    <ul className="list">
      {items.map((a) => (
        <li className="item" key={a.id}>
          <Link className={`row${a.eyecatch ? " has-thumb" : ""}`} href={`/articles/${a.id}`}>
            <div className="txt">
              <div className="meta">
                <time dateTime={a.date}>{fmtDate(a.date)}</time>
                <ArticleTags a={a} />
              </div>
              <h3>{a.title}</h3>
              {a.summary && <p>{a.summary}</p>}
            </div>
            {a.eyecatch && (
              <Image className="thumb" src={a.eyecatch.url} alt="" width={a.eyecatch.width || 960} height={a.eyecatch.height || 600} sizes="160px" />
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
