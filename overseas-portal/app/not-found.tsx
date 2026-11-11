import Link from "next/link";
export default function NotFound() {
  return (
    <div className="wrap" style={{ padding: "80px var(--gutter)", textAlign: "center" }}>
      <h1 style={{ color: "var(--navy)" }}>ページが見つかりません</h1>
      <p><Link href="/">トップページへ戻る</Link></p>
    </div>
  );
}
