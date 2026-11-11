import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { Article } from "@/lib/types";
import { ArticleTags } from "./Tags";

export function ArticleList({ items }: { items: Article[] }) {
  if (!items.length) return <p className="empty">該当する記事はありません。</p>;
  return (
    <ul className="list">
      {items.map((a) => (
        <li className="item" key={a.id}>
          <Link className="row" href={`/articles/${a.id}`}>
            <time dateTime={a.date}>{fmtDate(a.date)}</time>
            <div>
              <ArticleTags a={a} />
              <h3>{a.title}</h3>
              {a.summary && <p>{a.summary}</p>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
